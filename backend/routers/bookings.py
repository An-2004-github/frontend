from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from rank_utils import get_cancel_fee_rate, get_rank, get_cashback_rate
from sqlalchemy import text
from database import engine
from auth import get_current_user
from pydantic import BaseModel
from email_service import send_booking_confirmation_email, send_cancel_confirmation_email
from datetime import date as ddate, datetime as dt
from routers.notifications import create_notification

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


def _apply_cashback(conn, user_id: int, booking_id: int, amount: float):
    """Tính rank mới + cộng cashback vào ví sau khi booking confirmed."""
    total_spent = conn.execute(
        text("SELECT COALESCE(SUM(final_amount), 0) FROM bookings WHERE user_id = :uid AND status = 'confirmed'"),
        {"uid": user_id}
    ).scalar()
    new_rank = get_rank(float(total_spent))
    conn.execute(
        text("UPDATE users SET user_rank = :rank WHERE user_id = :uid"),
        {"rank": new_rank, "uid": user_id}
    )
    cashback = round(amount * get_cashback_rate(new_rank))
    if cashback > 0:
        conn.execute(
            text("UPDATE users SET wallet = wallet + :amt WHERE user_id = :uid"),
            {"amt": cashback, "uid": user_id}
        )
        conn.execute(text("""
            INSERT INTO wallet_transactions (user_id, amount, type, description, status)
            VALUES (:uid, :amt, 'cashback', :desc, 'success')
        """), {"uid": user_id, "amt": cashback,
               "desc": f"Cashback {round(get_cashback_rate(new_rank)*100, 1)}% đơn #{booking_id}"})
    return cashback

# ── Auto-create payment_transactions table ──────────────────────
with engine.begin() as _conn:
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS payment_transactions (
            payment_id       INT AUTO_INCREMENT PRIMARY KEY,
            booking_id       INT NOT NULL,
            user_id          INT NOT NULL,
            method           ENUM('wallet','qr_transfer','combined') NOT NULL,
            amount           DECIMAL(10,2) NOT NULL,
            status           ENUM('pending','success','failed') DEFAULT 'success',
            transaction_ref  VARCHAR(100) NULL,
            bank_account     VARCHAR(50)  NULL,
            transfer_content VARCHAR(255) NULL,
            paid_at          DATETIME DEFAULT NOW(),
            created_at       DATETIME DEFAULT NOW()
        )
    """))

# ── Auto-create booking_modifications table ─────────────────────
with engine.begin() as _conn:
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS booking_modifications (
            mod_id         INT AUTO_INCREMENT PRIMARY KEY,
            booking_id     INT NOT NULL,
            user_id        INT NOT NULL,
            type           ENUM('reschedule','cancel') NOT NULL,
            status         ENUM('pending','approved','rejected') DEFAULT 'pending',
            new_entity_id  INT,
            new_check_in   DATE,
            new_check_out  DATE,
            new_seat_class VARCHAR(30),
            old_price      DECIMAL(12,2),
            new_price      DECIMAL(12,2),
            price_diff     DECIMAL(12,2) DEFAULT 0,
            reschedule_fee DECIMAL(12,2) DEFAULT 0,
            cancel_fee     DECIMAL(12,2) DEFAULT 0,
            refund_amount  DECIMAL(12,2) DEFAULT 0,
            refund_method  ENUM('wallet','bank') DEFAULT 'wallet',
            bank_info      TEXT,
            admin_note     TEXT,
            created_at     DATETIME DEFAULT NOW()
        )
    """))

# ── Auto-create transport_policies table ────────────────────────
with engine.begin() as _conn:
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS transport_policies (
            policy_id              INT AUTO_INCREMENT PRIMARY KEY,
            entity_type            ENUM('flight','bus','train') NOT NULL,
            carrier                VARCHAR(100) NOT NULL,
            seat_class             VARCHAR(30)  NOT NULL,
            allows_reschedule      BOOLEAN DEFAULT TRUE,
            reschedule_fee_percent DECIMAL(5,2) DEFAULT 0,
            refund_on_downgrade    BOOLEAN DEFAULT TRUE,
            allows_cancel          BOOLEAN DEFAULT TRUE,
            refund_on_cancel       BOOLEAN DEFAULT TRUE,
            cancel_fee_percent     DECIMAL(5,2) DEFAULT 10,
            min_hours_before       INT DEFAULT 2,
            UNIQUE KEY uq_policy (entity_type, carrier, seat_class)
        )
    """))

# ── Seed dữ liệu mặc định cho transport_policies ───────────────
with engine.begin() as _conn:
    # Xóa các bản ghi sai tên (tên carrier không khớp DB)
    _conn.execute(text("DELETE FROM transport_policies WHERE carrier IN ('Thành Bưởi', 'Pacific Airlines')"))

    # Tuple: (entity_type, carrier, seat_class,
    #         allows_reschedule, reschedule_fee_percent, refund_on_downgrade,
    #         allows_cancel, refund_on_cancel, cancel_fee_percent, min_hours_before)
    default_policies = [
        # ── Hàng không nội địa ──────────────────────────────────────────
        # Vietnam Airlines — hoàn vé, phí theo hạng
        ("flight", "Vietnam Airlines", "economy",  True,  5,  True,  True,  True, 20, 24),
        ("flight", "Vietnam Airlines", "business", True,  0,  True,  True,  True, 10, 12),
        ("flight", "Vietnam Airlines", "first",    True,  0,  True,  True,  True,  0,  6),
        # VietJet Air — economy không hoàn vé + phí hủy 5%; business hoàn
        ("flight", "VietJet Air",      "economy",  True, 10, False,  True, False,  5, 24),
        ("flight", "VietJet Air",      "business", True,  5,  True,  True,  True, 15, 12),
        ("flight", "VietJet Air",      "first",    True,  0,  True,  True,  True,  0, 12),
        # Bamboo Airways — economy không hoàn, không đổi lịch; business hoàn
        ("flight", "Bamboo Airways",   "economy", False,  0, False,  True, False,  0, 24),
        ("flight", "Bamboo Airways",   "business", True,  5,  True,  True,  True, 20, 12),
        ("flight", "Bamboo Airways",   "first",    True,  0,  True,  True,  True, 10,  6),
        # ── Hàng không quốc tế ─────────────────────────────────────────
        # Korean Air — economy không hoàn + phí 10%; hạng cao hoàn
        ("flight", "Korean Air",        "economy",  True,  5,  True,  True, False, 10, 48),
        ("flight", "Korean Air",        "business", True,  0,  True,  True,  True, 10, 24),
        ("flight", "Korean Air",        "first",    True,  0,  True,  True,  True,  0, 12),
        # Singapore Airlines — economy không hoàn + phí 10%
        ("flight", "Singapore Airlines","economy",  True,  5,  True,  True, False, 10, 48),
        ("flight", "Singapore Airlines","business", True,  0,  True,  True,  True, 10, 24),
        ("flight", "Singapore Airlines","first",    True,  0,  True,  True,  True,  0, 12),
        # ── Xe khách ───────────────────────────────────────────────────
        # Phương Trang — hoàn vé
        ("bus",    "Phương Trang",  "standard", True,  0,  True,  True,  True, 10, 12),
        ("bus",    "Phương Trang",  "vip",      True,  0,  True,  True,  True, 10, 12),
        ("bus",    "Phương Trang",  "sleeper",  True,  5,  True,  True,  True, 15, 12),
        # Futa Bus — hoàn vé
        ("bus",    "Futa Bus",      "standard", True,  0,  True,  True,  True, 10, 12),
        ("bus",    "Futa Bus",      "vip",      True,  0,  True,  True,  True, 10, 12),
        ("bus",    "Futa Bus",      "sleeper",  True,  5,  True,  True,  True, 15, 12),
        # Hoàng Long — hoàn vé
        ("bus",    "Hoàng Long",    "standard", True,  0,  True,  True,  True, 15, 12),
        ("bus",    "Hoàng Long",    "vip",      True,  0,  True,  True,  True, 15, 12),
        ("bus",    "Hoàng Long",    "sleeper",  True,  5,  True,  True,  True, 20, 12),
        # Mai Linh — hoàn vé
        ("bus",    "Mai Linh",      "standard", True,  0,  True,  True,  True, 15, 12),
        ("bus",    "Mai Linh",      "vip",      True,  5,  True,  True,  True, 20, 12),
        # Kumho Samco — standard không hoàn + phí hủy 5%
        ("bus",    "Kumho Samco",   "standard",False,  0, False,  True, False,  5, 24),
        ("bus",    "Kumho Samco",   "vip",      True,  5,  True,  True,  True, 20, 12),
        ("bus",    "Kumho Samco",   "sleeper",  True,  5,  True,  True,  True, 20, 12),
        # Thanh Buổi — hoàn vé
        ("bus",    "Thanh Buổi",    "standard", True,  0,  True,  True,  True, 15, 12),
        ("bus",    "Thanh Buổi",    "vip",      True,  0,  True,  True,  True, 15, 12),
        ("bus",    "Thanh Buổi",    "sleeper",  True,  5,  True,  True,  True, 20, 12),
        # ── Tàu hỏa ────────────────────────────────────────────────────
        # hard_seat không hoàn + phí 5%; các hạng khác hoàn
        ("train",  "Đường sắt Việt Nam", "hard_seat",    True,  5, False, True, False,  5, 72),
        ("train",  "Đường sắt Việt Nam", "soft_seat",    True,  5,  True, True,  True, 20, 48),
        ("train",  "Đường sắt Việt Nam", "hard_sleeper", True,  0,  True, True,  True, 15, 24),
        ("train",  "Đường sắt Việt Nam", "soft_sleeper", True,  0,  True, True,  True, 10, 24),
    ]
    for (et, carrier, sc, ar, rfp, rod, ac, roc, cfp, mhb) in default_policies:
        _conn.execute(text("""
            INSERT INTO transport_policies
                (entity_type, carrier, seat_class, allows_reschedule, reschedule_fee_percent,
                 refund_on_downgrade, allows_cancel, refund_on_cancel, cancel_fee_percent, min_hours_before)
            VALUES (:et, :carrier, :sc, :ar, :rfp, :rod, :ac, :roc, :cfp, :mhb)
            ON DUPLICATE KEY UPDATE
                allows_reschedule      = VALUES(allows_reschedule),
                reschedule_fee_percent = VALUES(reschedule_fee_percent),
                refund_on_downgrade    = VALUES(refund_on_downgrade),
                allows_cancel          = VALUES(allows_cancel),
                refund_on_cancel       = VALUES(refund_on_cancel),
                cancel_fee_percent     = VALUES(cancel_fee_percent),
                min_hours_before       = VALUES(min_hours_before)
        """), {"et": et, "carrier": carrier, "sc": sc, "ar": ar, "rfp": rfp,
               "rod": rod, "ac": ac, "roc": roc, "cfp": cfp, "mhb": mhb})

# ── Thêm cột refund_on_cancel vào transport_policies nếu chưa có ─
with engine.begin() as _conn:
    try:
        _conn.execute(text("ALTER TABLE transport_policies ADD COLUMN refund_on_cancel BOOLEAN DEFAULT TRUE"))
    except Exception:
        pass

# ── Thêm cột allows_refund vào hotels nếu chưa có ─────────────
with engine.begin() as _conn:
    try:
        _conn.execute(text("ALTER TABLE hotels ADD COLUMN allows_refund BOOLEAN NOT NULL DEFAULT TRUE"))
    except Exception:
        pass  # Cột đã tồn tại

# ── Thêm cột seat_class vào booking_items nếu chưa có ──────────
with engine.begin() as _conn:
    try:
        _conn.execute(text("ALTER TABLE booking_items ADD COLUMN seat_class VARCHAR(30) NULL"))
    except Exception:
        pass  # Cột đã tồn tại

# ── Thêm cột new_seat_class + reschedule_fee vào booking_modifications nếu chưa có ─
with engine.begin() as _conn:
    for col_sql in [
        "ALTER TABLE booking_modifications ADD COLUMN new_seat_class VARCHAR(30) NULL",
        "ALTER TABLE booking_modifications ADD COLUMN reschedule_fee DECIMAL(12,2) DEFAULT 0",
    ]:
        try:
            _conn.execute(text(col_sql))
        except Exception:
            pass


class BookingRequest(BaseModel):
    entity_type:    str
    entity_id:      int
    check_in_date:  str | None = None
    check_out_date: str | None = None
    guests:         int = 1
    passengers:     int = 1
    seat_class:     str | None = None
    total_price:    float
    final_price:    float | None = None   # giá sau khi áp mã giảm giá
    promo_id:       int | None = None


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
                    COALESCE(bi.check_in_date, CASE bi.entity_type WHEN 'flight' THEN f.depart_time WHEN 'bus' THEN bs.depart_time WHEN 'train' THEN t.depart_time ELSE NULL END) AS check_in_date,
                    COALESCE(bi.check_out_date, CASE bi.entity_type WHEN 'flight' THEN f.arrive_time WHEN 'bus' THEN bs.arrive_time WHEN 'train' THEN t.arrive_time ELSE NULL END) AS check_out_date,

                    -- Tên entity
                    CASE bi.entity_type
                        WHEN 'room'   THEN CONCAT(h.name, ' - ', rt.name)
                        WHEN 'flight' THEN CONCAT(f.airline, ': ', f.from_city, ' → ', f.to_city)
                        WHEN 'bus'    THEN CONCAT(bs.company, ': ', bs.from_city, ' → ', bs.to_city)
                        WHEN 'train'  THEN CONCAT('Tàu ', t.train_code, ': ', t.from_city, ' → ', t.to_city)
                        ELSE CONCAT(bi.entity_type, ' #', bi.entity_id)
                    END AS entity_name,

                    -- Thêm from/to city và depart/arrive cho tất cả transport
                    CASE bi.entity_type WHEN 'flight' THEN f.from_city WHEN 'bus' THEN bs.from_city WHEN 'train' THEN t.from_city ELSE NULL END AS from_city,
                    CASE bi.entity_type WHEN 'flight' THEN f.to_city WHEN 'bus' THEN bs.to_city WHEN 'train' THEN t.to_city ELSE NULL END AS to_city,
                    CASE bi.entity_type WHEN 'flight' THEN f.depart_time WHEN 'bus' THEN bs.depart_time WHEN 'train' THEN t.depart_time ELSE NULL END AS depart_time,
                    CASE bi.entity_type WHEN 'flight' THEN f.arrive_time WHEN 'bus' THEN bs.arrive_time WHEN 'train' THEN t.arrive_time ELSE NULL END AS arrive_time

                FROM bookings b
                JOIN booking_items bi ON bi.booking_id = b.booking_id
                    AND bi.item_id = (
                        SELECT MIN(item_id) FROM booking_items WHERE booking_id = b.booking_id
                    )
                LEFT JOIN room_types rt ON rt.room_type_id = bi.entity_id AND bi.entity_type = 'room'
                LEFT JOIN hotels h ON h.hotel_id = rt.hotel_id
                LEFT JOIN flights f ON f.flight_id = bi.entity_id AND bi.entity_type = 'flight'
                LEFT JOIN buses bs ON bs.bus_id = bi.entity_id AND bi.entity_type = 'bus'
                LEFT JOIN trains t ON t.train_id = bi.entity_id AND bi.entity_type = 'train'

                WHERE b.user_id = :user_id
                ORDER BY b.booking_date DESC
            """),
            {"user_id": user_id}
        ).fetchall()

        return [dict(row._mapping) for row in result]


