from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/api/flights", tags=["flights"])


# Tìm kiếm chuyến bay
@router.get("")
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


# Lấy điểm đến có chuyến bay từ một thành phố cụ thể (và ngày cụ thể nếu có)
@router.get("/destinations")
def get_destinations(from_city: str | None = None, depart_date: str | None = None):
    conditions = ["status = 'active'"]
    params = {}

    if from_city:
        conditions.append("from_city LIKE :from_city")
        params["from_city"] = f"%{from_city}%"

    if depart_date:
        conditions.append("DATE(depart_time) = :depart_date")
        params["depart_date"] = depart_date
    else:
        conditions.append("DATE(depart_time) >= CURDATE()")

    query = f"""
        SELECT DISTINCT to_city FROM flights
        WHERE {' AND '.join(conditions)}
        ORDER BY to_city
    """
    with engine.connect() as conn:
        result = conn.execute(text(query), params)
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

        flight_d = dict(flight._mapping)
        airline    = flight_d["airline"]
        base_price = float(flight_d["price"])

        MULTIPLIERS = {"economy": 1.0, "business": 1.8, "first": 2.5}
        CLASS_LABELS = {"economy": "Economy", "business": "Business Class", "first": "First Class"}
        CARRY_ON     = {"economy": 7,  "business": 10, "first": 14}
        CHECKED_BAG  = {"economy": 0,  "business": 23, "first": 32}

        class_rows = conn.execute(text("""
            SELECT
                fs.seat_class,
                SUM(fs.is_booked = 0)                           AS available,
                COALESCE(tp.allows_reschedule,      1)          AS allows_reschedule,
                COALESCE(tp.allows_cancel,          1)          AS allows_cancel,
                COALESCE(tp.refund_on_cancel,       1)          AS refund_on_cancel,
                COALESCE(tp.reschedule_fee_percent, 0)          AS reschedule_fee_percent,
                COALESCE(tp.cancel_fee_percent,     10)         AS cancel_fee_percent,
                COALESCE(tp.min_hours_before,       2)          AS min_hours_before
            FROM flight_seats fs
            LEFT JOIN transport_policies tp
                ON  tp.entity_type = 'flight'
                AND tp.carrier     = :airline
                AND tp.seat_class  = fs.seat_class
            WHERE fs.flight_id = :id
            GROUP BY fs.seat_class,
                tp.allows_reschedule, tp.allows_cancel, tp.refund_on_cancel,
                tp.reschedule_fee_percent, tp.cancel_fee_percent, tp.min_hours_before
            ORDER BY FIELD(fs.seat_class, 'economy', 'business', 'first')
        """), {"id": flight_id, "airline": airline}).fetchall()

        seat_classes = []
        for row in class_rows:
            d  = dict(row._mapping)
            sc = d["seat_class"]
            seat_classes.append({
                "seat_class":             sc,
                "label":                  CLASS_LABELS.get(sc, sc),
                "available":              int(d["available"] or 0),
                "price":                  round(base_price * MULTIPLIERS.get(sc, 1.0)),
                "carry_on_kg":            CARRY_ON.get(sc, 7),
                "checked_bag_kg":         CHECKED_BAG.get(sc, 0),
                "allows_reschedule":      bool(d["allows_reschedule"]),
                "allows_cancel":          bool(d["allows_cancel"]),
                "refund_on_cancel":       bool(d["refund_on_cancel"]),
                "reschedule_fee_percent": float(d["reschedule_fee_percent"]),
                "cancel_fee_percent":     float(d["cancel_fee_percent"]),
                "min_hours_before":       int(d["min_hours_before"]),
            })

        flight_d["seat_classes"] = seat_classes
        return flight_d