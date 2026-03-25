from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy import text
from database import engine
from auth import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Kiểm tra quyền admin ────────────────────────────────────────
def get_admin_user(user_id: int = Depends(get_current_user)):
    with engine.connect() as conn:
        user = conn.execute(
            text("SELECT role FROM users WHERE user_id = :uid"),
            {"uid": user_id}
        ).fetchone()
        if not user or dict(user._mapping).get("role") != "ADMIN":
            raise HTTPException(403, "Không có quyền truy cập")
    return user_id


# ── STATS ───────────────────────────────────────────────────────
@router.get("/stats")
def get_stats(admin_id: int = Depends(get_admin_user)):
    with engine.connect() as conn:
        total_users    = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        total_bookings = conn.execute(text("SELECT COUNT(*) FROM bookings")).scalar()
        confirmed      = conn.execute(text("SELECT COUNT(*) FROM bookings WHERE status='confirmed'")).scalar()
        pending        = conn.execute(text("SELECT COUNT(*) FROM bookings WHERE status='pending'")).scalar()
        revenue        = conn.execute(text("SELECT COALESCE(SUM(final_amount),0) FROM bookings WHERE status='confirmed'")).scalar()
        total_hotels   = conn.execute(text("SELECT COUNT(*) FROM hotels")).scalar()
        total_flights  = conn.execute(text("SELECT COUNT(*) FROM flights")).scalar()
        total_buses    = conn.execute(text("SELECT COUNT(*) FROM buses")).scalar()

        # Doanh thu 7 ngày gần nhất
        revenue_7d = conn.execute(text("""
            SELECT DATE(booking_date) as day, COALESCE(SUM(final_amount),0) as total
            FROM bookings
            WHERE status='confirmed' AND booking_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(booking_date)
            ORDER BY day
        """)).fetchall()

    return {
        "total_users": total_users,
        "total_bookings": total_bookings,
        "confirmed_bookings": confirmed,
        "pending_bookings": pending,
        "total_revenue": float(revenue),
        "total_hotels": total_hotels,
        "total_flights": total_flights,
        "total_buses": total_buses,
        "revenue_7d": [{"day": str(r.day), "total": float(r.total)} for r in revenue_7d],
    }


# ── REVENUE CHART ───────────────────────────────────────────────
@router.get("/revenue")
def get_revenue(period: str = "7d", admin_id: int = Depends(get_admin_user)):
    with engine.connect() as conn:
        if period == "monthly":
            rows = conn.execute(text("""
                SELECT DATE_FORMAT(booking_date, '%Y-%m') as label,
                       COALESCE(SUM(final_amount), 0) as total
                FROM bookings
                WHERE status = 'confirmed'
                  AND booking_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                GROUP BY DATE_FORMAT(booking_date, '%Y-%m')
                ORDER BY label
            """)).fetchall()
        else:
            rows = conn.execute(text("""
                SELECT DATE(booking_date) as label,
                       COALESCE(SUM(final_amount), 0) as total
                FROM bookings
                WHERE status = 'confirmed'
                  AND booking_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY DATE(booking_date)
                ORDER BY label
            """)).fetchall()
    return [{"label": str(r.label), "total": float(r.total)} for r in rows]


# ── USERS ────────────────────────────────────────────────────────
@router.get("/users")
def get_all_users(admin_id: int = Depends(get_admin_user)):
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT user_id, full_name, email, phone, role, wallet, provider, created_at FROM users ORDER BY created_at DESC"
        )).fetchall()
    return [dict(r._mapping) for r in rows]


@router.put("/users/{user_id}/role")
def update_user_role(user_id: int, role: str, admin_id: int = Depends(get_admin_user)):
    if role not in ("USER", "ADMIN"):
        raise HTTPException(400, "Role không hợp lệ")
    with engine.begin() as conn:
        conn.execute(text("UPDATE users SET role = :role WHERE user_id = :uid"), {"role": role, "uid": user_id})
    return {"message": "Cập nhật role thành công"}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin_id: int = Depends(get_admin_user)):
    if user_id == admin_id:
        raise HTTPException(400, "Không thể xóa chính mình")
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM users WHERE user_id = :uid"), {"uid": user_id})
    return {"message": "Xóa người dùng thành công"}


