from fastapi import APIRouter, HTTPException, Depends
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
        rows = conn.execute(text(
            "SELECT h.*, d.city AS dest_city FROM hotels h LEFT JOIN destinations d ON d.destination_id = h.destination_id ORDER BY h.hotel_id DESC"
        )).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/hotels")
def admin_create_hotel(data: HotelRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        result = conn.execute(text("""
            INSERT INTO hotels (name, address, destination_id, description, amenities, image_url)
            VALUES (:name, :address, :dest_id, :desc, :amenities, :img)
        """), {
            "name": data.name, "address": data.address, "dest_id": data.destination_id,
            "desc": data.description, "amenities": data.amenities, "img": data.image_url
        })
    return {"hotel_id": result.lastrowid, "message": "Tạo khách sạn thành công"}


@router.put("/hotels/{hotel_id}")
def admin_update_hotel(hotel_id: int, data: HotelRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE hotels SET name=:name, address=:address, destination_id=:dest_id,
            description=:desc, amenities=:amenities, image_url=:img WHERE hotel_id=:id
        """), {
            "name": data.name, "address": data.address, "dest_id": data.destination_id,
            "desc": data.description, "amenities": data.amenities, "img": data.image_url,
            "id": hotel_id
        })
    return {"message": "Cập nhật khách sạn thành công"}


@router.delete("/hotels/{hotel_id}")
def admin_delete_hotel(hotel_id: int, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
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
        rows = conn.execute(text("SELECT * FROM flights ORDER BY flight_id DESC")).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/flights")
def admin_create_flight(data: FlightRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        result = conn.execute(text("""
            INSERT INTO flights (airline, from_city, to_city, depart_time, arrive_time, price, available_seats, image_url)
            VALUES (:airline, :from_city, :to_city, :depart, :arrive, :price, :seats, :img)
        """), {
            "airline": data.airline, "from_city": data.from_city, "to_city": data.to_city,
            "depart": data.depart_time, "arrive": data.arrive_time,
            "price": data.price, "seats": data.available_seats, "img": data.image_url
        })
    return {"flight_id": result.lastrowid, "message": "Tạo chuyến bay thành công"}


@router.put("/flights/{flight_id}")
def admin_update_flight(flight_id: int, data: FlightRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE flights SET airline=:airline, from_city=:from_city, to_city=:to_city,
            depart_time=:depart, arrive_time=:arrive, price=:price,
            available_seats=:seats, image_url=:img WHERE flight_id=:id
        """), {
            "airline": data.airline, "from_city": data.from_city, "to_city": data.to_city,
            "depart": data.depart_time, "arrive": data.arrive_time,
            "price": data.price, "seats": data.available_seats, "img": data.image_url,
            "id": flight_id
        })
    return {"message": "Cập nhật chuyến bay thành công"}


@router.delete("/flights/{flight_id}")
def admin_delete_flight(flight_id: int, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
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
        rows = conn.execute(text("SELECT * FROM buses ORDER BY bus_id DESC")).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/buses")
def admin_create_bus(data: BusRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        result = conn.execute(text("""
            INSERT INTO buses (company, from_city, to_city, depart_time, arrive_time, price, available_seats, image_url)
            VALUES (:company, :from_city, :to_city, :depart, :arrive, :price, :seats, :img)
        """), {
            "company": data.company, "from_city": data.from_city, "to_city": data.to_city,
            "depart": data.depart_time, "arrive": data.arrive_time,
            "price": data.price, "seats": data.available_seats, "img": data.image_url
        })
    return {"bus_id": result.lastrowid, "message": "Tạo xe khách thành công"}


@router.put("/buses/{bus_id}")
def admin_update_bus(bus_id: int, data: BusRequest, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE buses SET company=:company, from_city=:from_city, to_city=:to_city,
            depart_time=:depart, arrive_time=:arrive, price=:price,
            available_seats=:seats, image_url=:img WHERE bus_id=:id
        """), {
            "company": data.company, "from_city": data.from_city, "to_city": data.to_city,
            "depart": data.depart_time, "arrive": data.arrive_time,
            "price": data.price, "seats": data.available_seats, "img": data.image_url,
            "id": bus_id
        })
    return {"message": "Cập nhật xe khách thành công"}


@router.delete("/buses/{bus_id}")
def admin_delete_bus(bus_id: int, admin_id: int = Depends(get_admin_user)):
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM buses WHERE bus_id = :id"), {"id": bus_id})
    return {"message": "Xóa xe khách thành công"}