# Tạo booking mới
@router.post("")
def create_booking(data: BookingRequest, user_id: int = Depends(get_current_user)):
    quantity = data.passengers if data.entity_type in ("flight", "bus", "train") else data.guests

    with engine.begin() as conn:
        # Kiểm tra đã qua giờ khởi hành chưa
        if data.entity_type == "flight":
            depart = conn.execute(
                text("SELECT depart_time FROM flights WHERE flight_id = :id"),
                {"id": data.entity_id}
            ).scalar()
            if depart and depart < dt.now():
                raise HTTPException(400, "Chuyến bay này đã khởi hành, không thể đặt vé.")
        elif data.entity_type == "bus":
            depart = conn.execute(
                text("SELECT depart_time FROM buses WHERE bus_id = :id"),
                {"id": data.entity_id}
            ).scalar()
            if depart and depart < dt.now():
                raise HTTPException(400, "Chuyến xe này đã khởi hành, không thể đặt vé.")
        elif data.entity_type == "train":
            depart = conn.execute(
                text("SELECT depart_time FROM trains WHERE train_id = :id"),
                {"id": data.entity_id}
            ).scalar()
            if depart and depart < dt.now():
                raise HTTPException(400, "Chuyến tàu này đã khởi hành, không thể đặt vé.")

        # Kiểm tra đủ ghế trước khi đặt (cho flight)
        if data.entity_type == "flight" and data.seat_class:
            avail = conn.execute(
                text("""
                    SELECT COUNT(*) FROM flight_seats
                    WHERE flight_id = :fid AND seat_class = :cls AND is_booked = 0
                """),
                {"fid": data.entity_id, "cls": data.seat_class}
            ).scalar()
            if avail < quantity:
                raise HTTPException(
                    400,
                    f"Không đủ ghế {data.seat_class}. Chỉ còn {avail} ghế trống."
                )

        # Kiểm tra đủ ghế trước khi đặt (cho bus)
        if data.entity_type == "bus":
            avail = conn.execute(
                text("""
                    SELECT COUNT(*) FROM bus_seats
                    WHERE bus_id = :bid AND is_booked = 0
                """),
                {"bid": data.entity_id}
            ).scalar()
            if avail < quantity:
                raise HTTPException(
                    400,
                    f"Không đủ ghế. Chỉ còn {avail} ghế trống."
                )

        # Tính discount_amount và final_amount
        discount_amount = round(data.total_price - data.final_price, 2) if data.final_price is not None else 0.0
        final_amount = data.final_price if data.final_price is not None else data.total_price

        # Tạo booking
        result = conn.execute(
            text("""
                INSERT INTO bookings (user_id, booking_date, status, total_price, final_amount, promo_id, discount_amount)
                VALUES (:user_id, NOW(), 'pending', :total_price, :final_amount, :promo_id, :discount_amount)
            """),
            {
                "user_id": user_id,
                "total_price": data.total_price,
                "final_amount": final_amount,
                "promo_id": data.promo_id,
                "discount_amount": discount_amount,
            }
        )
        booking_id = result.lastrowid

        # Tạo booking item
        conn.execute(
            text("""
                INSERT INTO booking_items
                    (booking_id, entity_type, entity_id, quantity, price, seat_class, check_in_date, check_out_date)
                VALUES
                    (:booking_id, :entity_type, :entity_id, :quantity, :price, :seat_class, :check_in, :check_out)
            """),
            {
                "booking_id":  booking_id,
                "entity_type": data.entity_type,
                "entity_id":   data.entity_id,
                "quantity":    quantity,
                "price":       data.total_price,
                "seat_class":  data.seat_class,
                "check_in":    data.check_in_date,
                "check_out":   data.check_out_date,
            }
        )

        # Trừ ghế trong flight_seats
        if data.entity_type == "flight" and data.seat_class:
            seat_rows = conn.execute(
                text("""
                    SELECT seat_id FROM flight_seats
                    WHERE flight_id = :fid AND seat_class = :cls AND is_booked = 0
                    LIMIT :n
                """),
                {"fid": data.entity_id, "cls": data.seat_class, "n": quantity}
            ).fetchall()
            seat_ids = [str(r.seat_id) for r in seat_rows]
            if seat_ids:
                conn.execute(
                    text(f"UPDATE flight_seats SET is_booked = 1 WHERE seat_id IN ({','.join(seat_ids)})")
                )

        # Trừ ghế trong bus_seats
        if data.entity_type == "bus":
            seat_rows = conn.execute(
                text("""
                    SELECT seat_id FROM bus_seats
                    WHERE bus_id = :bid AND is_booked = 0
                    LIMIT :n
                """),
                {"bid": data.entity_id, "n": quantity}
            ).fetchall()
            seat_ids = [str(r.seat_id) for r in seat_rows]
            if seat_ids:
                conn.execute(
                    text(f"UPDATE bus_seats SET is_booked = 1 WHERE seat_id IN ({','.join(seat_ids)})")
                )

        # Trừ ghế trong train_seats
        if data.entity_type == "train" and data.seat_class:
            seat_rows = conn.execute(
                text("""
                    SELECT seat_id FROM train_seats
                    WHERE train_id = :tid AND seat_class = :cls AND is_booked = 0
                    LIMIT :n
                """),
                {"tid": data.entity_id, "cls": data.seat_class, "n": quantity}
            ).fetchall()
            seat_ids = [str(r.seat_id) for r in seat_rows]
            if seat_ids:
                conn.execute(
                    text(f"UPDATE train_seats SET is_booked = 1 WHERE seat_id IN ({','.join(seat_ids)})")
                )

        # Tăng used_count và ghi nhận per-user usage nếu có mã giảm giá
        if data.promo_id:
            conn.execute(
                text("UPDATE promotions SET used_count = used_count + 1 WHERE promo_id = :pid"),
                {"pid": data.promo_id}
            )
            # Ghi nhận user đã dùng mã này (bỏ qua nếu đã tồn tại)
            conn.execute(
                text("""
                    INSERT IGNORE INTO promo_user_usages (promo_id, user_id)
                    VALUES (:pid, :uid)
                """),
                {"pid": data.promo_id, "uid": user_id}
            )

    return {"booking_id": booking_id, "message": "Đặt chỗ thành công"}