class UserCreateRequest(BaseModel):
    full_name: str
    email: str
    password: str
    phone: Optional[str] = None
    role: Optional[str] = "USER"


class UserUpdateRequest(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    role: Optional[str] = "USER"
    new_password: Optional[str] = None  # nếu để trống thì không đổi mật khẩu


@router.put("/users/{user_id}")
def admin_update_user(user_id: int, data: UserUpdateRequest, admin_id: int = Depends(get_admin_user)):
    from auth import hash_password
    if data.role not in ("USER", "ADMIN"):
        raise HTTPException(400, "Role không hợp lệ")
    with engine.begin() as conn:
        # Kiểm tra email trùng với user khác
        existing = conn.execute(
            text("SELECT user_id FROM users WHERE email = :email AND user_id != :uid"),
            {"email": data.email, "uid": user_id}
        ).fetchone()
        if existing:
            raise HTTPException(400, "Email đã được dùng bởi tài khoản khác")

        fields = {
            "full_name": data.full_name,
            "email": data.email,
            "phone": data.phone,
            "role": data.role,
            "uid": user_id,
        }
        set_clause = "full_name=:full_name, email=:email, phone=:phone, role=:role"

        if data.new_password:
            if len(data.new_password) < 6:
                raise HTTPException(400, "Mật khẩu phải có ít nhất 6 ký tự")
            fields["password_hash"] = hash_password(data.new_password)
            set_clause += ", password_hash=:password_hash"

        conn.execute(
            text(f"UPDATE users SET {set_clause} WHERE user_id=:uid"),
            fields
        )
    return {"message": "Cập nhật người dùng thành công"}


@router.post("/users")
def admin_create_user(data: UserCreateRequest, admin_id: int = Depends(get_admin_user)):
    from auth import hash_password
    if data.role not in ("USER", "ADMIN"):
        raise HTTPException(400, "Role không hợp lệ")
    with engine.begin() as conn:
        existing = conn.execute(
            text("SELECT user_id FROM users WHERE email = :email"), {"email": data.email}
        ).fetchone()
        if existing:
            raise HTTPException(400, "Email đã tồn tại")
        hashed = hash_password(data.password)
        result = conn.execute(text("""
            INSERT INTO users (full_name, email, password_hash, phone, role, wallet, provider)
            VALUES (:name, :email, :password, :phone, :role, 0, 'local')
        """), {
            "name": data.full_name, "email": data.email, "password": hashed,
            "phone": data.phone, "role": data.role,
        })
    return {"user_id": result.lastrowid, "message": "Tạo người dùng thành công"}


# ── BOOKINGS ─────────────────────────────────────────────────────
@router.get("/bookings")
def get_all_bookings(admin_id: int = Depends(get_admin_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT
                b.booking_id, b.booking_date, b.status, b.total_price, b.final_amount,
                u.full_name AS user_name, u.email AS user_email,
                MAX(bi.entity_type) AS entity_type,
                MAX(CASE bi.entity_type
                    WHEN 'room'   THEN CONCAT(h.name, ' - ', rt.name)
                    WHEN 'flight' THEN CONCAT(f.airline, ': ', f.from_city, ' → ', f.to_city)
                    WHEN 'bus'    THEN CONCAT(bs.company, ': ', bs.from_city, ' → ', bs.to_city)
                    ELSE CONCAT(bi.entity_type, ' #', bi.entity_id)
                END) AS entity_name
            FROM bookings b
            JOIN users u ON u.user_id = b.user_id
            LEFT JOIN booking_items bi ON bi.booking_id = b.booking_id
            LEFT JOIN room_types rt ON rt.room_type_id = bi.entity_id AND bi.entity_type = 'room'
            LEFT JOIN hotels h ON h.hotel_id = rt.hotel_id
            LEFT JOIN flights f ON f.flight_id = bi.entity_id AND bi.entity_type = 'flight'
            LEFT JOIN buses bs ON bs.bus_id = bi.entity_id AND bi.entity_type = 'bus'
            GROUP BY b.booking_id, b.booking_date, b.status, b.total_price, b.final_amount,
                     u.full_name, u.email
            ORDER BY b.booking_date DESC
        """)).fetchall()
    return [dict(r._mapping) for r in rows]


@router.put("/bookings/{booking_id}/status")
def update_booking_status(booking_id: int, status: str, admin_id: int = Depends(get_admin_user)):
    if status not in ("pending", "confirmed", "cancelled"):
        raise HTTPException(400, "Status không hợp lệ")
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE bookings SET status = :status WHERE booking_id = :id"),
            {"status": status, "id": booking_id}
        )
    return {"message": "Cập nhật trạng thái thành công"}


# ── Helper: lưu ảnh vào bảng images ─────────────────────────────
def _save_image(conn, entity_type: str, entity_id: int, image_url: Optional[str]):
    """Xóa ảnh cũ rồi insert ảnh mới vào bảng images."""
    conn.execute(text(
        "DELETE FROM images WHERE entity_type=:et AND entity_id=:eid"
    ), {"et": entity_type, "eid": entity_id})
    if image_url:
        conn.execute(text(
            "INSERT INTO images (entity_type, entity_id, image_url) VALUES (:et, :eid, :url)"
        ), {"et": entity_type, "eid": entity_id, "url": image_url})


# ── HOTEL ROOM TYPES ─────────────────────────────────────────────
class RoomTypeRequest(BaseModel):
    name: str
    price_per_night: float
    max_guests: Optional[int] = 2
    image_url: Optional[str] = None


@router.get("/hotels/{hotel_id}/rooms")
def admin_get_rooms(hotel_id: int, admin_id: int = Depends(get_admin_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT rt.*,
                   (SELECT img.image_url FROM images img
                    WHERE img.entity_type='room_type' AND img.entity_id=rt.room_type_id LIMIT 1) AS image_url
            FROM room_types rt
            WHERE rt.hotel_id = :hid
            ORDER BY rt.price_per_night ASC
        """), {"hid": hotel_id}).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/hotels/{hotel_id}/rooms")
def admin_create_room(hotel_id: int, data: RoomTypeRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        result = conn.execute(text("""
            INSERT INTO room_types (hotel_id, name, price_per_night, max_guests)
            VALUES (:hid, :name, :price, :guests)
        """), {
            "hid": hotel_id, "name": data.name, "price": data.price_per_night,
            "guests": data.max_guests,
        })
        room_id = result.lastrowid
        _save_image(conn, "room_type", room_id, data.image_url)
    return {"room_type_id": room_id, "message": "Tạo loại phòng thành công"}


@router.put("/hotels/{hotel_id}/rooms/{room_type_id}")
def admin_update_room(hotel_id: int, room_type_id: int, data: RoomTypeRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE room_types SET name=:name, price_per_night=:price,
            max_guests=:guests
            WHERE room_type_id=:rid AND hotel_id=:hid
        """), {
            "name": data.name, "price": data.price_per_night,
            "guests": data.max_guests, "rid": room_type_id, "hid": hotel_id,
        })
        _save_image(conn, "room_type", room_type_id, data.image_url)
    return {"message": "Cập nhật loại phòng thành công"}


@router.delete("/hotels/{hotel_id}/rooms/{room_type_id}")
def admin_delete_room(hotel_id: int, room_type_id: int, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM images WHERE entity_type='room_type' AND entity_id=:id"), {"id": room_type_id})
        conn.execute(text("DELETE FROM room_types WHERE room_type_id=:rid AND hotel_id=:hid"),
                     {"rid": room_type_id, "hid": hotel_id})
    return {"message": "Xóa loại phòng thành công"}


# ── HOTELS ───────────────────────────────────────────────────────
class HotelRequest(BaseModel):
    name: str
    address: str
    destination_id: Optional[int] = None
    description: Optional[str] = None
    amenities: Optional[str] = None
    image_url: Optional[str] = None


@router.get("/hotels")
def admin_get_hotels(admin_id: int = Depends(get_admin_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT h.*, d.city AS dest_city,
                   (SELECT img.image_url FROM images img
                    WHERE img.entity_type='hotel' AND img.entity_id=h.hotel_id LIMIT 1) AS image_url
            FROM hotels h
            LEFT JOIN destinations d ON d.destination_id = h.destination_id
            ORDER BY h.hotel_id DESC
        """)).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/hotels")
def admin_create_hotel(data: HotelRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        result = conn.execute(text("""
            INSERT INTO hotels (name, address, destination_id, description, amenities)
            VALUES (:name, :address, :dest_id, :desc, :amenities)
        """), {
            "name": data.name, "address": data.address, "dest_id": data.destination_id,
            "desc": data.description, "amenities": data.amenities,
        })
        hotel_id = result.lastrowid
        _save_image(conn, "hotel", hotel_id, data.image_url)
    return {"hotel_id": hotel_id, "message": "Tạo khách sạn thành công"}


@router.put("/hotels/{hotel_id}")
def admin_update_hotel(hotel_id: int, data: HotelRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE hotels SET name=:name, address=:address, destination_id=:dest_id,
            description=:desc, amenities=:amenities WHERE hotel_id=:id
        """), {
            "name": data.name, "address": data.address, "dest_id": data.destination_id,
            "desc": data.description, "amenities": data.amenities, "id": hotel_id
        })
        _save_image(conn, "hotel", hotel_id, data.image_url)
    return {"message": "Cập nhật khách sạn thành công"}


@router.delete("/hotels/{hotel_id}")
def admin_delete_hotel(hotel_id: int, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM images WHERE entity_type='hotel' AND entity_id=:id"), {"id": hotel_id})
        conn.execute(text("DELETE FROM hotels WHERE hotel_id = :id"), {"id": hotel_id})
    return {"message": "Xóa khách sạn thành công"}


# ── FLIGHTS ──────────────────────────────────────────────────────
class FlightRequest(BaseModel):
    airline: str
    from_city: str
    to_city: str
    depart_time: str
    arrive_time: str
    price: float
    available_seats: Optional[int] = 100
    image_url: Optional[str] = None


@router.get("/flights")
def admin_get_flights(admin_id: int = Depends(get_admin_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT f.*,
                   (SELECT img.image_url FROM images img
                    WHERE img.entity_type='flight' AND img.entity_id=f.flight_id LIMIT 1) AS image_url
            FROM flights f
            ORDER BY f.flight_id DESC
        """)).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/flights")
def admin_create_flight(data: FlightRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        result = conn.execute(text("""
            INSERT INTO flights (airline, from_city, to_city, depart_time, arrive_time, price, available_seats)
            VALUES (:airline, :from_city, :to_city, :depart, :arrive, :price, :seats)
        """), {
            "airline": data.airline, "from_city": data.from_city, "to_city": data.to_city,
            "depart": data.depart_time, "arrive": data.arrive_time,
            "price": data.price, "seats": data.available_seats,
        })
        flight_id = result.lastrowid
        _save_image(conn, "flight", flight_id, data.image_url)
    return {"flight_id": flight_id, "message": "Tạo chuyến bay thành công"}


@router.put("/flights/{flight_id}")
def admin_update_flight(flight_id: int, data: FlightRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE flights SET airline=:airline, from_city=:from_city, to_city=:to_city,
            depart_time=:depart, arrive_time=:arrive, price=:price,
            available_seats=:seats WHERE flight_id=:id
        """), {
            "airline": data.airline, "from_city": data.from_city, "to_city": data.to_city,
            "depart": data.depart_time, "arrive": data.arrive_time,
            "price": data.price, "seats": data.available_seats, "id": flight_id
        })
        _save_image(conn, "flight", flight_id, data.image_url)
    return {"message": "Cập nhật chuyến bay thành công"}


@router.delete("/flights/{flight_id}")
def admin_delete_flight(flight_id: int, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM images WHERE entity_type='flight' AND entity_id=:id"), {"id": flight_id})
        conn.execute(text("DELETE FROM flights WHERE flight_id = :id"), {"id": flight_id})
    return {"message": "Xóa chuyến bay thành công"}


# ── BUSES ────────────────────────────────────────────────────────
class BusRequest(BaseModel):
    company: str
    from_city: str
    to_city: str
    depart_time: str
    arrive_time: str
    price: float
    available_seats: Optional[int] = 45
    image_url: Optional[str] = None


@router.get("/buses")
def admin_get_buses(admin_id: int = Depends(get_admin_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT b.*,
                   (SELECT img.image_url FROM images img
                    WHERE img.entity_type='bus' AND img.entity_id=b.bus_id LIMIT 1) AS image_url
            FROM buses b
            ORDER BY b.bus_id DESC
        """)).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/buses")
def admin_create_bus(data: BusRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        result = conn.execute(text("""
            INSERT INTO buses (company, from_city, to_city, depart_time, arrive_time, price, available_seats)
            VALUES (:company, :from_city, :to_city, :depart, :arrive, :price, :seats)
        """), {
            "company": data.company, "from_city": data.from_city, "to_city": data.to_city,
            "depart": data.depart_time, "arrive": data.arrive_time,
            "price": data.price, "seats": data.available_seats,
        })
        bus_id = result.lastrowid
        _save_image(conn, "bus", bus_id, data.image_url)
    return {"bus_id": bus_id, "message": "Tạo xe khách thành công"}


@router.put("/buses/{bus_id}")
def admin_update_bus(bus_id: int, data: BusRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE buses SET company=:company, from_city=:from_city, to_city=:to_city,
            depart_time=:depart, arrive_time=:arrive, price=:price,
            available_seats=:seats WHERE bus_id=:id
        """), {
            "company": data.company, "from_city": data.from_city, "to_city": data.to_city,
            "depart": data.depart_time, "arrive": data.arrive_time,
            "price": data.price, "seats": data.available_seats, "id": bus_id
        })
        _save_image(conn, "bus", bus_id, data.image_url)
    return {"message": "Cập nhật xe khách thành công"}


@router.delete("/buses/{bus_id}")
def admin_delete_bus(bus_id: int, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM images WHERE entity_type='bus' AND entity_id=:id"), {"id": bus_id})
        conn.execute(text("DELETE FROM buses WHERE bus_id = :id"), {"id": bus_id})
    return {"message": "Xóa xe khách thành công"}


# ── WITHDRAWAL REQUESTS ──────────────────────────────────────────
@router.get("/withdrawals")
def admin_list_withdrawals(admin_id: int = Depends(get_admin_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT wr.*, u.full_name, u.email
            FROM withdrawal_requests wr
            JOIN users u ON u.user_id = wr.user_id
            ORDER BY wr.created_at DESC
        """)).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/withdrawals/{withdrawal_id}/approve")
async def admin_approve_withdrawal(
    withdrawal_id: int,
    background_tasks: BackgroundTasks,
    admin_id: int = Depends(get_admin_user),
):
    from email_service import send_withdrawal_success_email

    user_email = None
    user_name = None
    amount = None

    with engine.begin() as conn:
        req = conn.execute(
            text("SELECT wr.*, u.full_name, u.email FROM withdrawal_requests wr JOIN users u ON u.user_id = wr.user_id WHERE wr.id = :id"),
            {"id": withdrawal_id}
        ).fetchone()
        if not req:
            raise HTTPException(404, "Không tìm thấy yêu cầu")
        req_dict = dict(req._mapping)
        if req_dict["status"] != "pending":
            raise HTTPException(400, "Yêu cầu này đã được xử lý")

        balance = conn.execute(
            text("SELECT wallet FROM users WHERE user_id = :uid"),
            {"uid": req_dict["user_id"]}
        ).scalar()
        if float(balance or 0) < float(req_dict["amount"]):
            raise HTTPException(400, "Số dư người dùng không đủ")

        # Trừ ví
        conn.execute(
            text("UPDATE users SET wallet = wallet - :amount WHERE user_id = :uid"),
            {"amount": req_dict["amount"], "uid": req_dict["user_id"]}
        )
        # Cập nhật trạng thái
        conn.execute(
            text("UPDATE withdrawal_requests SET status = 'completed' WHERE id = :id"),
            {"id": withdrawal_id}
        )
        # Ghi lịch sử
        conn.execute(text("""
            INSERT INTO wallet_transactions (user_id, amount, type, description, status)
            VALUES (:uid, :amount, 'withdrawal', :desc, 'success')
        """), {
            "uid": req_dict["user_id"],
            "amount": -float(req_dict["amount"]),
            "desc": f"Rút tiền về {req_dict['bank_name']} - TK {req_dict['account_no']}",
        })

        user_email = req_dict["email"]
        user_name = req_dict["full_name"]
        amount = float(req_dict["amount"])
        bank_info = f"{req_dict['bank_name']} - {req_dict['account_no']} ({req_dict['account_name']})"

    background_tasks.add_task(
        send_withdrawal_success_email, user_email, user_name, amount, bank_info
    )
    return {"success": True, "message": "Đã xác nhận chuyển tiền thành công"}


@router.post("/withdrawals/{withdrawal_id}/reject")
def admin_reject_withdrawal(withdrawal_id: int, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        req = conn.execute(
            text("SELECT status FROM withdrawal_requests WHERE id = :id"),
            {"id": withdrawal_id}
        ).fetchone()
        if not req:
            raise HTTPException(404, "Không tìm thấy yêu cầu")
        if dict(req._mapping)["status"] != "pending":
            raise HTTPException(400, "Yêu cầu này đã được xử lý")
        conn.execute(
            text("UPDATE withdrawal_requests SET status = 'rejected' WHERE id = :id"),
            {"id": withdrawal_id}
        )
    return {"success": True, "message": "Đã từ chối yêu cầu rút tiền"}


# ── PROMOTIONS ───────────────────────────────────────────────────
class PromotionRequest(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: str = "percent"           # 'percent' | 'fixed'
    discount_percent: Optional[float] = 0
    max_discount: Optional[float] = 0
    min_order_value: Optional[float] = 0
    usage_limit: Optional[int] = 100
    applies_to: Optional[str] = "all"        # 'all' | 'hotel' | 'flight' | 'bus'
    status: Optional[str] = "active"
    expired_at: Optional[str] = None


@router.get("/promotions")
def admin_get_promotions(admin_id: int = Depends(get_admin_user)):
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT * FROM promotions ORDER BY promo_id DESC"
        )).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/promotions")
def admin_create_promotion(data: PromotionRequest, admin_id: int = Depends(get_admin_user)):
    code = data.code.strip().upper()
    with engine.begin() as conn:
        exists = conn.execute(
            text("SELECT promo_id FROM promotions WHERE code = :code"), {"code": code}
        ).fetchone()
        if exists:
            raise HTTPException(400, f"Mã '{code}' đã tồn tại")
        result = conn.execute(text("""
            INSERT INTO promotions
                (code, description, discount_type, discount_percent, max_discount,
                 min_order_value, usage_limit, applies_to, status, expired_at)
            VALUES
                (:code, :desc, :dtype, :dpct, :maxd, :minv, :ulimit, :applies, :status, :exp)
        """), {
            "code": code, "desc": data.description, "dtype": data.discount_type,
            "dpct": data.discount_percent or 0, "maxd": data.max_discount or 0,
            "minv": data.min_order_value or 0, "ulimit": data.usage_limit or 100,
            "applies": data.applies_to or "all", "status": data.status or "active",
            "exp": data.expired_at,
        })
    return {"promo_id": result.lastrowid, "message": "Tạo mã giảm giá thành công"}


@router.put("/promotions/{promo_id}")
def admin_update_promotion(promo_id: int, data: PromotionRequest, admin_id: int = Depends(get_admin_user)):
    code = data.code.strip().upper()
    with engine.begin() as conn:
        # Check duplicate code (excluding self)
        exists = conn.execute(
            text("SELECT promo_id FROM promotions WHERE code = :code AND promo_id != :id"),
            {"code": code, "id": promo_id}
        ).fetchone()
        if exists:
            raise HTTPException(400, f"Mã '{code}' đã được dùng bởi promotion khác")
        conn.execute(text("""
            UPDATE promotions SET
                code=:code, description=:desc, discount_type=:dtype,
                discount_percent=:dpct, max_discount=:maxd,
                min_order_value=:minv, usage_limit=:ulimit,
                applies_to=:applies, status=:status, expired_at=:exp
            WHERE promo_id=:id
        """), {
            "code": code, "desc": data.description, "dtype": data.discount_type,
            "dpct": data.discount_percent or 0, "maxd": data.max_discount or 0,
            "minv": data.min_order_value or 0, "ulimit": data.usage_limit or 100,
            "applies": data.applies_to or "all", "status": data.status or "active",
            "exp": data.expired_at, "id": promo_id,
        })
    return {"message": "Cập nhật mã giảm giá thành công"}


@router.delete("/promotions/{promo_id}")
def admin_delete_promotion(promo_id: int, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM promotions WHERE promo_id = :id"), {"id": promo_id})
    return {"message": "Xóa mã giảm giá thành công"}


@router.put("/promotions/{promo_id}/toggle")
def admin_toggle_promotion(promo_id: int, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        promo = conn.execute(
            text("SELECT status FROM promotions WHERE promo_id = :id"), {"id": promo_id}
        ).fetchone()
        if not promo:
            raise HTTPException(404, "Không tìm thấy mã giảm giá")
        new_status = "inactive" if dict(promo._mapping)["status"] == "active" else "active"
        conn.execute(
            text("UPDATE promotions SET status=:s WHERE promo_id=:id"),
            {"s": new_status, "id": promo_id}
        )
    return {"status": new_status}


# ── BANNERS ──────────────────────────────────────────────────────
class BannerRequest(BaseModel):
    title: str
    subtitle: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    display_order: Optional[int] = 0
    is_active: Optional[int] = 1
    start_date: Optional[str] = None
    end_date: Optional[str] = None


@router.get("/banners")
def admin_get_banners(admin_id: int = Depends(get_admin_user)):
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT * FROM banners ORDER BY display_order ASC, banner_id DESC"
        )).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/banners")
def admin_create_banner(data: BannerRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        result = conn.execute(text("""
            INSERT INTO banners (title, subtitle, image_url, link_url, display_order, is_active, start_date, end_date)
            VALUES (:title, :subtitle, :image_url, :link_url, :order, :active, :start, :end)
        """), {
            "title": data.title, "subtitle": data.subtitle,
            "image_url": data.image_url, "link_url": data.link_url,
            "order": data.display_order or 0, "active": data.is_active if data.is_active is not None else 1,
            "start": data.start_date or None, "end": data.end_date or None,
        })
    return {"banner_id": result.lastrowid, "message": "Tạo banner thành công"}


@router.put("/banners/{banner_id}")
def admin_update_banner(banner_id: int, data: BannerRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE banners SET
                title=:title, subtitle=:subtitle, image_url=:image_url,
                link_url=:link_url, display_order=:order,
                is_active=:active, start_date=:start, end_date=:end
            WHERE banner_id=:id
        """), {
            "title": data.title, "subtitle": data.subtitle,
            "image_url": data.image_url, "link_url": data.link_url,
            "order": data.display_order or 0, "active": data.is_active if data.is_active is not None else 1,
            "start": data.start_date or None, "end": data.end_date or None, "id": banner_id,
        })
    return {"message": "Cập nhật banner thành công"}


@router.delete("/banners/{banner_id}")
def admin_delete_banner(banner_id: int, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM banners WHERE banner_id=:id"), {"id": banner_id})
    return {"message": "Xóa banner thành công"}


@router.put("/banners/{banner_id}/toggle")
def admin_toggle_banner(banner_id: int, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        current = conn.execute(
            text("SELECT is_active FROM banners WHERE banner_id=:id"), {"id": banner_id}
        ).fetchone()
        if not current:
            raise HTTPException(404, "Không tìm thấy banner")
        new_val = 0 if dict(current._mapping)["is_active"] else 1
        conn.execute(
            text("UPDATE banners SET is_active=:v WHERE banner_id=:id"),
            {"v": new_val, "id": banner_id}
        )
    return {"is_active": new_val}


# ── BOOKING MODIFICATIONS MANAGEMENT ───────────────────────────
@router.get("/modifications")
def get_modifications(admin_id: int = Depends(get_admin_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT m.*,
                u.full_name AS user_name, u.email AS user_email,
                CASE bi.entity_type
                    WHEN 'room'   THEN CONCAT(h.name, ' - ', rt.name)
                    WHEN 'flight' THEN CONCAT(f.airline, ': ', f.from_city, ' → ', f.to_city)
                    WHEN 'bus'    THEN CONCAT(bs.company, ': ', bs.from_city, ' → ', bs.to_city)
                    ELSE CONCAT(bi.entity_type, ' #', bi.entity_id)
                END AS entity_name,
                bi.entity_type
            FROM booking_modifications m
            JOIN users u ON u.user_id = m.user_id
            JOIN booking_items bi ON bi.booking_id = m.booking_id
            LEFT JOIN room_types rt ON rt.room_type_id = bi.entity_id AND bi.entity_type = 'room'
            LEFT JOIN hotels h ON h.hotel_id = rt.hotel_id
            LEFT JOIN flights f ON f.flight_id = bi.entity_id AND bi.entity_type = 'flight'
            LEFT JOIN buses bs ON bs.bus_id = bi.entity_id AND bi.entity_type = 'bus'
            ORDER BY m.created_at DESC
        """)).fetchall()
        return [dict(r._mapping) for r in rows]


@router.post("/modifications/{mod_id}/approve")
def approve_modification(mod_id: int, data: dict = {}, background_tasks: BackgroundTasks = None,
                         admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        mod = conn.execute(
            text("SELECT * FROM booking_modifications WHERE mod_id = :id AND status = 'pending'"),
            {"id": mod_id}
        ).fetchone()
        if not mod:
            raise HTTPException(404, "Yêu cầu không tồn tại")
        m = dict(mod._mapping)

        refund_amount = float(m["refund_amount"] or 0)
        refund_method = m["refund_method"] or "wallet"
        booking_id    = m["booking_id"]
        user_id       = m["user_id"]

        if refund_amount > 0 and refund_method == "wallet":
            conn.execute(
                text("UPDATE users SET wallet = wallet + :amt WHERE user_id = :uid"),
                {"amt": refund_amount, "uid": user_id}
            )
            conn.execute(text("""
                INSERT INTO wallet_transactions (user_id, amount, type, description, status)
                VALUES (:uid, :amt, 'refund', :desc, 'success')
            """), {"uid": user_id, "amt": refund_amount,
                   "desc": f"Hoàn tiền {'hủy' if m['type'] == 'cancel' else 'đổi lịch'} #{booking_id}"})

        conn.execute(
            text("UPDATE booking_modifications SET status = 'approved', admin_note = :note WHERE mod_id = :id"),
            {"id": mod_id, "note": (data or {}).get("note", "")}
        )

    return {"message": "Đã duyệt yêu cầu"}


@router.post("/modifications/{mod_id}/reject")
def reject_modification(mod_id: int, data: dict = {}, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        mod = conn.execute(
            text("SELECT * FROM booking_modifications WHERE mod_id = :id AND status = 'pending'"),
            {"id": mod_id}
        ).fetchone()
        if not mod:
            raise HTTPException(404, "Yêu cầu không tồn tại")
        m = dict(mod._mapping)

        # If it was a cancel, restore booking to confirmed
        if m["type"] == "cancel":
            conn.execute(
                text("UPDATE bookings SET status = 'confirmed' WHERE booking_id = :id"),
                {"id": m["booking_id"]}
            )

        conn.execute(
            text("UPDATE booking_modifications SET status = 'rejected', admin_note = :note WHERE mod_id = :id"),
            {"id": mod_id, "note": (data or {}).get("note", "")}
        )

    return {"message": "Đã từ chối yêu cầu"}
