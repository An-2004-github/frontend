from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy import text
from database import engine
from auth import get_current_user
import hmac
import hashlib

router = APIRouter(prefix="/api/wallet", tags=["wallet"])

# ================================================================
# Lấy từ Sepay dashboard → Settings → API Key
# ================================================================
SEPAY_WEBHOOK_SECRET = "your_sepay_webhook_secret"  # ← thay bằng secret thật


# ── Helper: cập nhật số dư ──────────────────────────────────────
def update_wallet(user_id: int, amount: float):
    with engine.begin() as conn:
        conn.execute(
            text("""
                UPDATE users
                SET wallet = wallet + :amount
                WHERE user_id = :user_id
            """),
            {"amount": amount, "user_id": user_id}
        )

        # Ghi lịch sử nạp tiền
        conn.execute(
            text("""
                INSERT INTO wallet_transactions
                    (user_id, amount, type, description, status)
                VALUES
                    (:user_id, :amount, 'deposit', 'Nạp tiền qua chuyển khoản', 'success')
            """),
            {"user_id": user_id, "amount": amount}
        )


# ── Helper: tìm user_id từ nội dung chuyển khoản ───────────────
def extract_user_id(content: str) -> int | None:
    """
    Tìm user_id từ nội dung chuyển khoản
    VD: "MB 0944934501 VIVU 4- Ma GD..." → return 4
    """
    import re
    try:
        content_upper = content.upper()
        # Tìm pattern "VIVU" theo sau là số (bỏ qua dấu - và ký tự khác)
        match = re.search(r'VIVU\s+(\d+)', content_upper)
        if match:
            return int(match.group(1))
    except Exception:
        pass
    return None


# ── WEBHOOK từ Sepay ────────────────────────────────────────────
@router.post("/webhook")
async def sepay_webhook(request: Request):
    try:
        data = await request.json()
        print("📩 Sepay webhook:", data)

        # Chỉ xử lý giao dịch tiền VÀO
        if data.get("transferType") != "in":
            return {"success": True, "message": "Bỏ qua giao dịch ra"}

        amount         = float(data.get("transferAmount", 0))
        content        = data.get("content", "") or data.get("transferDescription", "")
        transaction_id = data.get("id", "")

        if amount <= 0:
            return {"success": True, "message": "Số tiền không hợp lệ"}

        # Tìm user từ nội dung chuyển khoản
        user_id = extract_user_id(content)

        if not user_id:
            print(f"⚠️ Không tìm thấy user trong nội dung: {content}")
            return {"success": True, "message": "Không xác định được user"}

        # Kiểm tra user tồn tại
        with engine.connect() as conn:
            user = conn.execute(
                text("SELECT user_id FROM users WHERE user_id = :id"),
                {"id": user_id}
            ).fetchone()

            if not user:
                return {"success": True, "message": "User không tồn tại"}

        # Cập nhật wallet
        update_wallet(user_id, amount)
        print(f"✅ Nạp {amount:,.0f}₫ cho user_id={user_id}")

        return {"success": True}

    except Exception as e:
        print(f"❌ Webhook error: {e}")
        return {"success": False, "error": str(e)}


# ── Lấy số dư hiện tại ─────────────────────────────────────────
@router.get("/balance")
def get_balance(user_id: int = Depends(get_current_user)):
    with engine.connect() as conn:
        user = conn.execute(
            text("SELECT wallet FROM users WHERE user_id = :id"),
            {"id": user_id}
        ).fetchone()

        if not user:
            raise HTTPException(404, "User không tồn tại")

        return {"balance": float(user.wallet)}


# ── Lịch sử giao dịch ──────────────────────────────────────────
@router.get("/transactions")
def get_transactions(user_id: int = Depends(get_current_user)):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT * FROM wallet_transactions
                WHERE user_id = :id
                ORDER BY created_at DESC
                LIMIT 50
            """),
            {"id": user_id}
        ).fetchall()

        return [dict(row._mapping) for row in result]


# ── Lấy thông tin QR nạp tiền ──────────────────────────────────
@router.get("/deposit-info")
def get_deposit_info(user_id: int = Depends(get_current_user)):
    """
    Trả về thông tin để frontend tạo QR VietQR
    """
    # Thay bằng thông tin tài khoản ngân hàng thật của bạn
    BANK_ID      = "MB"           # ← mã ngân hàng (MB, VCB, TCB...)
    ACCOUNT_NO   = "0944934501"   # ← số tài khoản
    ACCOUNT_NAME = "LE HOANG AN"   # ← tên chủ tài khoản

    transfer_content = f"VIVU {user_id}"

    # QR VietQR format
    qr_url = (
        f"https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-compact2.png"
        f"?amount=0"
        f"&addInfo={transfer_content}"
        f"&accountName={ACCOUNT_NAME}"
    )

    return {
        "bank_id":          BANK_ID,
        "account_no":       ACCOUNT_NO,
        "account_name":     ACCOUNT_NAME,
        "transfer_content": transfer_content,
        "qr_url":           qr_url,
        "note":             f"Nhập đúng nội dung: {transfer_content}",
    }