def _get_booking_email_info(conn, booking_id: int, user_id: int):
    """Lấy thông tin cần thiết để gửi email xác nhận."""
    row = conn.execute(text("""
        SELECT
            u.email, u.full_name,
            b.final_amount, b.booking_date,
            bi.entity_type, bi.check_in_date, bi.check_out_date,
            bi.quantity,
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

        amount = float(booking_dict["final_amount"] or booking_dict.get("total_price") or 0)
        if amount <= 0:
            raise HTTPException(400, "Số tiền thanh toán không hợp lệ")

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

        # Ghi nhận giao dịch thanh toán
        conn.execute(text("""
            INSERT INTO payment_transactions (booking_id, user_id, method, amount, status)
            VALUES (:bid, :uid, 'wallet', :amount, 'success')
        """), {"bid": booking_id, "uid": user_id, "amount": amount})

        cashback = _apply_cashback(conn, user_id, booking_id, amount)
        email_info = _get_booking_email_info(conn, booking_id, user_id)
        # Tạo notification xác nhận đặt chỗ
        create_notification(
            conn, user_id,
            type="booking_confirm",
            title="Đặt chỗ đã được xác nhận ✅",
            content=f"Đặt chỗ #{booking_id} của bạn đã thanh toán thành công.",
            related_id=booking_id,
        )
        if cashback > 0:
            create_notification(
                conn, user_id,
                type="wallet_credit",
                title="Bạn nhận được cashback 💰",
                content=f"Ví của bạn được cộng {cashback:,.0f}₫ cashback từ đặt chỗ #{booking_id}.",
                related_id=booking_id,
            )

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
            rooms=int(email_info["quantity"]) if email_info.get("quantity") else None,
            guests=None,
        )

    new_balance = balance - amount
    msg = f"Thanh toán thành công"
    if cashback > 0:
        msg += f". Bạn nhận được {cashback:,.0f}₫ cashback vào ví!"
    return {"message": msg, "new_balance": new_balance}


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

        final_amount = float(booking_dict["final_amount"])

        # Ghi nhận giao dịch thanh toán kết hợp
        conn.execute(text("""
            INSERT INTO payment_transactions (booking_id, user_id, method, amount, status)
            VALUES (:bid, :uid, 'combined', :amount, 'success')
        """), {"bid": booking_id, "uid": user_id, "amount": final_amount})

        cashback = _apply_cashback(conn, user_id, booking_id, final_amount)
        email_info = _get_booking_email_info(conn, booking_id, user_id)
        create_notification(
            conn, user_id,
            type="booking_confirm",
            title="Đặt chỗ đã được xác nhận ✅",
            content=f"Đặt chỗ #{booking_id} của bạn đã thanh toán thành công.",
            related_id=booking_id,
        )
        if cashback > 0:
            create_notification(
                conn, user_id,
                type="wallet_credit",
                title="Bạn nhận được cashback 💰",
                content=f"Ví của bạn được cộng {cashback:,.0f}₫ cashback từ đặt chỗ #{booking_id}.",
                related_id=booking_id,
            )

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
            rooms=int(email_info["quantity"]) if email_info.get("quantity") else None,
            guests=None,
        )

    msg = "Thanh toán thành công"
    if cashback > 0:
        msg += f". Bạn nhận được {cashback:,.0f}₫ cashback vào ví!"
    return {"message": msg}


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
                COALESCE(bi.check_in_date, CASE bi.entity_type WHEN 'flight' THEN f.depart_time WHEN 'bus' THEN bs.depart_time WHEN 'train' THEN t.depart_time ELSE NULL END) AS check_in_date_calc,
                COALESCE(bi.check_out_date, CASE bi.entity_type WHEN 'flight' THEN f.arrive_time WHEN 'bus' THEN bs.arrive_time WHEN 'train' THEN t.arrive_time ELSE NULL END) AS check_out_date_calc,
                CASE bi.entity_type
                    WHEN 'room'   THEN CONCAT(h.name, ' - ', rt.name)
                    WHEN 'flight' THEN CONCAT(f.airline, ': ', f.from_city, ' → ', f.to_city)
                    WHEN 'bus'    THEN CONCAT(bs.company, ': ', bs.from_city, ' → ', bs.to_city)
                    WHEN 'train'  THEN CONCAT('Tàu ', t.train_code, ': ', t.from_city, ' → ', t.to_city)
                    ELSE CONCAT(bi.entity_type, ' #', bi.entity_id)
                END AS entity_name,
                CASE bi.entity_type
                    WHEN 'flight' THEN f.from_city
                    WHEN 'bus'    THEN bs.from_city
                    WHEN 'train'  THEN t.from_city
                    ELSE NULL
                END AS from_city,
                CASE bi.entity_type
                    WHEN 'flight' THEN f.to_city
                    WHEN 'bus'    THEN bs.to_city
                    WHEN 'train'  THEN t.to_city
                    ELSE NULL
                END AS to_city,
                CASE bi.entity_type
                    WHEN 'flight' THEN f.depart_time
                    WHEN 'bus'    THEN bs.depart_time
                    WHEN 'train'  THEN t.depart_time
                    ELSE NULL
                END AS depart_time,
                CASE bi.entity_type
                    WHEN 'flight' THEN f.arrive_time
                    WHEN 'bus'    THEN bs.arrive_time
                    WHEN 'train'  THEN t.arrive_time
                    ELSE NULL
                END AS arrive_time
            FROM booking_items bi
            LEFT JOIN room_types rt ON rt.room_type_id = bi.entity_id AND bi.entity_type = 'room'
            LEFT JOIN hotels h ON h.hotel_id = rt.hotel_id
            LEFT JOIN flights f ON f.flight_id = bi.entity_id AND bi.entity_type = 'flight'
            LEFT JOIN buses bs ON bs.bus_id = bi.entity_id AND bi.entity_type = 'bus'
            LEFT JOIN trains t ON t.train_id = bi.entity_id AND bi.entity_type = 'train'
            WHERE bi.booking_id = :id
        """), {"id": booking_id}).fetchall()

        # Thông tin user
        user_row = conn.execute(
            text("SELECT full_name, email, phone FROM users WHERE user_id = :uid"),
            {"uid": user_id}
        ).fetchone()

        result = dict(booking._mapping)
        result["items"] = []
        for i in items:
            d = dict(i._mapping)
            d["check_in_date"] = d.get("check_in_date_calc") or d.get("check_in_date")
            d["check_out_date"] = d.get("check_out_date_calc") or d.get("check_out_date")
            d.pop("check_in_date_calc", None)
            d.pop("check_out_date_calc", None)
            result["items"].append(d)

        result["user"] = dict(user_row._mapping) if user_row else {}

        # Thông tin mã giảm giá (nếu có)
        if result.get("promo_id"):
            promo = conn.execute(
                text("SELECT code, description FROM promotions WHERE promo_id = :pid"),
                {"pid": result["promo_id"]}
            ).fetchone()
            result["promo"] = dict(promo._mapping) if promo else None
        else:
            result["promo"] = None

        # Gộp policy vào response luôn — tránh gọi API riêng
        default_policy = {"allows_reschedule": True, "allows_cancel": True,
                          "reschedule_fee_percent": 0, "cancel_fee_percent": 0,
                          "refund_on_downgrade": True, "min_hours_before": 0}
        try:
            item_d      = result["items"][0] if result["items"] else {}
            entity_type = item_d.get("entity_type", "")
            seat_class  = item_d.get("seat_class") or ""
            eid         = item_d.get("entity_id")

            policy = default_policy.copy()

            if entity_type in ("flight", "bus", "train") and eid:
                if entity_type == "flight":
                    r = conn.execute(text("SELECT airline FROM flights WHERE flight_id=:id"), {"id": eid}).fetchone()
                    carrier = r.airline if r else ""
                elif entity_type == "bus":
                    r = conn.execute(text("SELECT company FROM buses WHERE bus_id=:id"), {"id": eid}).fetchone()
                    carrier = r.company if r else ""
                else:
                    carrier = "Đường sắt Việt Nam"

                if carrier:
                    # Fallback seat_class per transport type if not recorded
                    if not seat_class:
                        seat_class = "hard_seat" if entity_type == "train" else "standard" if entity_type == "bus" else "economy"
                    raw = _get_policy(conn, entity_type, carrier, seat_class)
                    policy = {
                        "allows_reschedule":      bool(raw.get("allows_reschedule", True)),
                        "allows_cancel":          bool(raw.get("allows_cancel", True)),
                        "reschedule_fee_percent": float(raw.get("reschedule_fee_percent", 0)),
                        "cancel_fee_percent":     float(raw.get("cancel_fee_percent", 0)),
                        "refund_on_downgrade":    bool(raw.get("refund_on_downgrade", True)),
                        "min_hours_before":       int(raw.get("min_hours_before", 0)),
                    }
        except Exception:
            policy = default_policy

        result["policy"] = policy
        return result


