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
                VALUES (:user_id, NOW(), 'confirmed', :total_price, :total_price)
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