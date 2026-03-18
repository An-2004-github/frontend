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
             LIMIT 1) AS image_url
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
            text("SELECT * FROM room_types WHERE hotel_id = :id"),
            {"id": hotel_id}
        ).fetchall()

        hotel = dict(result._mapping)
        hotel["images"] = [r.image_url for r in images]
        hotel["room_types"] = [dict(r._mapping) for r in rooms]
        return hotel