# ── Hệ số giá theo hạng ghế ────────────────────────────────────
FLIGHT_CLASS_MULTIPLIER = {"economy": 1.0, "business": 1.8, "first": 2.5}
CLASS_LABEL_VN = {
    "economy": "Economy", "business": "Business", "first": "First Class",
    "standard": "Ghế thường", "vip": "Ghế VIP", "sleeper": "Giường nằm",
    "hard_seat": "Ngồi cứng", "soft_seat": "Ngồi mềm",
    "hard_sleeper": "Nằm cứng", "soft_sleeper": "Nằm mềm",
}
BUS_CLASS_MULTIPLIER    = {"standard": 1.0, "vip": 1.4, "sleeper": 1.6}

def _get_policy(conn, entity_type: str, carrier: str, seat_class: str) -> dict:
    """Lấy policy cho hãng + hạng ghế; trả về policy mặc định nếu chưa có."""
    row = conn.execute(text("""
        SELECT * FROM transport_policies
        WHERE entity_type = :et AND carrier = :carrier AND seat_class = :sc
    """), {"et": entity_type, "carrier": carrier, "sc": seat_class}).fetchone()
    if row:
        return dict(row._mapping)
    # Mặc định nếu chưa có policy
    return {
        "allows_reschedule": True, "reschedule_fee_percent": 0,
        "refund_on_downgrade": True,
        "allows_cancel": True, "cancel_fee_percent": 10,
        "min_hours_before": 2,
    }

def _hotel_reschedule_fee(hours_until_checkin: float, user_rank: str) -> dict:
    """Tính phí đổi lịch khách sạn theo khoảng thời gian còn lại và hạng thành viên.
    Trả về: {allowed, fee_percent, note}
    """
    rank = (user_rank or "bronze").lower()

    if hours_until_checkin < 0:
        return {
            "allowed": False, "fee_percent": 0,
            "note": "Đã quá giờ nhận phòng, không thể đổi lịch",
        }

    if hours_until_checkin > 72:
        return {
            "allowed": True, "fee_percent": 0,
            "note": "Miễn phí đổi lịch (trước hơn 72 giờ)",
        }

    if hours_until_checkin >= 24:
        pct = {"diamond": 10, "gold": 10, "silver": 20, "bronze": 30}.get(rank, 30)
        rank_label = {"diamond": "Kim Cương", "gold": "Vàng", "silver": "Bạc", "bronze": "Đồng"}.get(rank, rank)
        return {
            "allowed": True, "fee_percent": pct,
            "note": f"Phí đổi lịch {pct}% (24–72 giờ, hạng {rank_label})",
        }

    # < 24h
    if rank in ("diamond", "gold"):
        return {
            "allowed": True, "fee_percent": 50,
            "note": "Phí đổi lịch 50% (< 24 giờ trước nhận phòng, hạng Vàng/Kim Cương)",
        }
    if rank == "silver":
        return {
            "allowed": True, "fee_percent": 100,
            "note": "Phí đổi lịch 100% (< 24 giờ trước nhận phòng, hạng Bạc — không hoàn tiền)",
        }
    # bronze
    return {
        "allowed": False, "fee_percent": 0,
        "note": "Không thể đổi lịch khi còn dưới 24 giờ trước nhận phòng (hạng Đồng)",
    }


def _classes_for_flight(conn, flight_id: int, base_price: float) -> list[dict]:
    """Trả về danh sách hạng ghế còn chỗ với giá tương ứng cho 1 chuyến bay."""
    result = []
    for cls, mult in FLIGHT_CLASS_MULTIPLIER.items():
        cnt = conn.execute(text("""
            SELECT COUNT(*) FROM flight_seats
            WHERE flight_id = :fid AND seat_class = :cls AND is_booked = 0
        """), {"fid": flight_id, "cls": cls}).scalar() or 0
        result.append({"seat_class": cls, "available": cnt, "price": round(base_price * mult)})
    return result

def _classes_for_bus(conn, bus_id: int, base_price: float) -> list[dict]:
    """Trả về danh sách hạng ghế còn chỗ với giá tương ứng cho 1 chuyến xe."""
    result = []
    for cls, mult in BUS_CLASS_MULTIPLIER.items():
        cnt = conn.execute(text("""
            SELECT COUNT(*) FROM bus_seats
            WHERE bus_id = :bid AND seat_class = :cls AND is_booked = 0
        """), {"bid": bus_id, "cls": cls}).scalar() or 0
        result.append({"seat_class": cls, "available": cnt, "price": round(base_price * mult)})
    return result

def _classes_for_train(conn, train_id: int) -> list[dict]:
    """Trả về danh sách hạng ghế còn chỗ với giá thực tế từ train_seats."""
    result = []
    for cls in ("hard_seat", "soft_seat", "hard_sleeper", "soft_sleeper"):
        row = conn.execute(text("""
            SELECT COUNT(*) AS cnt, MIN(price) AS price FROM train_seats
            WHERE train_id = :tid AND seat_class = :cls AND is_booked = 0
        """), {"tid": train_id, "cls": cls}).fetchone()
        cnt   = row.cnt   or 0
        price = float(row.price or 0)
        result.append({"seat_class": cls, "available": cnt, "price": price})
    return result

