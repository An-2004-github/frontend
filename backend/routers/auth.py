from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy import text
from database import engine
from auth import hash_password, verify_password, create_access_token, get_current_user
from pydantic import BaseModel, EmailStr
from google.oauth2 import id_token
from google.auth.transport import requests
from email_service import send_welcome_email, send_otp_email
import random, string
from datetime import datetime, timedelta

GOOGLE_CLIENT_ID = "432427620604-dk7u0doioej55b63neos8rhm2uu4oe0i.apps.googleusercontent.com"

# OTP store tạm — production nên dùng Redis
otp_store: dict = {}


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UpdateProfileRequest(BaseModel):
    full_name:     str | None = None
    phone:         str | None = None
    date_of_birth: str | None = None
    gender:        str | None = None
    address:       str | None = None
    new_email:     str | None = None  # đổi email → cần OTP

class VerifyOTPRequest(BaseModel):
    otp:  str
    type: str  # "email" | "phone"


router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── REGISTER ───────────────────────────────────────────────────
@router.post("/register")
async def register(data: RegisterRequest, background_tasks: BackgroundTasks):
    try:
        hashed = hash_password(data.password)
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO users (full_name, email, password_hash, role, wallet, provider)
                    VALUES (:name, :email, :password, 'USER', 0, 'local')
                """),
                {"name": data.name, "email": data.email, "password": hashed}
            )
        background_tasks.add_task(send_welcome_email, data.email, data.name)
        return {"message": "Đăng ký thành công"}
    except Exception as e:
        print("❌ ERROR:", e)
        raise HTTPException(500, str(e))


# ── LOGIN ──────────────────────────────────────────────────────
@router.post("/login")
def login(data: LoginRequest):
    with engine.connect() as conn:
        user = conn.execute(
            text("SELECT * FROM users WHERE email = :email"),
            {"email": data.email}
        ).fetchone()

        if not user:
            raise HTTPException(400, "Sai email hoặc mật khẩu")
        user = dict(user._mapping)

        if not verify_password(data.password, user["password_hash"]):
            raise HTTPException(400, "Sai email hoặc mật khẩu")

        token = create_access_token({"user_id": user["user_id"], "email": user["email"]})
        return {"access_token": token}


# ── GET ME ─────────────────────────────────────────────────────
@router.get("/me")
def get_me(user_id: int = Depends(get_current_user)):
    with engine.connect() as conn:
        user = conn.execute(
            text("""
                SELECT user_id, email, full_name, phone, wallet,
                       date_of_birth, gender, address, provider, role
                FROM users WHERE user_id = :id
            """),
            {"id": user_id}
        ).fetchone()

        if not user:
            raise HTTPException(404, "User không tồn tại")
        return dict(user._mapping)


# ── UPDATE PROFILE ─────────────────────────────────────────────
@router.put("/profile")
def update_profile(data: UpdateProfileRequest, user_id: int = Depends(get_current_user)):
    with engine.connect() as conn:
        user = conn.execute(
            text("SELECT * FROM users WHERE user_id = :id"),
            {"id": user_id}
        ).fetchone()
        if not user:
            raise HTTPException(404, "User không tồn tại")
        user = dict(user._mapping)

    # Kiểm tra email mới có bị trùng không
    if data.new_email and data.new_email != user["email"]:
        with engine.connect() as conn:
            existing = conn.execute(
                text("SELECT user_id FROM users WHERE email = :email AND user_id != :id"),
                {"email": data.new_email, "id": user_id}
            ).fetchone()
            if existing:
                raise HTTPException(400, "Email này đã được sử dụng")
        return {"require_otp": True, "type": "email", "new_value": data.new_email}

    # Kiểm tra phone mới có bị trùng không
    if data.phone and data.phone != user.get("phone"):
        with engine.connect() as conn:
            existing = conn.execute(
                text("SELECT user_id FROM users WHERE phone = :phone AND user_id != :id"),
                {"phone": data.phone, "id": user_id}
            ).fetchone()
            if existing:
                raise HTTPException(400, "Số điện thoại này đã được sử dụng")

    # Cập nhật thông thường
    fields = {}
    if data.full_name     is not None: fields["full_name"]     = data.full_name
    if data.date_of_birth is not None: fields["date_of_birth"] = data.date_of_birth
    if data.gender        is not None: fields["gender"]        = data.gender
    if data.address       is not None: fields["address"]       = data.address
    if data.phone         is not None: fields["phone"]         = data.phone

    if not fields:
        return {"message": "Không có thay đổi"}

    set_clause = ", ".join([f"{k} = :{k}" for k in fields])
    fields["id"] = user_id

    with engine.begin() as conn:
        conn.execute(text(f"UPDATE users SET {set_clause} WHERE user_id = :id"), fields)

    return {"message": "Cập nhật thông tin thành công"}


# ── SEND OTP ───────────────────────────────────────────────────
@router.post("/send-otp")
async def send_otp_endpoint(
    data: dict,
    background_tasks: BackgroundTasks,
    user_id: int = Depends(get_current_user)
):
    new_value = data.get("new_value", "")
    otp_type  = data.get("type", "email")

    otp     = "".join(random.choices(string.digits, k=6))
    expires = datetime.now() + timedelta(minutes=10)

    otp_store[f"{user_id}:{otp_type}"] = {
        "otp": otp, "expires": expires,
        "new_value": new_value, "user_id": user_id,
    }

    if otp_type == "email":
        background_tasks.add_task(send_otp_email, new_value, otp)

    print(f"📧 OTP [{user_id}:{otp_type}] = {otp}")
    return {"message": f"Đã gửi mã xác nhận tới {new_value}"}


# ── VERIFY OTP ─────────────────────────────────────────────────
@router.post("/verify-otp")
def verify_otp(data: VerifyOTPRequest, user_id: int = Depends(get_current_user)):
    store_key = f"{user_id}:{data.type}"
    record    = otp_store.get(store_key)

    if not record:
        raise HTTPException(400, "Mã xác nhận không hợp lệ")

    if datetime.now() > record["expires"]:
        del otp_store[store_key]
        raise HTTPException(400, "Mã xác nhận đã hết hạn")

    if record["otp"] != data.otp:
        raise HTTPException(400, "Mã xác nhận không hợp lệ")

    new_value = record["new_value"]
    del otp_store[store_key]

    with engine.begin() as conn:
        if data.type == "email":
            conn.execute(
                text("UPDATE users SET email = :val WHERE user_id = :id"),
                {"val": new_value, "id": user_id}
            )
        elif data.type == "phone":
            conn.execute(
                text("UPDATE users SET phone = :val WHERE user_id = :id"),
                {"val": new_value, "id": user_id}
            )

    return {"message": "Cập nhật thông tin thành công"}


# ── GOOGLE LOGIN ───────────────────────────────────────────────
@router.post("/google")
async def google_login(data: dict, background_tasks: BackgroundTasks):
    token = data.get("token")
    try:
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
    except Exception as e:
        print("❌ Token invalid:", e)
        raise HTTPException(400, "Google token không hợp lệ")

    email = idinfo["email"]
    name  = idinfo.get("name", "Google User")
    is_new_user = False

    with engine.begin() as conn:
        user = conn.execute(
            text("SELECT * FROM users WHERE email = :email"),
            {"email": email}
        ).fetchone()

        if not user:
            result = conn.execute(
                text("""
                    INSERT INTO users (full_name, email, password_hash, role, wallet, provider)
                    VALUES (:name, :email, '', 'USER', 0, 'google')
                """),
                {"name": name, "email": email}
            )
            user_id = result.lastrowid
            is_new_user = True
        else:
            user_id = dict(user._mapping)["user_id"]

    if is_new_user:
        background_tasks.add_task(send_welcome_email, email, name)

    access_token = create_access_token({"user_id": user_id, "email": email})
    return {"access_token": access_token}