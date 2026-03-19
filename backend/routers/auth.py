from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy import text
from database import engine
from auth import hash_password, verify_password, create_access_token
from pydantic import BaseModel, EmailStr
from auth import get_current_user
from google.oauth2 import id_token
from google.auth.transport import requests
from email_service import send_welcome_email

GOOGLE_CLIENT_ID = "432427620604-dk7u0doioej55b63neos8rhm2uu4oe0i.apps.googleusercontent.com"

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

router = APIRouter(prefix="/api/auth", tags=["auth"])


# REGISTER
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
                {
                    "name": data.name,
                    "email": data.email,
                    "password": hashed
                }
            )

        # ✅ Gửi email nền — không block response trả về client
        background_tasks.add_task(send_welcome_email, data.email, data.name)

        return {"message": "Đăng ký thành công"}

    except Exception as e:
        print("❌ ERROR:", e)
        raise HTTPException(500, str(e))


# LOGIN
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

        token = create_access_token({
            "user_id": user["user_id"],
            "email": user["email"]
        })

        return {"access_token": token}


# GET ME
@router.get("/me")
def get_me(user_id: int = Depends(get_current_user)):
    with engine.connect() as conn:
        user = conn.execute(
            text("""
                SELECT user_id, email, full_name, wallet
                FROM users
                WHERE user_id = :id
            """),
            {"id": user_id}
        ).fetchone()

        if not user:
            raise HTTPException(404, "User không tồn tại")

        return dict(user._mapping)


# GOOGLE LOGIN
@router.post("/google")
async def google_login(data: dict, background_tasks: BackgroundTasks):
    token = data.get("token")

    try:
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), GOOGLE_CLIENT_ID
        )
    except Exception as e:
        print("❌ Token invalid:", e)
        raise HTTPException(400, "Google token không hợp lệ")

    email = idinfo["email"]
    name = idinfo.get("name", "Google User")
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

    # ✅ Chỉ gửi email nếu là tài khoản mới
    if is_new_user:
        background_tasks.add_task(send_welcome_email, email, name)

    access_token = create_access_token({
        "user_id": user_id,
        "email": email
    })

    return {"access_token": access_token}