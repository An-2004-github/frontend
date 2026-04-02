from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/api/flights", tags=["flights"])


# Tìm kiếm chuyến bay
@router.get("/")
def search_flights(
    from_city: str | None = None,
    to_city: str | None = None,
    depart_date: str | None = None,   # YYYY-MM-DD
    airline: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort: str | None = "price_asc",   # price_asc | price_desc | depart_asc | duration
):
    conditions = ["f.status = 'active'"]
    params = {}

    if from_city:
        conditions.append("f.from_city LIKE :from_city")
        params["from_city"] = f"%{from_city}%"

    if to_city:
        conditions.append("f.to_city LIKE :to_city")
        params["to_city"] = f"%{to_city}%"

    if depart_date:
        conditions.append("DATE(f.depart_time) = :depart_date")
        params["depart_date"] = depart_date

    if airline:
        conditions.append("f.airline LIKE :airline")
        params["airline"] = f"%{airline}%"

    if min_price is not None:
        conditions.append("f.price >= :min_price")
        params["min_price"] = min_price

    if max_price is not None:
        conditions.append("f.price <= :max_price")
        params["max_price"] = max_price

    sort_map = {
        "price_asc":   "f.price ASC",
        "price_desc":  "f.price DESC",
        "depart_asc":  "f.depart_time ASC",
        "duration":    "duration_minutes ASC",
    }
    order = sort_map.get(sort, "f.price ASC")

    query = f"""
        SELECT
            f.*,
            TIMESTAMPDIFF(MINUTE, f.depart_time, f.arrive_time) AS duration_minutes,
            (SELECT COUNT(*) FROM flight_seats fs
             WHERE fs.flight_id = f.flight_id AND fs.is_booked = 0) AS available_seats,
            (SELECT COUNT(*) FROM flight_seats fs
             WHERE fs.flight_id = f.flight_id AND fs.is_booked = 0 AND fs.seat_class = 'economy') AS economy_seats,
            (SELECT COUNT(*) FROM flight_seats fs
             WHERE fs.flight_id = f.flight_id AND fs.is_booked = 0 AND fs.seat_class = 'business') AS business_seats,
            (SELECT COUNT(*) FROM flight_seats fs
             WHERE fs.flight_id = f.flight_id AND fs.is_booked = 0 AND fs.seat_class = 'first') AS first_seats
        FROM flights f
        WHERE {' AND '.join(conditions)}
        ORDER BY {order}
    """

    with engine.connect() as conn:
        result = conn.execute(text(query), params)
        return [dict(row._mapping) for row in result]


# Lấy danh sách hãng bay (cho filter)
@router.get("/airlines")
def get_airlines():
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT DISTINCT airline FROM flights WHERE status = 'active' ORDER BY airline")
        )
        return [row[0] for row in result]


# Lấy danh sách thành phố (cho autocomplete)
@router.get("/cities")
def get_cities():
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT DISTINCT city FROM (
                    SELECT from_city AS city FROM flights
                    UNION
                    SELECT to_city AS city FROM flights
                ) AS cities ORDER BY city
            """)
        )
        return [row[0] for row in result]


# Chi tiết 1 chuyến bay + danh sách ghế
@router.get("/{flight_id}")
def get_flight(flight_id: int):
    with engine.connect() as conn:
        flight = conn.execute(
            text("""
                SELECT
                    f.*,
                    TIMESTAMPDIFF(MINUTE, f.depart_time, f.arrive_time) AS duration_minutes,
                    (SELECT COUNT(*) FROM flight_seats fs
                     WHERE fs.flight_id = f.flight_id AND fs.is_booked = 0) AS available_seats
                FROM flights f
                WHERE f.flight_id = :id
            """),
            {"id": flight_id}
        ).fetchone()

        if not flight:
            raise HTTPException(404, "Chuyến bay không tồn tại")

        # Lấy ghế theo hạng
        seats = conn.execute(
            text("""
                SELECT * FROM flight_seats
                WHERE flight_id = :id
                ORDER BY seat_class, seat_number
            """),
            {"id": flight_id}
        ).fetchall()
        result = dict(flight._mapping)
        result["seats"] = [dict(s._mapping) for s in seats]
        return result