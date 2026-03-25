from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy import text
from database import engine
from auth import get_current_user
from pydantic import BaseModel
from email_service import send_booking_confirmation_email
from datetime import date as ddate

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

# ── Auto-create booking_modifications table ─────────────────────
with engine.begin() as _conn:
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS booking_modifications (
            mod_id      INT AUTO_INCREMENT PRIMARY KEY,
            booking_id  INT NOT NULL,
            user_id     INT NOT NULL,
            type        ENUM('reschedule','cancel') NOT NULL,
            status      ENUM('pending','approved','rejected') DEFAULT 'pending',
            new_entity_id INT,
            new_check_in  DATE,
            new_check_out DATE,
            old_price     DECIMAL(12,2),
            new_price     DECIMAL(12,2),
            price_diff    DECIMAL(12,2) DEFAULT 0,
            cancel_fee    DECIMAL(12,2) DEFAULT 0,
            refund_amount DECIMAL(12,2) DEFAULT 0,
            refund_method ENUM('wallet','bank') DEFAULT 'wallet',
            bank_info     TEXT,
            admin_note    TEXT,
            created_at    DATETIME DEFAULT NOW()
        )
    """))


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


def _get_booking_email_info(conn, booking_id: int, user_id: int):
    """Lấy thông tin cần thiết để gửi email xác nhận."""
    row = conn.execute(text("""
        SELECT
            u.email, u.full_name,
            b.final_amount, b.booking_date,
            bi.entity_type, bi.check_in_date, bi.check_out_date,
            CASE bi.entity_type
                WHEN 'room'   THEN CONCAT(h.name, ' - ', rt.name)
                WHEN 'flight' THEN CONCAT(f.airline, ': ', f.from_city, ' → ', f.to_city)
                WHEN 'bus'    THEN CONCAT(bs.company, ': ', bs.from_city, ' → ', bs.to_city)
                ELSE CONCAT(bi.entity_type, ' #', bi.entity_id)
            END AS service_name
        FROM bookings b
        JOIN users u ON u.user_id = b.user_id
        JOIN booking_items bi ON bi.booking_id = b.booking_id
        LEFT JOIN room_types rt ON rt.room_type_id = bi.entity_id AND bi.entity_type = 'room'
        LEFT JOIN hotels h ON h.hotel_id = rt.hotel_id
        LEFT JOIN flights f ON f.flight_id = bi.entity_id AND bi.entity_type = 'flight'
        LEFT JOIN buses bs ON bs.bus_id = bi.entity_id AND bi.entity_type = 'bus'
        WHERE b.booking_id = :bid AND b.user_id = :uid
        LIMIT 1
    """), {"bid": booking_id, "uid": user_id}).fetchone()
    return dict(row._mapping) if row else None


# Thanh toán bằng ví
@router.post("/{booking_id}/pay-wallet")
def pay_with_wallet(booking_id: int, background_tasks: BackgroundTasks, user_id: int = Depends(get_current_user)):
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

        email_info = _get_booking_email_info(conn, booking_id, user_id)

    # Gửi email xác nhận (ngoài transaction)
    if email_info:
        background_tasks.add_task(
            send_booking_confirmation_email,
            email=email_info["email"],
            name=email_info["full_name"] or "Quý khách",
            booking_id=booking_id,
            service_name=email_info["service_name"] or f"Dịch vụ #{booking_id}",
            amount=float(email_info["final_amount"]),
            entity_type=email_info["entity_type"] or "",
            check_in=str(email_info["check_in_date"]) if email_info["check_in_date"] else None,
            check_out=str(email_info["check_out_date"]) if email_info["check_out_date"] else None,
            booking_date=str(email_info["booking_date"])[:10] if email_info["booking_date"] else None,
        )

    new_balance = balance - amount
    return {"message": "Thanh toán thành công", "new_balance": new_balance}


# Thanh toán kết hợp ví + chuyển khoản
class PayCombinedRequest(BaseModel):
    wallet_amount: float = 0


@router.post("/{booking_id}/pay-combined")
def pay_combined(booking_id: int, data: PayCombinedRequest, background_tasks: BackgroundTasks, user_id: int = Depends(get_current_user)):
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

        email_info = _get_booking_email_info(conn, booking_id, user_id)

    # Gửi email xác nhận (ngoài transaction)
    if email_info:
        background_tasks.add_task(
            send_booking_confirmation_email,
            email=email_info["email"],
            name=email_info["full_name"] or "Quý khách",
            booking_id=booking_id,
            service_name=email_info["service_name"] or f"Dịch vụ #{booking_id}",
            amount=float(email_info["final_amount"]),
            entity_type=email_info["entity_type"] or "",
            check_in=str(email_info["check_in_date"]) if email_info["check_in_date"] else None,
            check_out=str(email_info["check_out_date"]) if email_info["check_out_date"] else None,
            booking_date=str(email_info["booking_date"])[:10] if email_info["booking_date"] else None,
        )

    return {"message": "Thanh toán thành công"}


# Chi tiết 1 booking (dùng cho invoice)
@router.get("/{booking_id}")
def get_booking(booking_id: int, user_id: int = Depends(get_current_user)):
    with engine.connect() as conn:
        booking = conn.execute(
            text("SELECT * FROM bookings WHERE booking_id = :id AND user_id = :uid"),
            {"id": booking_id, "uid": user_id}
        ).fetchone()

        if not booking:
            raise HTTPException(404, "Booking không tồn tại")

        # Items kèm tên dịch vụ
        items = conn.execute(text("""
            SELECT
                bi.*,
                CASE bi.entity_type
                    WHEN 'room'   THEN CONCAT(h.name, ' - ', rt.name)
                    WHEN 'flight' THEN CONCAT(f.airline, ': ', f.from_city, ' → ', f.to_city)
                    WHEN 'bus'    THEN CONCAT(bs.company, ': ', bs.from_city, ' → ', bs.to_city)
                    ELSE CONCAT(bi.entity_type, ' #', bi.entity_id)
                END AS entity_name,
                CASE bi.entity_type
                    WHEN 'flight' THEN f.from_city
                    WHEN 'bus'    THEN bs.from_city
                    ELSE NULL
                END AS from_city,
                CASE bi.entity_type
                    WHEN 'flight' THEN f.to_city
                    WHEN 'bus'    THEN bs.to_city
                    ELSE NULL
                END AS to_city,
                CASE bi.entity_type
                    WHEN 'flight' THEN f.depart_time
                    WHEN 'bus'    THEN bs.depart_time
                    ELSE NULL
                END AS depart_time,
                CASE bi.entity_type
                    WHEN 'flight' THEN f.arrive_time
                    WHEN 'bus'    THEN bs.arrive_time
                    ELSE NULL
                END AS arrive_time
            FROM booking_items bi
            LEFT JOIN room_types rt ON rt.room_type_id = bi.entity_id AND bi.entity_type = 'room'
            LEFT JOIN hotels h ON h.hotel_id = rt.hotel_id
            LEFT JOIN flights f ON f.flight_id = bi.entity_id AND bi.entity_type = 'flight'
            LEFT JOIN buses bs ON bs.bus_id = bi.entity_id AND bi.entity_type = 'bus'
            WHERE bi.booking_id = :id
        """), {"id": booking_id}).fetchall()

        # Thông tin user
        user_row = conn.execute(
            text("SELECT full_name, email, phone FROM users WHERE user_id = :uid"),
            {"uid": user_id}
        ).fetchone()

        result = dict(booking._mapping)
        result["items"] = [dict(i._mapping) for i in items]
        result["user"] = dict(user_row._mapping) if user_row else {}
        return result


# ── RESCHEDULE OPTIONS ──────────────────────────────────────────
@router.get("/{booking_id}/reschedule-options")
def get_reschedule_options(
    booking_id: int,
    check_in: str | None = None,
    check_out: str | None = None,
    date: str | None = None,
    user_id: int = Depends(get_current_user),
):
    with engine.connect() as conn:
        booking = conn.execute(
            text("SELECT * FROM bookings WHERE booking_id = :id AND user_id = :uid AND status = 'confirmed'"),
            {"id": booking_id, "uid": user_id},
        ).fetchone()
        if not booking:
            raise HTTPException(404, "Booking không tồn tại hoặc không thể đổi lịch")

        item = conn.execute(
            text("SELECT * FROM booking_items WHERE booking_id = :id LIMIT 1"),
            {"id": booking_id},
        ).fetchone()
        if not item:
            raise HTTPException(404, "Không tìm thấy thông tin đặt chỗ")

        item_d = dict(item._mapping)
        entity_type = item_d["entity_type"]
        entity_id   = item_d["entity_id"]
        old_price   = float(item_d["price"])

        if entity_type == "room" and check_in and check_out:
            hotel = conn.execute(
                text("SELECT hotel_id FROM room_types WHERE room_type_id = :id"),
                {"id": entity_id},
            ).fetchone()
            if not hotel:
                raise HTTPException(404, "Không tìm thấy khách sạn")
            hotel_id = hotel.hotel_id

            d1 = ddate.fromisoformat(check_in)
            d2 = ddate.fromisoformat(check_out)
            nights = max(1, (d2 - d1).days)

            rows = conn.execute(text("""
                SELECT rt.room_type_id, rt.name, rt.price_per_night, h.name AS hotel_name,
                       (rt.price_per_night * :nights) AS total_price,
                       (SELECT image_url FROM images
                        WHERE entity_type='hotel' AND entity_id=h.hotel_id LIMIT 1) AS image_url
                FROM room_types rt
                JOIN hotels h ON h.hotel_id = rt.hotel_id
                WHERE rt.hotel_id = :hotel_id
                AND NOT EXISTS (
                    SELECT 1 FROM booking_items bi
                    JOIN bookings b ON b.booking_id = bi.booking_id
                    WHERE bi.entity_type = 'room' AND bi.entity_id = rt.room_type_id
                    AND b.status IN ('pending','confirmed')
                    AND b.booking_id != :bid
                    AND bi.check_in_date < :check_out AND bi.check_out_date > :check_in
                )
                ORDER BY rt.price_per_night ASC
            """), {"hotel_id": hotel_id, "nights": nights,
                   "check_in": check_in, "check_out": check_out, "bid": booking_id}).fetchall()

            return {
                "entity_type": "room",
                "old_price":   old_price,
                "old_check_in":  str(item_d.get("check_in_date") or ""),
                "old_check_out": str(item_d.get("check_out_date") or ""),
                "nights":  nights,
                "options": [dict(r._mapping) for r in rows],
            }

        elif entity_type == "flight" and date:
            flight = conn.execute(
                text("SELECT * FROM flights WHERE flight_id = :id"), {"id": entity_id}
            ).fetchone()
            if not flight:
                raise HTTPException(404, "Không tìm thấy chuyến bay")
            fd = dict(flight._mapping)

            rows = conn.execute(text("""
                SELECT f.*,
                    TIMESTAMPDIFF(MINUTE, f.depart_time, f.arrive_time) AS duration_minutes,
                    (SELECT COUNT(*) FROM flight_seats fs
                     WHERE fs.flight_id = f.flight_id AND fs.is_booked = 0) AS available_seats
                FROM flights f
                WHERE f.airline = :airline AND f.from_city = :fc AND f.to_city = :tc
                AND DATE(f.depart_time) = :date AND f.status = 'active' AND f.flight_id != :cur
                ORDER BY f.depart_time ASC
            """), {"airline": fd["airline"], "fc": fd["from_city"], "tc": fd["to_city"],
                   "date": date, "cur": entity_id}).fetchall()

            return {
                "entity_type": "flight",
                "old_price":  old_price,
                "old_entity": fd,
                "options": [dict(r._mapping) for r in rows],
            }

        elif entity_type == "bus" and date:
            bus = conn.execute(
                text("SELECT * FROM buses WHERE bus_id = :id"), {"id": entity_id}
            ).fetchone()
            if not bus:
                raise HTTPException(404, "Không tìm thấy chuyến xe")
            bd = dict(bus._mapping)

            rows = conn.execute(text("""
                SELECT b.*,
                    TIMESTAMPDIFF(MINUTE, b.depart_time, b.arrive_time) AS duration_minutes,
                    (SELECT COUNT(*) FROM bus_seats bs
                     WHERE bs.bus_id = b.bus_id AND bs.is_booked = 0) AS available_seats
                FROM buses b
                WHERE b.company = :company AND b.from_city = :fc AND b.to_city = :tc
                AND DATE(b.depart_time) = :date AND b.status = 'active' AND b.bus_id != :cur
                ORDER BY b.depart_time ASC
            """), {"company": bd["company"], "fc": bd["from_city"], "tc": bd["to_city"],
                   "date": date, "cur": entity_id}).fetchall()

            return {
                "entity_type": "bus",
                "old_price":  old_price,
                "old_entity": bd,
                "options": [dict(r._mapping) for r in rows],
            }

        raise HTTPException(400, "Thiếu thông tin ngày mới")


# ── RESCHEDULE SUBMIT ───────────────────────────────────────────
class RescheduleRequest(BaseModel):
    new_entity_id: int | None = None
    new_check_in:  str | None = None
    new_check_out: str | None = None
    new_price:     float
    refund_method: str = "wallet"
    bank_info:     str | None = None


@router.post("/{booking_id}/reschedule")
def reschedule_booking(booking_id: int, data: RescheduleRequest, user_id: int = Depends(get_current_user)):
    with engine.begin() as conn:
        booking = conn.execute(
            text("SELECT * FROM bookings WHERE booking_id = :id AND user_id = :uid AND status = 'confirmed'"),
            {"id": booking_id, "uid": user_id},
        ).fetchone()
        if not booking:
            raise HTTPException(404, "Booking không tồn tại hoặc không thể đổi lịch")

        old_price  = float(dict(booking._mapping)["final_amount"])
        new_price  = float(data.new_price)
        price_diff = round(new_price - old_price, 2)

        # Helper: apply reschedule immediately
        def _apply(conn_):
            if data.new_entity_id:
                conn_.execute(
                    text("UPDATE booking_items SET entity_id = :eid WHERE booking_id = :bid"),
                    {"eid": data.new_entity_id, "bid": booking_id},
                )
            if data.new_check_in:
                conn_.execute(
                    text("UPDATE booking_items SET check_in_date = :ci, check_out_date = :co WHERE booking_id = :bid"),
                    {"ci": data.new_check_in, "co": data.new_check_out, "bid": booking_id},
                )
            conn_.execute(
                text("UPDATE bookings SET total_price = :np, final_amount = :np WHERE booking_id = :bid"),
                {"np": new_price, "bid": booking_id},
            )

        if abs(price_diff) < 1:  # Same price → immediate
            _apply(conn)
            conn.execute(text("""
                INSERT INTO booking_modifications
                    (booking_id, user_id, type, status, new_entity_id, new_check_in, new_check_out, old_price, new_price, price_diff)
                VALUES (:bid, :uid, 'reschedule', 'approved', :neid, :nci, :nco, :op, :np, 0)
            """), {"bid": booking_id, "uid": user_id, "neid": data.new_entity_id,
                   "nci": data.new_check_in, "nco": data.new_check_out, "op": old_price, "np": new_price})
            return {"status": "confirmed", "message": "Đổi lịch thành công!"}

        elif price_diff > 0:  # Higher → pending payment
            res = conn.execute(text("""
                INSERT INTO booking_modifications
                    (booking_id, user_id, type, status, new_entity_id, new_check_in, new_check_out, old_price, new_price, price_diff)
                VALUES (:bid, :uid, 'reschedule', 'pending', :neid, :nci, :nco, :op, :np, :diff)
            """), {"bid": booking_id, "uid": user_id, "neid": data.new_entity_id,
                   "nci": data.new_check_in, "nco": data.new_check_out,
                   "op": old_price, "np": new_price, "diff": price_diff})
            return {"status": "needs_payment", "mod_id": res.lastrowid,
                    "price_diff": price_diff, "message": f"Cần thanh toán thêm {price_diff:,.0f}₫"}

        else:  # Lower → apply immediately, refund to wallet now or bank later
            refund_amount = abs(price_diff)
            _apply(conn)

            if data.refund_method == "wallet":
                # Hoàn tiền vào ví ngay
                conn.execute(text("UPDATE users SET wallet = wallet + :amt WHERE user_id = :uid"),
                             {"amt": refund_amount, "uid": user_id})
                conn.execute(text("""
                    INSERT INTO wallet_transactions (user_id, amount, type, description, status)
                    VALUES (:uid, :amt, 'refund', :desc, 'success')
                """), {"uid": user_id, "amt": refund_amount,
                       "desc": f"Hoàn tiền đổi lịch #{booking_id}"})
                conn.execute(text("""
                    INSERT INTO booking_modifications
                        (booking_id, user_id, type, status, new_entity_id, new_check_in, new_check_out,
                         old_price, new_price, price_diff, refund_amount, refund_method)
                    VALUES (:bid, :uid, 'reschedule', 'approved', :neid, :nci, :nco,
                            :op, :np, :diff, :ra, 'wallet')
                """), {"bid": booking_id, "uid": user_id, "neid": data.new_entity_id,
                       "nci": data.new_check_in, "nco": data.new_check_out,
                       "op": old_price, "np": new_price, "diff": price_diff, "ra": refund_amount})
                return {"status": "confirmed",
                        "message": f"Đổi lịch thành công! {refund_amount:,.0f}₫ đã được hoàn vào ví."}
            else:
                # Hoàn về ngân hàng → chờ admin
                conn.execute(text("""
                    INSERT INTO booking_modifications
                        (booking_id, user_id, type, status, new_entity_id, new_check_in, new_check_out,
                         old_price, new_price, price_diff, refund_amount, refund_method, bank_info)
                    VALUES (:bid, :uid, 'reschedule', 'pending', :neid, :nci, :nco,
                            :op, :np, :diff, :ra, 'bank', :bi)
                """), {"bid": booking_id, "uid": user_id, "neid": data.new_entity_id,
                       "nci": data.new_check_in, "nco": data.new_check_out,
                       "op": old_price, "np": new_price, "diff": price_diff,
                       "ra": refund_amount, "bi": data.bank_info})
                return {"status": "confirmed",
                        "message": "Đổi lịch thành công! Tiền sẽ được hoàn về ngân hàng trong 2–5 ngày."}


# ── PAY EXTRA FOR RESCHEDULE (wallet) ──────────────────────────
@router.post("/modifications/{mod_id}/pay-extra")
def pay_extra_reschedule(mod_id: int, user_id: int = Depends(get_current_user)):
    with engine.begin() as conn:
        mod = conn.execute(
            text("SELECT * FROM booking_modifications WHERE mod_id = :id AND user_id = :uid AND status = 'pending'"),
            {"id": mod_id, "uid": user_id},
        ).fetchone()
        if not mod:
            raise HTTPException(404, "Yêu cầu không tồn tại")
        mod_d = dict(mod._mapping)
        if mod_d["type"] != "reschedule" or float(mod_d["price_diff"] or 0) <= 0:
            raise HTTPException(400, "Yêu cầu không hợp lệ")

        price_diff = float(mod_d["price_diff"])
        booking_id = mod_d["booking_id"]

        # Check wallet
        user_row = conn.execute(text("SELECT wallet FROM users WHERE user_id = :uid"), {"uid": user_id}).fetchone()
        balance = float(user_row.wallet or 0)
        if balance < price_diff:
            raise HTTPException(400, f"Số dư ví không đủ. Cần {price_diff:,.0f}₫, hiện có {balance:,.0f}₫")

        # Deduct wallet
        conn.execute(text("UPDATE users SET wallet = wallet - :amt WHERE user_id = :uid"),
                     {"amt": price_diff, "uid": user_id})
        conn.execute(text("""
            INSERT INTO wallet_transactions (user_id, amount, type, description, status)
            VALUES (:uid, :amt, 'payment', :desc, 'success')
        """), {"uid": user_id, "amt": -price_diff, "desc": f"Thanh toán thêm đổi lịch #{booking_id}"})

        # Apply booking changes
        if mod_d["new_entity_id"]:
            conn.execute(text("UPDATE booking_items SET entity_id = :eid WHERE booking_id = :bid"),
                         {"eid": mod_d["new_entity_id"], "bid": booking_id})
        if mod_d["new_check_in"]:
            conn.execute(text("UPDATE booking_items SET check_in_date = :ci, check_out_date = :co WHERE booking_id = :bid"),
                         {"ci": str(mod_d["new_check_in"]), "co": str(mod_d["new_check_out"]), "bid": booking_id})
        conn.execute(text("UPDATE bookings SET total_price = :np, final_amount = :np WHERE booking_id = :bid"),
                     {"np": float(mod_d["new_price"]), "bid": booking_id})

        # Mark approved
        conn.execute(text("UPDATE booking_modifications SET status = 'approved' WHERE mod_id = :id"),
                     {"id": mod_id})

        return {"message": "Đổi lịch thành công!", "new_balance": balance - price_diff}


# ── CANCEL BOOKING ──────────────────────────────────────────────
class CancelRequest(BaseModel):
    refund_method: str = "wallet"
    bank_info:     str | None = None


@router.post("/{booking_id}/cancel")
def cancel_booking(booking_id: int, data: CancelRequest, user_id: int = Depends(get_current_user)):
    with engine.begin() as conn:
        booking = conn.execute(
            text("SELECT * FROM bookings WHERE booking_id = :id AND user_id = :uid AND status = 'confirmed'"),
            {"id": booking_id, "uid": user_id},
        ).fetchone()
        if not booking:
            raise HTTPException(404, "Booking không tồn tại hoặc không thể hủy")

        total_price = float(dict(booking._mapping)["final_amount"])

        item = conn.execute(
            text("SELECT * FROM booking_items WHERE booking_id = :id LIMIT 1"), {"id": booking_id}
        ).fetchone()
        item_d = dict(item._mapping)
        entity_type = item_d["entity_type"]

        # Calculate cancel fee
        cancel_fee = 0.0
        check_in_raw = item_d.get("check_in_date")
        if check_in_raw:
            try:
                svc_date = check_in_raw if isinstance(check_in_raw, ddate) else ddate.fromisoformat(str(check_in_raw))
                days_until = (svc_date - ddate.today()).days
                if entity_type == "room":
                    if days_until < 3:
                        cancel_fee = round(total_price * 0.3, 2)
                elif entity_type in ("flight", "bus"):
                    if days_until < 1:
                        cancel_fee = round(total_price * 0.3, 2)
                    elif days_until < 3:
                        cancel_fee = round(total_price * 0.1, 2)
            except Exception:
                pass

        refund_amount = total_price - cancel_fee

        # Cancel booking
        conn.execute(text("UPDATE bookings SET status = 'cancelled' WHERE booking_id = :id"), {"id": booking_id})

        if data.refund_method == "wallet" and refund_amount > 0:
            # Hoàn tiền ngay vào ví
            conn.execute(
                text("UPDATE users SET wallet = wallet + :amt WHERE user_id = :uid"),
                {"amt": refund_amount, "uid": user_id}
            )
            conn.execute(text("""
                INSERT INTO wallet_transactions (user_id, amount, type, description, status)
                VALUES (:uid, :amt, 'refund', :desc, 'success')
            """), {"uid": user_id, "amt": refund_amount,
                   "desc": f"Hoàn tiền hủy đặt chỗ #{booking_id}"})

            conn.execute(text("""
                INSERT INTO booking_modifications
                    (booking_id, user_id, type, status, old_price, cancel_fee, refund_amount, refund_method, bank_info)
                VALUES (:bid, :uid, 'cancel', 'approved', :op, :cf, :ra, 'wallet', NULL)
            """), {"bid": booking_id, "uid": user_id, "op": total_price,
                   "cf": cancel_fee, "ra": refund_amount})

            message = f"Đặt chỗ đã hủy. {refund_amount:,.0f}₫ đã được hoàn vào ví của bạn."
        else:
            # Ngân hàng → chờ admin xử lý
            conn.execute(text("""
                INSERT INTO booking_modifications
                    (booking_id, user_id, type, status, old_price, cancel_fee, refund_amount, refund_method, bank_info)
                VALUES (:bid, :uid, 'cancel', 'pending', :op, :cf, :ra, :rm, :bi)
            """), {"bid": booking_id, "uid": user_id, "op": total_price,
                   "cf": cancel_fee, "ra": refund_amount,
                   "rm": data.refund_method, "bi": data.bank_info})
            message = "Đặt chỗ đã được hủy. Tiền sẽ được hoàn về ngân hàng trong vòng 2–5 ngày."

    return {
        "status": "cancelled",
        "cancel_fee": cancel_fee,
        "refund_amount": refund_amount,
        "message": message,
    }


# ── USER MODIFICATION HISTORY ───────────────────────────────────
@router.get("/my-modifications")
def get_my_modifications(user_id: int = Depends(get_current_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT m.*,
                CASE bi.entity_type
                    WHEN 'room'   THEN CONCAT(h.name, ' - ', rt.name)
                    WHEN 'flight' THEN CONCAT(f.airline, ': ', f.from_city, ' → ', f.to_city)
                    WHEN 'bus'    THEN CONCAT(bs.company, ': ', bs.from_city, ' → ', bs.to_city)
                    ELSE CONCAT(bi.entity_type, ' #', bi.entity_id)
                END AS entity_name,
                bi.entity_type
            FROM booking_modifications m
            JOIN booking_items bi ON bi.booking_id = m.booking_id
            LEFT JOIN room_types rt ON rt.room_type_id = bi.entity_id AND bi.entity_type = 'room'
            LEFT JOIN hotels h ON h.hotel_id = rt.hotel_id
            LEFT JOIN flights f ON f.flight_id = bi.entity_id AND bi.entity_type = 'flight'
            LEFT JOIN buses bs ON bs.bus_id = bi.entity_id AND bi.entity_type = 'bus'
            WHERE m.user_id = :uid
            ORDER BY m.created_at DESC
        """), {"uid": user_id}).fetchall()
        return [dict(r._mapping) for r in rows]