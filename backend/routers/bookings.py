from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from database import engine
from auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


class BookingRequest(BaseModel):
    entity_type:    str
    entity_id:      int
    check_in_date:  str | None = None
    check_out_date: str | None = None
    guests:         int = 1
    total_price:    float


# Lấy danh sách booking của user
@router.get("/my")
def get_my_bookings(user_id: int = Depends(get_current_user)):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT
                    b.*,
                    bi.entity_type,
                    bi.entity_id,
                    bi.price AS item_price,
                    bi.check_in_date,
                    bi.check_out_date,

                    -- Tên entity
                    CASE bi.entity_type
                        WHEN 'room'   THEN CONCAT(h.name, ' - ', rt.name)
                        WHEN 'flight' THEN CONCAT(f.airline, ': ', f.from_city, ' → ', f.to_city)
                        WHEN 'bus'    THEN CONCAT(bs.company, ': ', bs.from_city, ' → ', bs.to_city)
                        ELSE CONCAT(bi.entity_type, ' #', bi.entity_id)
                    END AS entity_name

                FROM bookings b
                JOIN booking_items bi ON bi.booking_id = b.booking_id
                LEFT JOIN room_types rt ON rt.room_type_id = bi.entity_id AND bi.entity_type = 'room'
                LEFT JOIN hotels h ON h.hotel_id = rt.hotel_id
                LEFT JOIN flights f ON f.flight_id = bi.entity_id AND bi.entity_type = 'flight'
                LEFT JOIN buses bs ON bs.bus_id = bi.entity_id AND bi.entity_type = 'bus'

                WHERE b.user_id = :user_id
                ORDER BY b.booking_date DESC
            """),
            {"user_id": user_id}
        ).fetchall()

        return [dict(row._mapping) for row in result]


# Tạo booking mới
@router.post("/")
def create_booking(data: BookingRequest, user_id: int = Depends(get_current_user)):
    with engine.begin() as conn:
        # Tạo booking
        result = conn.execute(
            text("""
                INSERT INTO bookings (user_id, booking_date, status, total_price, final_amount)
                VALUES (:user_id, NOW(), 'pending', :total_price, :total_price)
            """),
            {"user_id": user_id, "total_price": data.total_price}
        )
        booking_id = result.lastrowid

        # Tạo booking item
        conn.execute(
            text("""
                INSERT INTO booking_items
                    (booking_id, entity_type, entity_id, quantity, price, check_in_date, check_out_date)
                VALUES
                    (:booking_id, :entity_type, :entity_id, :guests, :price, :check_in, :check_out)
            """),
            {
                "booking_id":  booking_id,
                "entity_type": data.entity_type,
                "entity_id":   data.entity_id,
                "guests":      data.guests,
                "price":       data.total_price,
                "check_in":    data.check_in_date,
                "check_out":   data.check_out_date,
            }
        )

    return {"booking_id": booking_id, "message": "Đặt chỗ thành công"}


# Thanh toán bằng ví
@router.post("/{booking_id}/pay-wallet")
def pay_with_wallet(booking_id: int, user_id: int = Depends(get_current_user)):
    with engine.begin() as conn:
        # Lấy thông tin booking
        booking = conn.execute(
            text("SELECT * FROM bookings WHERE booking_id = :id AND user_id = :uid"),
            {"id": booking_id, "uid": user_id}
        ).fetchone()

        if not booking:
            raise HTTPException(404, "Booking không tồn tại")

        booking_dict = dict(booking._mapping)
        if booking_dict["status"] != "pending":
            raise HTTPException(400, "Booking này không thể thanh toán")

        amount = float(booking_dict["final_amount"])

        # Lấy số dư ví từ bảng users
        user_row = conn.execute(
            text("SELECT wallet FROM users WHERE user_id = :uid"),
            {"uid": user_id}
        ).fetchone()

        if not user_row:
            raise HTTPException(404, "Người dùng không tồn tại")

        balance = float(user_row.wallet or 0)

        if balance < amount:
            raise HTTPException(400, f"Số dư ví không đủ. Cần {amount:,.0f}₫, hiện có {balance:,.0f}₫")

        # Trừ tiền ví
        conn.execute(
            text("UPDATE users SET wallet = wallet - :amount WHERE user_id = :uid"),
            {"amount": amount, "uid": user_id}
        )

        # Cập nhật trạng thái booking
        conn.execute(
            text("UPDATE bookings SET status = 'confirmed' WHERE booking_id = :id"),
            {"id": booking_id}
        )

        # Ghi lịch sử giao dịch ví
        conn.execute(
            text("""
                INSERT INTO wallet_transactions (user_id, amount, type, description, status)
                VALUES (:uid, :amount, 'payment', :desc, 'success')
            """),
            {
                "uid": user_id,
                "amount": -amount,
                "desc": f"Thanh toán đặt chỗ #{booking_id}",
            }
        )

        new_balance = balance - amount
        return {"message": "Thanh toán thành công", "new_balance": new_balance}


# Thanh toán kết hợp ví + chuyển khoản
class PayCombinedRequest(BaseModel):
    wallet_amount: float = 0


@router.post("/{booking_id}/pay-combined")
def pay_combined(booking_id: int, data: PayCombinedRequest, user_id: int = Depends(get_current_user)):
    with engine.begin() as conn:
        booking = conn.execute(
            text("SELECT * FROM bookings WHERE booking_id = :id AND user_id = :uid"),
            {"id": booking_id, "uid": user_id}
        ).fetchone()

        if not booking:
            raise HTTPException(404, "Booking không tồn tại")

        booking_dict = dict(booking._mapping)
        if booking_dict["status"] != "pending":
            raise HTTPException(400, "Booking này không thể thanh toán")

        wallet_amount = float(data.wallet_amount)

        if wallet_amount > 0:
            user_row = conn.execute(
                text("SELECT wallet FROM users WHERE user_id = :uid"),
                {"uid": user_id}
            ).fetchone()

            balance = float(user_row.wallet or 0)
            if balance < wallet_amount:
                raise HTTPException(400, f"Số dư ví không đủ. Cần {wallet_amount:,.0f}₫, hiện có {balance:,.0f}₫")

            conn.execute(
                text("UPDATE users SET wallet = wallet - :amount WHERE user_id = :uid"),
                {"amount": wallet_amount, "uid": user_id}
            )

            conn.execute(
                text("""
                    INSERT INTO wallet_transactions (user_id, amount, type, description, status)
                    VALUES (:uid, :amount, 'payment', :desc, 'success')
                """),
                {"uid": user_id, "amount": -wallet_amount, "desc": f"Thanh toán một phần đặt chỗ #{booking_id}"}
            )

        conn.execute(
            text("UPDATE bookings SET status = 'confirmed' WHERE booking_id = :id"),
            {"id": booking_id}
        )

        return {"message": "Thanh toán thành công"}


# Chi tiết 1 booking
@router.get("/{booking_id}")
def get_booking(booking_id: int, user_id: int = Depends(get_current_user)):
    with engine.connect() as conn:
        booking = conn.execute(
            text("SELECT * FROM bookings WHERE booking_id = :id AND user_id = :uid"),
            {"id": booking_id, "uid": user_id}
        ).fetchone()

        if not booking:
            raise HTTPException(404, "Booking không tồn tại")

        items = conn.execute(
            text("SELECT * FROM booking_items WHERE booking_id = :id"),
            {"id": booking_id}
        ).fetchall()

        result = dict(booking._mapping)
        result["items"] = [dict(i._mapping) for i in items]
        return result