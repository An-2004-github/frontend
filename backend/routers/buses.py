from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/api/buses", tags=["buses"])


# Tìm kiếm chuyến xe
@router.get("/")
def search_buses(
    from_city: str | None = None,
    to_city: str | None = None,
    depart_date: str | None = None,   # YYYY-MM-DD
    company: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort: str | None = "price_asc",   # price_asc | price_desc | depart_asc | duration
):
    conditions = ["b.status = 'active'"]
    params = {}

    if from_city:
        conditions.append("b.from_city LIKE :from_city")
        params["from_city"] = f"%{from_city}%"

    if to_city:
        conditions.append("b.to_city LIKE :to_city")
        params["to_city"] = f"%{to_city}%"

    if depart_date:
        conditions.append("DATE(b.depart_time) = :depart_date")
        params["depart_date"] = depart_date

    if company:
        conditions.append("b.company LIKE :company")
        params["company"] = f"%{company}%"

    if min_price is not None:
        conditions.append("b.price >= :min_price")
        params["min_price"] = min_price

    if max_price is not None:
        conditions.append("b.price <= :max_price")
        params["max_price"] = max_price

    sort_map = {
        "price_asc":  "b.price ASC",
        "price_desc": "b.price DESC",
        "depart_asc": "b.depart_time ASC",
        "duration":   "duration_minutes ASC",
    }
    order = sort_map.get(sort, "b.price ASC")

    query = f"""
        SELECT
            b.*,
            TIMESTAMPDIFF(MINUTE, b.depart_time, b.arrive_time) AS duration_minutes,
            (SELECT COUNT(*) FROM bus_seats bs
             WHERE bs.bus_id = b.bus_id AND bs.is_booked = 0) AS available_seats
        FROM buses b
        WHERE {' AND '.join(conditions)}
        ORDER BY {order}
    """

    with engine.connect() as conn:
        result = conn.execute(text(query), params)
        return [dict(row._mapping) for row in result]


# Lấy danh sách nhà xe (cho filter)
@router.get("/companies")
def get_companies():
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT DISTINCT company FROM buses WHERE status = 'active' ORDER BY company")
        )
        return [row[0] for row in result]


# Lấy danh sách thành phố (cho autocomplete)
@router.get("/cities")
def get_bus_cities():
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT DISTINCT city FROM (
                    SELECT from_city AS city FROM buses
                    UNION
                    SELECT to_city AS city FROM buses
                ) AS cities ORDER BY city
            """)
        )
        return [row[0] for row in result]


# Chi tiết 1 chuyến xe + ghế
@router.get("/{bus_id}")
def get_bus(bus_id: int):
    with engine.connect() as conn:
        bus = conn.execute(
            text("""
                SELECT
                    b.*,
                    TIMESTAMPDIFF(MINUTE, b.depart_time, b.arrive_time) AS duration_minutes,
                    (SELECT COUNT(*) FROM bus_seats bs
                     WHERE bs.bus_id = b.bus_id AND bs.is_booked = 0) AS available_seats
                FROM buses b
                WHERE b.bus_id = :id
            """),
            {"id": bus_id}
        ).fetchone()

        if not bus:
            raise HTTPException(404, "Chuyến xe không tồn tại")

        seats = conn.execute(
            text("""
                SELECT * FROM bus_seats
                WHERE bus_id = :id
                ORDER BY seat_class, seat_number
            """),
            {"id": bus_id}
        ).fetchall()

        result = dict(bus._mapping)
        result["seats"] = [dict(s._mapping) for s in seats]
        return result