# ── CLASS OPTIONS (đổi hạng cùng chuyến) ───────────────────────
@router.get("/{booking_id}/class-options")
def get_class_options(booking_id: int, user_id: int = Depends(get_current_user)):
    """Trả về danh sách hạng ghế khả dụng cho chuyến hiện tại (để đổi hạng)."""
    with engine.connect() as conn:
        booking = conn.execute(
            text("SELECT * FROM bookings WHERE booking_id = :id AND user_id = :uid AND status = 'confirmed'"),
            {"id": booking_id, "uid": user_id}
        ).fetchone()
        if not booking:
            raise HTTPException(404, "Booking không tồn tại hoặc không ở trạng thái confirmed")

        item = conn.execute(
            text("SELECT * FROM booking_items WHERE booking_id = :id LIMIT 1"),
            {"id": booking_id}
        ).fetchone()
        if not item:
            raise HTTPException(404, "Không tìm thấy thông tin vé")

        item_d = dict(item._mapping)
        entity_type = item_d["entity_type"]
        eid         = item_d["entity_id"]
        base_price  = float(item_d["price"])
        cur_class   = item_d.get("seat_class") or ""

        if entity_type not in ("flight", "bus", "train"):
            raise HTTPException(400, "Chỉ hỗ trợ đổi hạng cho vé phương tiện")

        if entity_type == "flight":
            classes = _classes_for_flight(conn, eid, base_price)
            r = conn.execute(text("SELECT airline FROM flights WHERE flight_id=:id"), {"id": eid}).fetchone()
            carrier = r.airline if r else ""
        elif entity_type == "bus":
            classes = _classes_for_bus(conn, eid, base_price)
            r = conn.execute(text("SELECT company FROM buses WHERE bus_id=:id"), {"id": eid}).fetchone()
            carrier = r.company if r else ""
        else:
            classes = _classes_for_train(conn, eid)
            carrier = "Đường sắt Việt Nam"

        for cls in classes:
            pol = _get_policy(conn, entity_type, carrier, cls["seat_class"])
            cls["allows_reschedule"]      = bool(pol.get("allows_reschedule", True))
            cls["reschedule_fee_percent"] = float(pol.get("reschedule_fee_percent", 0))
            cls["refund_on_downgrade"]    = bool(pol.get("refund_on_downgrade", True))
            cls["is_current"]             = (cls["seat_class"] == cur_class)

        return {
            "classes":             classes,
            "old_price":           base_price,
            "current_seat_class":  cur_class,
            "entity_id":           eid,
            "entity_type":         entity_type,
        }


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

        item_d      = dict(item._mapping)
        entity_type = item_d["entity_type"]
        entity_id   = item_d["entity_id"]
        old_price   = float(item_d["price"])
        seat_class  = item_d.get("seat_class") or ""

        # ── PHÒNG KHÁCH SẠN ─────────────────────────────────────
        if entity_type == "room" and check_in and check_out:
            # Lấy user_rank để tính phí đổi lịch theo hạng
            user_row = conn.execute(
                text("SELECT user_rank FROM users WHERE user_id = :uid"), {"uid": user_id}
            ).fetchone()
            user_rank = dict(user_row._mapping).get("user_rank", "bronze") if user_row else "bronze"

            # Tính giờ còn lại đến check-in hiện tại (14:00 ngày check-in)
            old_check_in_raw = item_d.get("check_in_date")
            if old_check_in_raw:
                old_ci = old_check_in_raw if isinstance(old_check_in_raw, ddate) \
                    else ddate.fromisoformat(str(old_check_in_raw))
                old_ci_dt = dt.combine(old_ci, dt.min.time().replace(hour=14))
                hours_until = (old_ci_dt - dt.now()).total_seconds() / 3600
            else:
                hours_until = 999.0

            fee_info = _hotel_reschedule_fee(hours_until, user_rank)
            if not fee_info["allowed"]:
                raise HTTPException(400, fee_info["note"])

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
                       ROUND(rt.price_per_night * :nights * 1.21) AS total_price,
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
            # Lấy allows_refund của khách sạn
            hr = conn.execute(text("""
                SELECT h.allows_refund FROM room_types rt
                JOIN hotels h ON h.hotel_id = rt.hotel_id
                WHERE rt.room_type_id = :id
            """), {"id": entity_id}).fetchone()
            allows_refund = bool(hr.allows_refund) if hr else True

            return {
                "entity_type":          "room",
                "old_price":            old_price,
                "old_check_in":         str(item_d.get("check_in_date") or ""),
                "old_check_out":        str(item_d.get("check_out_date") or ""),
                "nights":               nights,
                "options":              [dict(r._mapping) for r in rows],
                "reschedule_fee_info":  fee_info,
                "allows_refund":        allows_refund,
            }

        # ── CHUYẾN BAY ──────────────────────────────────────────
        elif entity_type == "flight" and date:
            flight = conn.execute(
                text("SELECT * FROM flights WHERE flight_id = :id"), {"id": entity_id}
            ).fetchone()
            if not flight:
                raise HTTPException(404, "Không tìm thấy chuyến bay")
            fd = dict(flight._mapping)
            airline = fd["airline"]

            # Kiểm tra policy của hạng ghế hiện tại
            cur_policy = _get_policy(conn, "flight", airline, seat_class or "economy")
            if not cur_policy["allows_reschedule"]:
                raise HTTPException(400, f"Loại vé {seat_class} của {airline} không được đổi lịch")

            # Kiểm tra thời hạn
            depart_dt = dt.fromisoformat(str(fd["depart_time"]))
            hours_left = (depart_dt - dt.now()).total_seconds() / 3600
            if hours_left < cur_policy["min_hours_before"]:
                raise HTTPException(400, f"Chỉ còn {hours_left:.0f}h trước giờ bay, không thể đổi lịch")

            rows = conn.execute(text("""
                SELECT f.*,
                    TIMESTAMPDIFF(MINUTE, f.depart_time, f.arrive_time) AS duration_minutes
                FROM flights f
                WHERE f.airline = :airline AND f.from_city = :fc AND f.to_city = :tc
                AND DATE(f.depart_time) = :date AND f.status = 'active' AND f.flight_id != :cur
                ORDER BY f.depart_time ASC
            """), {"airline": airline, "fc": fd["from_city"], "tc": fd["to_city"],
                   "date": date, "cur": entity_id}).fetchall()

            # Gắn thêm classes + policy cho mỗi chuyến
            options = []
            for r in rows:
                rd = dict(r._mapping)
                rd["classes"] = _classes_for_flight(conn, rd["flight_id"], float(rd["price"]))
                # Gắn policy cho từng class
                for cls_info in rd["classes"]:
                    p = _get_policy(conn, "flight", airline, cls_info["seat_class"])
                    cls_info["allows_reschedule"]      = p["allows_reschedule"]
                    cls_info["reschedule_fee_percent"]  = p["reschedule_fee_percent"]
                    cls_info["refund_on_downgrade"]     = p["refund_on_downgrade"]
                options.append(rd)

            return {
                "entity_type":   "flight",
                "old_price":     old_price,
                "old_seat_class": seat_class,
                "old_entity":    fd,
                "current_policy": cur_policy,
                "options": options,
            }

        # ── XE KHÁCH ────────────────────────────────────────────
        elif entity_type == "bus" and date:
            bus = conn.execute(
                text("SELECT * FROM buses WHERE bus_id = :id"), {"id": entity_id}
            ).fetchone()
            if not bus:
                raise HTTPException(404, "Không tìm thấy chuyến xe")
            bd = dict(bus._mapping)
            company = bd["company"]

            cur_policy = _get_policy(conn, "bus", company, seat_class or "standard")
            if not cur_policy["allows_reschedule"]:
                raise HTTPException(400, f"Loại vé {seat_class} của {company} không được đổi lịch")

            depart_dt = dt.fromisoformat(str(bd["depart_time"]))
            hours_left = (depart_dt - dt.now()).total_seconds() / 3600
            if hours_left < cur_policy["min_hours_before"]:
                raise HTTPException(400, f"Chỉ còn {hours_left:.0f}h trước giờ khởi hành, không thể đổi lịch")

            rows = conn.execute(text("""
                SELECT b.*,
                    TIMESTAMPDIFF(MINUTE, b.depart_time, b.arrive_time) AS duration_minutes
                FROM buses b
                WHERE b.company = :company AND b.from_city = :fc AND b.to_city = :tc
                AND DATE(b.depart_time) = :date AND b.status = 'active' AND b.bus_id != :cur
                ORDER BY b.depart_time ASC
            """), {"company": company, "fc": bd["from_city"], "tc": bd["to_city"],
                   "date": date, "cur": entity_id}).fetchall()

            options = []
            for r in rows:
                rd = dict(r._mapping)
                rd["classes"] = _classes_for_bus(conn, rd["bus_id"], float(rd["price"]))
                for cls_info in rd["classes"]:
                    p = _get_policy(conn, "bus", company, cls_info["seat_class"])
                    cls_info["allows_reschedule"]     = p["allows_reschedule"]
                    cls_info["reschedule_fee_percent"] = p["reschedule_fee_percent"]
                    cls_info["refund_on_downgrade"]    = p["refund_on_downgrade"]
                options.append(rd)

            return {
                "entity_type":    "bus",
                "old_price":      old_price,
                "old_seat_class": seat_class,
                "old_entity":     bd,
                "current_policy": cur_policy,
                "options": options,
            }

        # ── TÀU HỎA ─────────────────────────────────────────────
        elif entity_type == "train" and date:
            train = conn.execute(
                text("SELECT * FROM trains WHERE train_id = :id"), {"id": entity_id}
            ).fetchone()
            if not train:
                raise HTTPException(404, "Không tìm thấy chuyến tàu")
            td = dict(train._mapping)
            carrier = "Đường sắt Việt Nam"

            cur_policy = _get_policy(conn, "train", carrier, seat_class or "hard_seat")
            if not cur_policy["allows_reschedule"]:
                raise HTTPException(400, f"Loại vé {seat_class} không được đổi lịch")

            depart_dt = dt.fromisoformat(str(td["depart_time"]))
            hours_left = (depart_dt - dt.now()).total_seconds() / 3600
            if hours_left < cur_policy["min_hours_before"]:
                raise HTTPException(400, f"Chỉ còn {hours_left:.0f}h trước giờ tàu, không thể đổi lịch")

            rows = conn.execute(text("""
                SELECT t.*,
                    TIMESTAMPDIFF(MINUTE, t.depart_time, t.arrive_time) AS duration_minutes
                FROM trains t
                WHERE t.from_city = :fc AND t.to_city = :tc
                AND DATE(t.depart_time) = :date AND t.status = 'active' AND t.train_id != :cur
                ORDER BY t.depart_time ASC
            """), {"fc": td["from_city"], "tc": td["to_city"],
                   "date": date, "cur": entity_id}).fetchall()

            options = []
            for r in rows:
                rd = dict(r._mapping)
                rd["classes"] = _classes_for_train(conn, rd["train_id"])
                for cls_info in rd["classes"]:
                    p = _get_policy(conn, "train", carrier, cls_info["seat_class"])
                    cls_info["allows_reschedule"]     = p["allows_reschedule"]
                    cls_info["reschedule_fee_percent"] = p["reschedule_fee_percent"]
                    cls_info["refund_on_downgrade"]    = p["refund_on_downgrade"]
                options.append(rd)

            return {
                "entity_type":    "train",
                "old_price":      old_price,
                "old_seat_class": seat_class,
                "old_entity":     td,
                "current_policy": cur_policy,
                "options": options,
            }

        raise HTTPException(400, "Thiếu thông tin ngày mới")


# ── RESCHEDULE SUBMIT ───────────────────────────────────────────
class RescheduleRequest(BaseModel):
    new_entity_id:  int | None = None
    new_check_in:   str | None = None
    new_check_out:  str | None = None
    new_seat_class: str | None = None   # None = giữ nguyên hạng cũ
    new_price:      float
    refund_method:  str = "wallet"
    bank_info:      str | None = None


