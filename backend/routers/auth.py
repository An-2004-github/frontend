from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy import text
from database import engine
from auth import hash_password, verify_password, create_access_token, get_current_user
from pydantic import BaseModel, EmailStr
from google.oauth2 import id_token
from google.auth.transport import requests
from email_service import send_welcome_email, send_otp_email, send_reset_password_email
from rank_utils import get_rank, get_cashback_rate, RANK_LABELS, RANK_THRESHOLDS
import random, string
from datetime import datetime, timedelta

GOOGLE_CLIENT_ID = "600520983957-j74rtlmpkj0ia8ifv19uihnn0h8la03o.apps.googleusercontent.com"

# OTP store tạm — production nên dùng Redis
otp_store: dict = {}


class GuestLoginRequest(BaseModel):
    email: EmailStr
    full_name: str
    phone: str

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

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── GUEST LOGIN ────────────────────────────────────────────────
@router.post("/guest")
def guest_login(data: GuestLoginRequest):
    with engine.begin() as conn:
        user = conn.execute(
            text("SELECT user_id, provider FROM users WHERE email = :email"),
            {"email": data.email}
        ).fetchone()

        if user:
            user_dict = dict(user._mapping)
            if user_dict["provider"] != "guest":
                raise HTTPException(400, "Email này đã có tài khoản, vui lòng đăng nhập để đặt chỗ")
            # Cập nhật thông tin guest nếu đã tồn tại
            conn.execute(
                text("UPDATE users SET full_name = :name, phone = :phone WHERE user_id = :id"),
                {"name": data.full_name, "phone": data.phone, "id": user_dict["user_id"]}
            )
            user_id = user_dict["user_id"]
        else:
            # Tạo tài khoản guest mới
            result = conn.execute(
                text("""
                    INSERT INTO users (full_name, email, phone, password_hash, role, wallet, provider)
                    VALUES (:name, :email, :phone, '', 'USER', 0, 'guest')
                """),
                {"name": data.full_name, "email": data.email, "phone": data.phone}
            )
            user_id = result.lastrowid

    token = create_access_token({"user_id": user_id, "email": data.email})
    return {"access_token": token}


# ── REGISTER ───────────────────────────────────────────────────
@router.post("/register")
async def register(data: RegisterRequest, background_tasks: BackgroundTasks):
    try:
        hashed = hash_password(data.password)
        with engine.begin() as conn:
            existing = conn.execute(
                text("SELECT user_id, provider FROM users WHERE email = :email"),
                {"email": data.email}
            ).fetchone()

            if existing:
                existing = dict(existing._mapping)
                if existing["provider"] == "guest":
                    # Nâng cấp tài khoản guest → local
                    conn.execute(
                        text("""
                            UPDATE users
                            SET full_name = :name, password_hash = :password, provider = 'local'
                            WHERE user_id = :id
                        """),
                        {"name": data.name, "password": hashed, "id": existing["user_id"]}
                    )
                    background_tasks.add_task(send_welcome_email, data.email, data.name)
                    return {"message": "Đăng ký thành công"}
                else:
                    raise HTTPException(400, "Email này đã được sử dụng")

            conn.execute(
                text("""
                    INSERT INTO users (full_name, email, password_hash, role, wallet, provider)
                    VALUES (:name, :email, :password, 'USER', 0, 'local')
                """),
                {"name": data.name, "email": data.email, "password": hashed}
            )
        background_tasks.add_task(send_welcome_email, data.email, data.name)
        return {"message": "Đăng ký thành công"}
    except HTTPException:
        raise
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

        # Tài khoản đăng ký qua Google không có mật khẩu
        if user.get("provider") == "google" and not user.get("password_hash"):
            raise HTTPException(400, "Tài khoản này đăng nhập bằng Google. Vui lòng dùng nút 'Đăng nhập với Google'")

        if not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
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
                       date_of_birth, gender, address, provider, role,
                       COALESCE(user_rank, 'bronze') AS user_rank
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


