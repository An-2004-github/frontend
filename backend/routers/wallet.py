from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy import text
from database import engine
from auth import get_current_user
from pydantic import BaseModel
import re

router = APIRouter(prefix="/api/wallet", tags=["wallet"])

# ── Tạo bảng withdrawal_requests nếu chưa có ─────────────────────
with engine.begin() as _conn:
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS withdrawal_requests (
            wr_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            bank_name VARCHAR(100) NOT NULL,
            account_no VARCHAR(50) NOT NULL,
            account_name VARCHAR(100) NOT NULL,
            status ENUM('pending','completed','rejected') DEFAULT 'pending',
            admin_note VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    """))


class WithdrawRequest(BaseModel):
    amount: float
    bank_name: str
    account_no: str
    account_name: str

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


# ── Helper: parse nội dung chuyển khoản ─────────────────────────
def parse_transfer_content(content: str):
    """
    Trả về (user_id, booking_id, mod_id) từ nội dung chuyển khoản.
    - Nạp tiền ví:        "VIVU {user_id}"                   → (user_id, None, None)
    - Thanh toán booking: "VIVU {user_id} BOOKING {bid}"     → (user_id, bid, None)
    - Thanh toán đổi lịch: "VIVU {user_id} MOD {mod_id}"    → (user_id, None, mod_id)
    """
    try:
        content_upper = content.upper()
        booking_match = re.search(r'VIVU\s+(\d+)\s+BOOKING\s+(\d+)', content_upper)
        if booking_match:
            return int(booking_match.group(1)), int(booking_match.group(2)), None
        mod_match = re.search(r'VIVU\s+(\d+)\s+MOD\s+(\d+)', content_upper)
        if mod_match:
            return int(mod_match.group(1)), None, int(mod_match.group(2))
        user_match = re.search(r'VIVU\s+(\d+)', content_upper)
        if user_match:
            return int(user_match.group(1)), None, None
    except Exception:
        pass
    return None, None, None


# ── WEBHOOK từ Sepay ────────────────────────────────────────────
@router.post("/webhook")
async def sepay_webhook(request: Request):
    try:
        data = await request.json()
        print("📩 Sepay webhook:", data)

        # Chỉ xử lý giao dịch tiền VÀO
        if data.get("transferType") != "in":
            return {"success": True, "message": "Bỏ qua giao dịch ra"}

        amount        = float(data.get("transferAmount", 0))
        content       = data.get("content", "") or data.get("transferDescription", "")
        txn_ref       = data.get("referenceNumber") or data.get("id") or None
        bank_account  = data.get("accountNumber") or None

        if amount <= 0:
            return {"success": True, "message": "Số tiền không hợp lệ"}

        user_id, booking_id, mod_id = parse_transfer_content(content)

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

        # ── Thanh toán booking qua chuyển khoản ──
        if booking_id:
            with engine.begin() as conn:
                booking = conn.execute(
                    text("SELECT * FROM bookings WHERE booking_id = :bid AND user_id = :uid FOR UPDATE"),
                    {"bid": booking_id, "uid": user_id}
                ).fetchone()

                if not booking:
                    print(f"⚠️ Booking #{booking_id} không tồn tại hoặc không thuộc user {user_id}")
                    return {"success": True, "message": "Booking không tìm thấy"}

                booking_dict = dict(booking._mapping)
                if booking_dict["status"] != "pending":
                    print(f"⚠️ Booking #{booking_id} đã được xử lý (status={booking_dict['status']})")
                    return {"success": True, "message": "Booking đã xử lý"}

                conn.execute(
                    text("UPDATE bookings SET status = 'confirmed' WHERE booking_id = :bid"),
                    {"bid": booking_id}
                )
                conn.execute(
                    text("""
                        INSERT INTO wallet_transactions
                            (user_id, amount, type, description, status)
                        VALUES
                            (:uid, :amount, 'payment', :desc, 'success')
                    """),
                    {
                        "uid": user_id,
                        "amount": -amount,
                        "desc": f"Thanh toán đặt chỗ #{booking_id} qua chuyển khoản",
                    }
                )
                conn.execute(
                    text("""
                        INSERT INTO payment_transactions
                            (booking_id, user_id, method, amount, status, transaction_ref, bank_account, transfer_content)
                        VALUES
                            (:bid, :uid, 'qr_transfer', :amount, 'success', :ref, :bank, :content)
                    """),
                    {
                        "bid": booking_id,
                        "uid": user_id,
                        "amount": amount,
                        "ref": txn_ref,
                        "bank": bank_account,
                        "content": content,
                    }
                )
            print(f"✅ Xác nhận booking #{booking_id} cho user_id={user_id} ({amount:,.0f}₫)")
            return {"success": True, "message": f"Đã xác nhận booking #{booking_id}"}

        # ── Thanh toán thêm đổi lịch qua chuyển khoản ──
        if mod_id:
            with engine.begin() as conn:
                mod = conn.execute(
                    text("SELECT * FROM booking_modifications WHERE mod_id = :mid AND user_id = :uid AND status = 'pending'"),
                    {"mid": mod_id, "uid": user_id}
                ).fetchone()
                if not mod:
                    return {"success": True, "message": "Yêu cầu không tìm thấy hoặc đã xử lý"}
                mod_d = dict(mod._mapping)
                booking_id_mod = mod_d["booking_id"]

                # Áp dụng đổi lịch
                if mod_d["new_entity_id"]:
                    conn.execute(text("UPDATE booking_items SET entity_id = :eid WHERE booking_id = :bid"),
                                 {"eid": mod_d["new_entity_id"], "bid": booking_id_mod})
                if mod_d["new_check_in"]:
                    conn.execute(text("UPDATE booking_items SET check_in_date = :ci, check_out_date = :co WHERE booking_id = :bid"),
                                 {"ci": str(mod_d["new_check_in"]), "co": str(mod_d["new_check_out"]), "bid": booking_id_mod})
                conn.execute(text("UPDATE bookings SET total_price = :np, final_amount = :np WHERE booking_id = :bid"),
                             {"np": float(mod_d["new_price"]), "bid": booking_id_mod})

                # Ghi lịch sử ví
                conn.execute(text("""
                    INSERT INTO wallet_transactions (user_id, amount, type, description, status)
                    VALUES (:uid, :amt, 'payment', :desc, 'success')
                """), {"uid": user_id, "amt": -amount,
                       "desc": f"Thanh toán thêm đổi lịch #{booking_id_mod} qua chuyển khoản"})

                conn.execute(text("UPDATE booking_modifications SET status = 'approved' WHERE mod_id = :id"),
                             {"id": mod_id})

            print(f"✅ Đổi lịch mod#{mod_id} cho user_id={user_id} ({amount:,.0f}₫)")
            return {"success": True, "message": f"Đã xác nhận đổi lịch mod#{mod_id}"}

        # ── Nạp tiền vào ví ──
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


# ── Yêu cầu rút tiền ────────────────────────────────────────────
@router.post("/withdraw")
def request_withdrawal(body: WithdrawRequest, user_id: int = Depends(get_current_user)):
    if body.amount < 10000:
        raise HTTPException(400, "Số tiền rút tối thiểu là 10,000₫")
    with engine.begin() as conn:
        user = conn.execute(
            text("SELECT wallet FROM users WHERE user_id = :id"), {"id": user_id}
        ).fetchone()
        if not user:
            raise HTTPException(404, "Người dùng không tồn tại")
        if float(user.wallet) < body.amount:
            raise HTTPException(400, "Số dư không đủ để thực hiện rút tiền.")

        # Chỉ cho tạo 1 yêu cầu pending tại 1 thời điểm
        existing = conn.execute(
            text("SELECT wr_id FROM withdrawal_requests WHERE user_id = :uid AND status = 'pending'"),
            {"uid": user_id}
        ).fetchone()
        if existing:
            raise HTTPException(400, "Bạn đang có yêu cầu rút tiền đang chờ xử lý.")

        conn.execute(text("""
            INSERT INTO withdrawal_requests (user_id, amount, bank_name, account_no, account_name)
            VALUES (:uid, :amount, :bank_name, :account_no, :account_name)
        """), {
            "uid": user_id,
            "amount": body.amount,
            "bank_name": body.bank_name.strip(),
            "account_no": body.account_no.strip(),
            "account_name": body.account_name.strip(),
        })
    return {"success": True, "message": "Yêu cầu rút tiền đã được gửi thành công."}


# ── Lịch sử rút tiền của user ────────────────────────────────────
@router.get("/withdrawals")
def get_user_withdrawals(user_id: int = Depends(get_current_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT * FROM withdrawal_requests
            WHERE user_id = :uid ORDER BY created_at DESC LIMIT 20
        """), {"uid": user_id}).fetchall()
    return [dict(r._mapping) for r in rows]


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