def _transfer_seats(conn, entity_type: str, old_entity_id: int, new_entity_id: int,
                    old_seat_class: str, new_seat_class: str, quantity: int):
    """Release ghế cũ, book ghế mới — trong cùng transaction."""
    if entity_type == "flight":
        # Release ghế cũ
        old_seats = conn.execute(text("""
            SELECT seat_id FROM flight_seats
            WHERE flight_id = :fid AND seat_class = :cls AND is_booked = 1 LIMIT :n
        """), {"fid": old_entity_id, "cls": old_seat_class, "n": quantity}).fetchall()
        if old_seats:
            ids = ",".join(str(r.seat_id) for r in old_seats)
            conn.execute(text(f"UPDATE flight_seats SET is_booked = 0 WHERE seat_id IN ({ids})"))
        # Book ghế mới
        new_seats = conn.execute(text("""
            SELECT seat_id FROM flight_seats
            WHERE flight_id = :fid AND seat_class = :cls AND is_booked = 0 LIMIT :n
        """), {"fid": new_entity_id, "cls": new_seat_class, "n": quantity}).fetchall()
        if not new_seats:
            raise HTTPException(400, f"Chuyến bay mới không còn ghế {new_seat_class}")
        ids = ",".join(str(r.seat_id) for r in new_seats)
        conn.execute(text(f"UPDATE flight_seats SET is_booked = 1 WHERE seat_id IN ({ids})"))

    elif entity_type == "bus":
        old_seats = conn.execute(text("""
            SELECT seat_id FROM bus_seats
            WHERE bus_id = :bid AND seat_class = :cls AND is_booked = 1 LIMIT :n
        """), {"bid": old_entity_id, "cls": old_seat_class, "n": quantity}).fetchall()
        if old_seats:
            ids = ",".join(str(r.seat_id) for r in old_seats)
            conn.execute(text(f"UPDATE bus_seats SET is_booked = 0 WHERE seat_id IN ({ids})"))
        new_seats = conn.execute(text("""
            SELECT seat_id FROM bus_seats
            WHERE bus_id = :bid AND seat_class = :cls AND is_booked = 0 LIMIT :n
        """), {"bid": new_entity_id, "cls": new_seat_class, "n": quantity}).fetchall()
        if not new_seats:
            raise HTTPException(400, f"Chuyến xe mới không còn ghế {new_seat_class}")
        ids = ",".join(str(r.seat_id) for r in new_seats)
        conn.execute(text(f"UPDATE bus_seats SET is_booked = 1 WHERE seat_id IN ({ids})"))

    elif entity_type == "train":
        old_seats = conn.execute(text("""
            SELECT seat_id FROM train_seats
            WHERE train_id = :tid AND seat_class = :cls AND is_booked = 1 LIMIT :n
        """), {"tid": old_entity_id, "cls": old_seat_class, "n": quantity}).fetchall()
        if old_seats:
            ids = ",".join(str(r.seat_id) for r in old_seats)
            conn.execute(text(f"UPDATE train_seats SET is_booked = 0 WHERE seat_id IN ({ids})"))
        new_seats = conn.execute(text("""
            SELECT seat_id FROM train_seats
            WHERE train_id = :tid AND seat_class = :cls AND is_booked = 0 LIMIT :n
        """), {"tid": new_entity_id, "cls": new_seat_class, "n": quantity}).fetchall()
        if not new_seats:
            raise HTTPException(400, f"Chuyến tàu mới không còn ghế {new_seat_class}")
        ids = ",".join(str(r.seat_id) for r in new_seats)
        conn.execute(text(f"UPDATE train_seats SET is_booked = 1 WHERE seat_id IN ({ids})"))