# ── CHANGE PASSWORD ────────────────────────────────────────────
@router.put("/change-password")
def change_password(data: ChangePasswordRequest, user_id: int = Depends(get_current_user)):
    with engine.connect() as conn:
        user = conn.execute(
            text("SELECT password_hash, provider FROM users WHERE user_id = :id"),
            {"id": user_id}
        ).fetchone()
        if not user:
            raise HTTPException(404, "Người dùng không tồn tại")
        user = dict(user._mapping)

    if user["provider"] != "local":
        raise HTTPException(400, "Tài khoản Google không thể đổi mật khẩu tại đây")

    if not verify_password(data.current_password, user["password_hash"]):
        raise HTTPException(400, "Mật khẩu hiện tại không đúng")

    if len(data.new_password) < 6:
        raise HTTPException(400, "Mật khẩu mới phải có ít nhất 6 ký tự")

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE users SET password_hash = :hash WHERE user_id = :id"),
            {"hash": hash_password(data.new_password), "id": user_id}
        )
    return {"message": "Đổi mật khẩu thành công"}


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
@router.get("/rank")
def get_my_rank(user_id: int = Depends(get_current_user)):
    with engine.connect() as conn:
        total_spent = conn.execute(
            text("SELECT COALESCE(SUM(final_amount), 0) FROM bookings WHERE user_id = :uid AND status = 'confirmed'"),
            {"uid": user_id}
        ).scalar()
        total_spent = float(total_spent)
        rank = get_rank(total_spent)

        # Tìm ngưỡng rank tiếp theo
        next_rank = None
        next_threshold = None
        for i, (r, _) in enumerate(RANK_THRESHOLDS):
            if r == rank and i + 1 < len(RANK_THRESHOLDS):
                next_rank = RANK_THRESHOLDS[i + 1][0]
                next_threshold = RANK_THRESHOLDS[i + 1][1]
                break

        return {
            "rank": rank,
            "rank_label": RANK_LABELS[rank],
            "total_spent": total_spent,
            "cashback_rate": get_cashback_rate(rank),
            "next_rank": next_rank,
            "next_rank_label": RANK_LABELS[next_rank] if next_rank else None,
            "next_threshold": next_threshold,
            "progress_pct": round(min(total_spent / next_threshold * 100, 100), 1) if next_threshold else 100,
        }


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    with engine.connect() as conn:
        user = conn.execute(
            text("SELECT user_id, full_name, provider FROM users WHERE email = :email"),
            {"email": data.email}
        ).fetchone()

    if not user:
        raise HTTPException(404, "Email này chưa được đăng ký tài khoản")

    user_d = dict(user._mapping)
    if user_d["provider"] != "local":
        raise HTTPException(400, "Tài khoản này đăng nhập bằng Google, không thể đặt lại mật khẩu")

    otp = "".join(random.choices(string.digits, k=6))
    expires = datetime.now() + timedelta(minutes=10)
    otp_store[f"reset:{data.email}"] = {"otp": otp, "expires": expires}

    background_tasks.add_task(
        send_reset_password_email,
        email=data.email,
        name=user_d["full_name"] or "Quý khách",
        otp=otp,
    )
    print(f"🔑 Reset OTP [{data.email}] = {otp}")
    return {"message": "Mã OTP đã được gửi tới email của bạn"}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest):
    store_key = f"reset:{data.email}"
    record = otp_store.get(store_key)

    if not record:
        raise HTTPException(400, "Mã OTP không hợp lệ hoặc đã hết hạn")

    if datetime.now() > record["expires"]:
        del otp_store[store_key]
        raise HTTPException(400, "Mã OTP đã hết hạn, vui lòng yêu cầu lại")

    if record["otp"] != data.otp:
        raise HTTPException(400, "Mã OTP không đúng")

    if len(data.new_password) < 6:
        raise HTTPException(400, "Mật khẩu mới phải có ít nhất 6 ký tự")

    del otp_store[store_key]

    with engine.begin() as conn:
        user = conn.execute(
            text("SELECT user_id FROM users WHERE email = :email AND provider = 'local'"),
            {"email": data.email}
        ).fetchone()
        if not user:
            raise HTTPException(404, "Tài khoản không tồn tại")
        conn.execute(
            text("UPDATE users SET password_hash = :hash WHERE user_id = :id"),
            {"hash": hash_password(data.new_password), "id": dict(user._mapping)["user_id"]}
        )

    return {"message": "Đặt lại mật khẩu thành công"}


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