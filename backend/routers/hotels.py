from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/api/hotels", tags=["hotels"])


# Lấy danh sách khách sạn (filter + sort)
@router.get("/")
def get_hotels(
    search: str | None = None,
    destination_id: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort: str | None = None,   # "rating" | "price_asc" | "price_desc"
    limit: int | None = None,
):
    conditions = []
    params = {}

    if search:
        conditions.append("""
            (h.name LIKE :search
            OR h.address LIKE :search
            OR d.city LIKE :search
            OR d.name LIKE :search)
        """)
        params["search"] = f"%{search}%"

    if destination_id:
        conditions.append("h.destination_id = :destination_id")
        params["destination_id"] = destination_id

    if min_price is not None:
        conditions.append("""
            (SELECT MIN(rt.price_per_night) FROM room_types rt WHERE rt.hotel_id = h.hotel_id)
            >= :min_price
        """)
        params["min_price"] = min_price

    if max_price is not None:
        conditions.append("""
            (SELECT MIN(rt.price_per_night) FROM room_types rt WHERE rt.hotel_id = h.hotel_id)
            <= :max_price
        """)
        params["max_price"] = max_price

    query = """
        SELECT
            h.*,
            d.name AS destination_name,
            d.city AS destination_city,
            (SELECT MIN(rt.price_per_night)
             FROM room_types rt
             WHERE rt.hotel_id = h.hotel_id) AS min_price,
            (SELECT image_url FROM images
             WHERE entity_type = 'hotel' AND entity_id = h.hotel_id
             LIMIT 1) AS image_url,
            (SELECT COALESCE(SUM(rt.total_rooms), 0)
             FROM room_types rt
             WHERE rt.hotel_id = h.hotel_id) AS total_rooms,
            (SELECT GREATEST(0,
                COALESCE(SUM(rt.total_rooms), 0) - (
                    SELECT COUNT(*)
                    FROM booking_items bi2
                    JOIN bookings b2 ON b2.booking_id = bi2.booking_id
                    JOIN room_types rt2 ON rt2.room_type_id = bi2.entity_id
                    WHERE bi2.entity_type = 'room'
                    AND rt2.hotel_id = h.hotel_id
                    AND b2.status IN ('pending','confirmed')
                    AND bi2.check_out_date >= CURDATE()
                ))
             FROM room_types rt
             WHERE rt.hotel_id = h.hotel_id) AS available_rooms
        FROM hotels h
        LEFT JOIN destinations d ON d.destination_id = h.destination_id
    """

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    if sort == "rating":
        query += " ORDER BY h.avg_rating DESC"
    elif sort == "price_asc":
        query += " ORDER BY min_price ASC"
    elif sort == "price_desc":
        query += " ORDER BY min_price DESC"
    else:
        query += " ORDER BY h.avg_rating DESC"

    if limit:
        query += f" LIMIT {int(limit)}"

    with engine.connect() as conn:
        result = conn.execute(text(query), params)
        return [dict(row._mapping) for row in result]


# Lấy chi tiết khách sạn
@router.get("/{hotel_id}")
def get_hotel_by_id(hotel_id: int):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT
                    h.*,
                    d.name AS destination_name,
                    d.city AS destination_city,
                    (SELECT MIN(rt.price_per_night)
                     FROM room_types rt WHERE rt.hotel_id = h.hotel_id) AS min_price
                FROM hotels h
                LEFT JOIN destinations d ON d.destination_id = h.destination_id
                WHERE h.hotel_id = :id
            """),
            {"id": hotel_id}
        ).fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Hotel not found")

        images = conn.execute(
            text("SELECT image_url FROM images WHERE entity_type = 'hotel' AND entity_id = :id"),
            {"id": hotel_id}
        ).fetchall()

        rooms = conn.execute(
            text("""
                SELECT rt.*,
                    GREATEST(0, rt.total_rooms - COALESCE((
                        SELECT COUNT(*) FROM booking_items bi
                        JOIN bookings b ON b.booking_id = bi.booking_id
                        WHERE bi.entity_type = 'room' AND bi.entity_id = rt.room_type_id
                        AND b.status IN ('pending','confirmed')
                        AND bi.check_out_date >= CURDATE()
                    ), 0)) AS available_rooms
                FROM room_types rt
                WHERE rt.hotel_id = :id
                ORDER BY rt.price_per_night ASC
            """),
            {"id": hotel_id}
        ).fetchall()

        reviews = conn.execute(
            text("""
                SELECT r.*, u.full_name
                FROM reviews r
                LEFT JOIN users u ON u.user_id = r.user_id
                WHERE r.entity_type = 'hotel' AND r.entity_id = :id
                ORDER BY r.created_at DESC
                LIMIT 10
            """),
            {"id": hotel_id}
        ).fetchall()

        hotel = dict(result._mapping)
        hotel["images"]     = [r.image_url for r in images]
        hotel["room_types"] = [dict(r._mapping) for r in rooms]
        hotel["reviews"]    = [dict(r._mapping) for r in reviews]
        return hotel


# Kiểm tra phòng trống theo ngày
@router.get("/{hotel_id}/availability")
def check_availability(
    hotel_id: int,
    check_in: str,
    check_out: str,
):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT
                    rt.room_type_id,
                    rt.name,
                    rt.price_per_night,
                    rt.max_guests,
                    rt.total_rooms,
                    rt.check_in_time,
                    rt.check_out_time,
                    GREATEST(0, rt.total_rooms - COUNT(CASE
                        WHEN b.status IN ('pending','confirmed')
                            AND bi.check_in_date < :check_out
                            AND bi.check_out_date > :check_in
                        THEN 1 END)) AS available_rooms
                FROM room_types rt
                LEFT JOIN booking_items bi
                    ON bi.entity_type = 'room' AND bi.entity_id = rt.room_type_id
                LEFT JOIN bookings b ON b.booking_id = bi.booking_id
                WHERE rt.hotel_id = :hotel_id
                GROUP BY rt.room_type_id, rt.name, rt.price_per_night, rt.max_guests,
                         rt.total_rooms, rt.check_in_time, rt.check_out_time
                HAVING available_rooms > 0
                ORDER BY rt.price_per_night ASC
            """),
            {"hotel_id": hotel_id, "check_in": check_in, "check_out": check_out}
        ).fetchall()
        return [dict(r._mapping) for r in result]