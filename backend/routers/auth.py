from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from database import engine
from auth import hash_password, verify_password, create_access_token
from pydantic import BaseModel, EmailStr
from auth import get_current_user
from google.oauth2 import id_token
from google.auth.transport import requests

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
def register(data: RegisterRequest):
    try:
        print("DATA:", data)

        hashed = hash_password(data.password)
        print("HASH:", hashed)

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
def google_login(data: dict):
    token = data.get("token")

    # ✅ Verify token riêng — lỗi thật sự là token thì mới 400
    try:
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), GOOGLE_CLIENT_ID
        )
    except Exception as e:
        print("❌ Token invalid:", e)
        raise HTTPException(400, "Google token không hợp lệ")

    email = idinfo["email"]
    name = idinfo.get("name", "Google User")

    # ✅ Xử lý DB riêng — lỗi DB sẽ trả về 500, không bị che thành 400
    with engine.begin() as conn:
        user = conn.execute(
            text("SELECT * FROM users WHERE email = :email"),
            {"email": email}
        ).fetchone()

        if not user:
            # ✅ Dùng lastrowid thay vì RETURNING (tương thích MySQL)
            result = conn.execute(
                text("""
                    INSERT INTO users (full_name, email, password_hash, role, wallet, provider)
                    VALUES (:name, :email, '', 'USER', 0, 'google')
                """),
                {
                    "name": name,
                    "email": email
                }
            )
            user_id = result.lastrowid
        else:
            user_id = dict(user._mapping)["user_id"]

    # ✅ Tạo JWT và trả về
    access_token = create_access_token({
        "user_id": user_id,
        "email": email
    })

    return {"access_token": access_token}