@router.post("/{booking_id}/reschedule")
def reschedule_booking(booking_id: int, data: RescheduleRequest, user_id: int = Depends(get_current_user)):
    with engine.begin() as conn:
        booking = conn.execute(
            text("SELECT * FROM bookings WHERE booking_id = :id AND user_id = :uid AND status = 'confirmed'"),
            {"id": booking_id, "uid": user_id},
        ).fetchone()
        if not booking:
            raise HTTPException(404, "Booking không tồn tại hoặc không thể đổi lịch")

        item = conn.execute(
            text("SELECT * FROM booking_items WHERE booking_id = :id LIMIT 1"), {"id": booking_id}
        ).fetchone()
        if not item:
            raise HTTPException(404, "Không tìm thấy thông tin đặt chỗ")
        item_d = dict(item._mapping)

        entity_type    = item_d["entity_type"]
        old_entity_id  = item_d["entity_id"]
        old_seat_class = item_d.get("seat_class") or ""
        new_seat_class = data.new_seat_class or old_seat_class
        quantity       = item_d.get("quantity") or 1

        # Kiểm tra đã quá ngày chưa
        ci_raw = item_d.get("check_in_date")
        if ci_raw:
            ci_date = ci_raw if isinstance(ci_raw, ddate) else ddate.fromisoformat(str(ci_raw))
            if ci_date < ddate.today():
                raise HTTPException(400, "Không thể đổi lịch booking đã quá ngày sử dụng")

        # ── Tính toán giá (backend tự tính, không tin frontend) ─
        old_price = float(dict(booking._mapping)["final_amount"])
        new_price = float(data.new_price)   # frontend gửi giá đúng từ reschedule-options
        raw_diff  = round(new_price - old_price, 2)

        if entity_type == "room":
            # Phòng khách sạn: phí đổi lịch theo thời gian + hạng thành viên
            user_row = conn.execute(
                text("SELECT user_rank FROM users WHERE user_id = :uid"), {"uid": user_id}
            ).fetchone()
            user_rank = dict(user_row._mapping).get("user_rank", "bronze") if user_row else "bronze"

            ci_raw_r = item_d.get("check_in_date")
            if ci_raw_r:
                old_ci = ci_raw_r if isinstance(ci_raw_r, ddate) else ddate.fromisoformat(str(ci_raw_r))
                old_ci_dt = dt.combine(old_ci, dt.min.time().replace(hour=14))
                hours_until = (old_ci_dt - dt.now()).total_seconds() / 3600
            else:
                hours_until = 999.0

            fee_info = _hotel_reschedule_fee(hours_until, user_rank)
            if not fee_info["allowed"]:
                raise HTTPException(400, fee_info["note"])

            reschedule_fee = round(old_price * fee_info["fee_percent"] / 100, 0)

            # Kiểm tra allows_refund của khách sạn
            hr = conn.execute(text("""
                SELECT h.allows_refund FROM room_types rt
                JOIN hotels h ON h.hotel_id = rt.hotel_id
                WHERE rt.room_type_id = :id
            """), {"id": old_entity_id}).fetchone()
            refund_on_dgrade = bool(hr.allows_refund) if hr else True

        else:
            # Vận tải: tra transport_policies
            carrier = ""
            if entity_type == "flight":
                row = conn.execute(text("SELECT airline FROM flights WHERE flight_id = :id"),
                                   {"id": old_entity_id}).fetchone()
                carrier = row.airline if row else ""
            elif entity_type == "bus":
                row = conn.execute(text("SELECT company FROM buses WHERE bus_id = :id"),
                                   {"id": old_entity_id}).fetchone()
                carrier = row.company if row else ""
            elif entity_type == "train":
                carrier = "Đường sắt Việt Nam"

            policy = _get_policy(conn, entity_type, carrier, new_seat_class or old_seat_class or "economy")
            if not policy["allows_reschedule"]:
                raise HTTPException(400, "Loại vé này không được phép đổi lịch theo chính sách hãng")

            reschedule_fee   = round(old_price * float(policy["reschedule_fee_percent"]) / 100, 0)
            refund_on_dgrade = bool(policy["refund_on_downgrade"])

        # Xác định refund_amount dựa trên refund_on_downgrade
        if raw_diff < 0 and not refund_on_dgrade:
            # Không hoàn chênh lệch, chỉ thu phí đổi
            amount_to_pay   = reschedule_fee
            refund_amount   = 0.0
        elif raw_diff < 0:
            # Được hoàn, trừ phí đổi
            refund_amount   = max(0.0, abs(raw_diff) - reschedule_fee)
            amount_to_pay   = 0.0
        else:
            # Vé đắt hơn: trả thêm chênh lệch + phí đổi
            amount_to_pay   = raw_diff + reschedule_fee
            refund_amount   = 0.0

        new_entity_id = data.new_entity_id or old_entity_id

        # ── Helper: áp dụng thay đổi vào booking ───────────────
        def _apply(conn_):
            # Transfer ghế nếu là vận tải
            if entity_type in ("flight", "bus", "train"):
                _transfer_seats(conn_, entity_type, old_entity_id, new_entity_id,
                                old_seat_class or new_seat_class, new_seat_class, quantity)
            conn_.execute(
                text("UPDATE booking_items SET entity_id = :eid, seat_class = :sc, price = :np WHERE booking_id = :bid"),
                {"eid": new_entity_id, "sc": new_seat_class, "np": new_price, "bid": booking_id},
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

        mod_base = {
            "bid": booking_id, "uid": user_id,
            "neid": new_entity_id, "nsc": new_seat_class,
            "nci": data.new_check_in, "nco": data.new_check_out,
            "op": old_price, "np": new_price,
            "diff": raw_diff, "rfee": reschedule_fee,
        }

        if amount_to_pay < 1 and refund_amount < 1:
            # Không thu không hoàn → áp dụng ngay
            _apply(conn)
            conn.execute(text("""
                INSERT INTO booking_modifications
                    (booking_id, user_id, type, status, new_entity_id, new_seat_class,
                     new_check_in, new_check_out, old_price, new_price, price_diff, reschedule_fee)
                VALUES (:bid, :uid, 'reschedule', 'approved', :neid, :nsc,
                        :nci, :nco, :op, :np, :diff, :rfee)
            """), mod_base)
            return {"status": "confirmed", "message": "Đổi lịch thành công!"}

        elif amount_to_pay >= 1:
            # Cần thu thêm tiền → pending
            res = conn.execute(text("""
                INSERT INTO booking_modifications
                    (booking_id, user_id, type, status, new_entity_id, new_seat_class,
                     new_check_in, new_check_out, old_price, new_price, price_diff, reschedule_fee)
                VALUES (:bid, :uid, 'reschedule', 'pending', :neid, :nsc,
                        :nci, :nco, :op, :np, :diff, :rfee)
            """), mod_base)
            return {
                "status": "needs_payment", "mod_id": res.lastrowid,
                "price_diff": amount_to_pay,
                "reschedule_fee": reschedule_fee,
                "message": f"Cần thanh toán thêm {amount_to_pay:,.0f}₫ (gồm phí đổi lịch {reschedule_fee:,.0f}₫)" if reschedule_fee > 0
                           else f"Cần thanh toán thêm {amount_to_pay:,.0f}₫",
            }

        else:
            # Hoàn tiền cho user
            _apply(conn)
            mod_base.update({"ra": refund_amount, "rm": data.refund_method, "bi": data.bank_info})
            if data.refund_method == "wallet":
                conn.execute(text("UPDATE users SET wallet = wallet + :amt WHERE user_id = :uid"),
                             {"amt": refund_amount, "uid": user_id})
                conn.execute(text("""
                    INSERT INTO wallet_transactions (user_id, amount, type, description, status)
                    VALUES (:uid, :amt, 'refund', :desc, 'success')
                """), {"uid": user_id, "amt": refund_amount, "desc": f"Hoàn tiền đổi lịch #{booking_id}"})
                conn.execute(text("""
                    INSERT INTO booking_modifications
                        (booking_id, user_id, type, status, new_entity_id, new_seat_class,
                         new_check_in, new_check_out, old_price, new_price, price_diff,
                         reschedule_fee, refund_amount, refund_method)
                    VALUES (:bid, :uid, 'reschedule', 'approved', :neid, :nsc,
                            :nci, :nco, :op, :np, :diff, :rfee, :ra, 'wallet')
                """), mod_base)
                return {"status": "confirmed",
                        "message": f"Đổi lịch thành công! Hoàn {refund_amount:,.0f}₫ vào ví."}
            else:
                conn.execute(text("""
                    INSERT INTO booking_modifications
                        (booking_id, user_id, type, status, new_entity_id, new_seat_class,
                         new_check_in, new_check_out, old_price, new_price, price_diff,
                         reschedule_fee, refund_amount, refund_method, bank_info)
                    VALUES (:bid, :uid, 'reschedule', 'pending', :neid, :nsc,
                            :nci, :nco, :op, :np, :diff, :rfee, :ra, 'bank', :bi)
                """), mod_base)
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
        # Cập nhật price trong booking_items để lần đổi lịch tiếp theo tính đúng old_price
        conn.execute(text("UPDATE booking_items SET price = :np WHERE booking_id = :bid"),
                     {"np": float(mod_d["new_price"]), "bid": booking_id})

        # Mark approved
        conn.execute(text("UPDATE booking_modifications SET status = 'approved' WHERE mod_id = :id"),
                     {"id": mod_id})

        return {"message": "Đổi lịch thành công!", "new_balance": balance - price_diff}


# ── Helper: tính cancel_fee dựa theo transport_policy hoặc rank ─
def _calc_cancel_fee(conn, entity_type: str, item_d: dict, total_price: float,
                     user_rank: str) -> dict:
    """Trả về dict chứa cancel_fee, additional_fee, refund_amount, non_refundable, policy_note."""
    seat_class   = item_d.get("seat_class") or ""
    check_in_raw = item_d.get("check_in_date")

    if entity_type in ("flight", "bus", "train"):
        eid = item_d["entity_id"]
        if entity_type == "flight":
            r = conn.execute(text("SELECT airline FROM flights WHERE flight_id=:id"), {"id": eid}).fetchone()
            carrier = r.airline if r else ""
        elif entity_type == "bus":
            r = conn.execute(text("SELECT company FROM buses WHERE bus_id=:id"), {"id": eid}).fetchone()
            carrier = r.company if r else ""
        else:
            carrier = "Đường sắt Việt Nam"

        policy = _get_policy(conn, entity_type, carrier, seat_class or "economy")

        if not policy["allows_cancel"]:
            raise HTTPException(400, f"Loại vé {seat_class} của {carrier} không được phép hủy")

        # Kiểm tra min_hours_before
        if check_in_raw:
            depart_dt = dt.fromisoformat(str(check_in_raw)) if "T" in str(check_in_raw) \
                        else dt.combine(ddate.fromisoformat(str(check_in_raw)), __import__("datetime").time())
            hours_left = (depart_dt - dt.now()).total_seconds() / 3600
            if hours_left < 0:
                raise HTTPException(400, "Không thể hủy booking đã quá giờ khởi hành")

        refund_on_cancel  = bool(policy.get("refund_on_cancel", True))
        cancel_fee_pct    = float(policy["cancel_fee_percent"])
        additional_fee    = round(total_price * cancel_fee_pct / 100, 2)

        if refund_on_cancel:
            # Hoàn vé bình thường: hoàn lại tiền trừ phí hủy
            cancel_fee    = additional_fee
            refund_amount = max(0.0, total_price - cancel_fee)
            additional_fee = 0.0
            note = (f"{carrier} ({CLASS_LABEL_VN.get(seat_class, seat_class)}): "
                    f"phí hủy {cancel_fee_pct:.0f}%"
                    if cancel_fee_pct > 0 else f"{carrier}: miễn phí hủy")
        else:
            # Không hoàn vé: mất toàn bộ tiền vé, không thu thêm phí hủy
            cancel_fee     = total_price
            additional_fee = 0.0
            refund_amount  = 0.0
            note = (f"{carrier} ({CLASS_LABEL_VN.get(seat_class, seat_class)}): "
                    f"vé KHÔNG HOÀN TIỀN — mất toàn bộ {total_price:,.0f}₫")

        return {
            "cancel_fee":      cancel_fee,
            "additional_fee":  additional_fee,
            "refund_amount":   refund_amount,
            "non_refundable":  not refund_on_cancel,
            "policy_note":     note,
        }

    else:
        # Phòng khách sạn → kiểm tra allows_refund rồi dùng rank-based fee
        eid = item_d.get("entity_id")
        allows_refund = True
        hotel_name    = ""
        if eid:
            hr = conn.execute(text("""
                SELECT h.allows_refund, h.name FROM room_types rt
                JOIN hotels h ON h.hotel_id = rt.hotel_id
                WHERE rt.room_type_id = :id
            """), {"id": eid}).fetchone()
            if hr:
                allows_refund = bool(hr.allows_refund)
                hotel_name    = hr.name or ""

        if not allows_refund:
            # Khách sạn không hoàn tiền — mất toàn bộ
            note = f"{hotel_name}: KHÔNG HOÀN TIỀN khi hủy — mất toàn bộ {total_price:,.0f}₫"
            return {"cancel_fee": total_price, "additional_fee": 0.0, "refund_amount": 0.0,
                    "non_refundable": True, "policy_note": note}

        if not check_in_raw:
            return {"cancel_fee": 0.0, "additional_fee": 0.0, "refund_amount": total_price,
                    "non_refundable": False, "policy_note": "Miễn phí hủy"}
        try:
            svc_date   = check_in_raw if isinstance(check_in_raw, ddate) else ddate.fromisoformat(str(check_in_raw))
            days_until = (svc_date - ddate.today()).days
            rate, note = get_cancel_fee_rate(user_rank, days_until, entity_type)
            cancel_fee = round(total_price * rate, 2)
            if hotel_name:
                note = f"{hotel_name}: {note}"
            return {"cancel_fee": cancel_fee, "additional_fee": 0.0,
                    "refund_amount": max(0.0, total_price - cancel_fee),
                    "non_refundable": False, "policy_note": note}
        except Exception:
            return {"cancel_fee": 0.0, "additional_fee": 0.0, "refund_amount": total_price,
                    "non_refundable": False, "policy_note": "Miễn phí hủy"}

# ── POLICY CHO BOOKING ─────────────────────────────────────────
@router.get("/{booking_id}/policy")
def get_booking_policy(booking_id: int, user_id: int = Depends(get_current_user)):
    """Trả về policy đổi lịch / hủy cho booking này."""
    with engine.connect() as conn:
        item = conn.execute(
            text("""
                SELECT bi.entity_type, bi.entity_id, bi.seat_class
                FROM booking_items bi
                JOIN bookings b ON b.booking_id = bi.booking_id
                WHERE bi.booking_id = :bid AND b.user_id = :uid LIMIT 1
            """),
            {"bid": booking_id, "uid": user_id}
        ).fetchone()
        if not item:
            raise HTTPException(404, "Không tìm thấy booking")

        item_d      = dict(item._mapping)
        entity_type = item_d["entity_type"]
        seat_class  = item_d.get("seat_class") or ""
        eid         = item_d["entity_id"]

        if entity_type not in ("flight", "bus", "train"):
            # Phòng khách sạn không có policy cứng → mặc định cho phép tất cả
            return {"allows_reschedule": True, "allows_cancel": True,
                    "reschedule_fee_percent": 0, "cancel_fee_percent": 0,
                    "refund_on_downgrade": True, "min_hours_before": 0}

        if entity_type == "flight":
            r = conn.execute(text("SELECT airline FROM flights WHERE flight_id=:id"), {"id": eid}).fetchone()
            carrier = r.airline if r else ""
        elif entity_type == "bus":
            r = conn.execute(text("SELECT company FROM buses WHERE bus_id=:id"), {"id": eid}).fetchone()
            carrier = r.company if r else ""
        else:
            carrier = "Đường sắt Việt Nam"

        return _get_policy(conn, entity_type, carrier, seat_class or "economy")

# ── CANCEL BOOKING ──────────────────────────────────────────────
@router.get("/{booking_id}/cancel-preview")
def preview_cancel_booking(booking_id: int, user_id: int = Depends(get_current_user)):
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
        item_d      = dict(item._mapping)
        entity_type = item_d["entity_type"]

        check_in_raw = item_d.get("check_in_date")
        if check_in_raw:
            svc_date = check_in_raw if isinstance(check_in_raw, ddate) else ddate.fromisoformat(str(check_in_raw))
            if svc_date < ddate.today():
                raise HTTPException(400, "Không thể hủy booking đã quá ngày sử dụng")

        user_row  = conn.execute(
            text("SELECT COALESCE(user_rank, 'bronze') AS user_rank FROM users WHERE user_id = :uid"),
            {"uid": user_id}
        ).fetchone()
        user_rank = (dict(user_row._mapping)["user_rank"] if user_row else "bronze")

        result = _calc_cancel_fee(conn, entity_type, item_d, total_price, user_rank)
        return {
            "total_price":    total_price,
            "cancel_fee":     result["cancel_fee"],
            "additional_fee": result["additional_fee"],
            "refund_amount":  result["refund_amount"],
            "non_refundable": result["non_refundable"],
            "policy_note":    result["policy_note"],
        }

class CancelRequest(BaseModel):
    refund_method: str = "wallet"
    bank_info:     str | None = None


@router.post("/{booking_id}/cancel")
def cancel_booking(booking_id: int, data: CancelRequest, background_tasks: BackgroundTasks, user_id: int = Depends(get_current_user)):
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

        # Lấy rank + email của user
        user_row = conn.execute(
            text("SELECT COALESCE(user_rank, 'bronze') AS user_rank, email, full_name FROM users WHERE user_id = :uid"),
            {"uid": user_id}
        ).fetchone()
        user_row_d = dict(user_row._mapping) if user_row else {}
        user_rank = user_row_d.get("user_rank", "bronze")
        user_email = user_row_d.get("email", "")
        user_name = user_row_d.get("full_name") or "Quý khách"

        # Lấy tên dịch vụ
        svc_name_row = conn.execute(text("""
            SELECT CASE bi.entity_type
                WHEN 'room'   THEN CONCAT(h.name, ' - ', rt.name)
                WHEN 'flight' THEN CONCAT(f.airline, ': ', f.from_city, ' → ', f.to_city)
                WHEN 'bus'    THEN CONCAT(bs.company, ': ', bs.from_city, ' → ', bs.to_city)
                WHEN 'train'  THEN CONCAT('Tàu ', t.train_code, ': ', t.from_city, ' → ', t.to_city)
                ELSE CONCAT(bi.entity_type, ' #', bi.entity_id)
            END AS service_name
            FROM booking_items bi
            LEFT JOIN room_types rt ON rt.room_type_id = bi.entity_id AND bi.entity_type = 'room'
            LEFT JOIN hotels h ON h.hotel_id = rt.hotel_id
            LEFT JOIN flights f ON f.flight_id = bi.entity_id AND bi.entity_type = 'flight'
            LEFT JOIN buses bs ON bs.bus_id = bi.entity_id AND bi.entity_type = 'bus'
            LEFT JOIN trains t ON t.train_id = bi.entity_id AND bi.entity_type = 'train'
            WHERE bi.booking_id = :bid LIMIT 1
        """), {"bid": booking_id}).fetchone()
        service_name = dict(svc_name_row._mapping)["service_name"] if svc_name_row else f"Đặt chỗ #{booking_id}"

        # Kiểm tra đã quá ngày chưa
        check_in_raw = item_d.get("check_in_date")
        if check_in_raw:
            svc_date_c = check_in_raw if isinstance(check_in_raw, ddate) else ddate.fromisoformat(str(check_in_raw))
            if svc_date_c < ddate.today():
                raise HTTPException(400, "Không thể hủy booking đã quá ngày sử dụng")

        # Calculate cancel fee theo policy (transport) hoặc rank (room)
        fee_result    = _calc_cancel_fee(conn, entity_type, item_d, total_price, user_rank)
        cancel_fee    = fee_result["cancel_fee"]
        additional_fee = fee_result["additional_fee"]
        refund_amount = fee_result["refund_amount"]
        non_refundable = fee_result["non_refundable"]

        # Cancel booking
        conn.execute(text("UPDATE bookings SET status = 'cancelled' WHERE booking_id = :id"), {"id": booking_id})

        # Restore inventory
        if entity_type == "bus":
            booked_bus_seats = conn.execute(
                text("SELECT seat_id FROM bus_seats WHERE bus_id = :eid AND is_booked = 1 LIMIT :n"),
                {"eid": item_d["entity_id"], "n": item_d["quantity"]}
            ).fetchall()
            seat_ids = [str(r.seat_id) for r in booked_bus_seats]
            if seat_ids:
                conn.execute(text(f"UPDATE bus_seats SET is_booked = 0 WHERE seat_id IN ({','.join(seat_ids)})"))
        elif entity_type == "flight":
            booked_flight_seats = conn.execute(
                text("SELECT seat_id FROM flight_seats WHERE flight_id = :eid AND is_booked = 1 LIMIT :n"),
                {"eid": item_d["entity_id"], "n": item_d["quantity"]}
            ).fetchall()
            seat_ids = [str(r.seat_id) for r in booked_flight_seats]
            if seat_ids:
                conn.execute(text(f"UPDATE flight_seats SET is_booked = 0 WHERE seat_id IN ({','.join(seat_ids)})"))

        if refund_amount > 0 and data.refund_method == "wallet":
            # Hoàn tiền ngay vào ví — không cần admin duyệt
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
            create_notification(
                conn, user_id,
                type="booking_cancel",
                title="Đặt chỗ đã được hủy ❌",
                content=f"Đặt chỗ #{booking_id} đã hủy. {refund_amount:,.0f}₫ đã hoàn vào ví.",
                related_id=booking_id,
            )

        elif refund_amount > 0:
            # Hoàn về ngân hàng → chờ admin xử lý chuyển tiền
            conn.execute(text("""
                INSERT INTO booking_modifications
                    (booking_id, user_id, type, status, old_price, cancel_fee, refund_amount, refund_method, bank_info)
                VALUES (:bid, :uid, 'cancel', 'pending', :op, :cf, :ra, :rm, :bi)
            """), {"bid": booking_id, "uid": user_id, "op": total_price,
                   "cf": cancel_fee, "ra": refund_amount,
                   "rm": data.refund_method, "bi": data.bank_info})
            message = "Đặt chỗ đã được hủy. Tiền sẽ được hoàn về ngân hàng trong vòng 2–5 ngày."
            create_notification(
                conn, user_id,
                type="booking_cancel",
                title="Đặt chỗ đã được hủy ❌",
                content=f"Đặt chỗ #{booking_id} đã hủy. Hoàn {refund_amount:,.0f}₫ về ngân hàng trong 2–5 ngày.",
                related_id=booking_id,
            )

        else:
            # Không có tiền hoàn (non-refundable hoặc miễn phí) → ghi nhận ngay, không cần duyệt
            conn.execute(text("""
                INSERT INTO booking_modifications
                    (booking_id, user_id, type, status, old_price, cancel_fee, refund_amount, refund_method, bank_info)
                VALUES (:bid, :uid, 'cancel', 'approved', :op, :cf, 0, :rm, NULL)
            """), {"bid": booking_id, "uid": user_id, "op": total_price,
                   "cf": cancel_fee, "rm": data.refund_method})
            message = ("Đặt chỗ đã được hủy. Vé không hoàn tiền."
                       if non_refundable else "Đặt chỗ đã được hủy.")
            create_notification(
                conn, user_id,
                type="booking_cancel",
                title="Đặt chỗ đã được hủy ❌",
                content=f"Đặt chỗ #{booking_id} đã hủy." + (" Vé không hoàn tiền." if non_refundable else ""),
                related_id=booking_id,
            )

    # Gửi email thông báo hủy (ngoài transaction)
    if user_email:
        background_tasks.add_task(
            send_cancel_confirmation_email,
            email=user_email,
            name=user_name,
            booking_id=booking_id,
            service_name=service_name,
            refund_amount=refund_amount,
            cancel_fee=cancel_fee,
            refund_method=data.refund_method,
        )

    return {
        "status":          "cancelled",
        "cancel_fee":      cancel_fee,
        "additional_fee":  additional_fee,
        "refund_amount":   refund_amount,
        "non_refundable":  non_refundable,
        "message":         message,
    }


# ── CANCEL PENDING (hết thời gian thanh toán, chưa trả tiền) ────
@router.post("/{booking_id}/cancel-pending")
def cancel_pending_booking(booking_id: int, user_id: int = Depends(get_current_user)):
    with engine.begin() as conn:
        booking = conn.execute(
            text("SELECT booking_id FROM bookings WHERE booking_id = :id AND user_id = :uid AND status = 'pending'"),
            {"id": booking_id, "uid": user_id},
        ).fetchone()
        if not booking:
            raise HTTPException(404, "Booking không tồn tại hoặc đã được xử lý")
        conn.execute(
            text("UPDATE bookings SET status = 'cancelled' WHERE booking_id = :id"),
            {"id": booking_id}
        )
    return {"message": "Đặt chỗ đã bị hủy do hết thời gian thanh toán"}


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