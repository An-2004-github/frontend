from fastapi import APIRouter, HTTPException
import requests
from sqlalchemy import text
from database import engine
from auth import create_access_token

router = APIRouter(prefix="/api/auth/google", tags=["auth"])


@router.post("/")
def login_google(token: str):
    # Verify token với Google
    response = requests.get(
        f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
    )

    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Token Google không hợp lệ")

    data = response.json()
    email = data.get("email")
    name = data.get("name")

    with engine.connect() as conn:

        user = conn.execute(
            text("SELECT * FROM users WHERE email = :email"),
            {"email": email}
        ).fetchone()

        # Nếu chưa có thì tạo user mới
        if not user:
            conn.execute(
                text("""
                INSERT INTO users (email, full_name, password_hash)
                VALUES (:email, :name, 'google_login')
                """),
                {"email": email, "name": name}
            )
            conn.commit()

            user = conn.execute(
                text("SELECT * FROM users WHERE email = :email"),
                {"email": email}
            ).fetchone()

        user = dict(user._mapping)

        token = create_access_token({
            "user_id": user["user_id"],
            "email": user["email"]
        })

        return {"access_token": token}