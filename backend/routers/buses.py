from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/api/buses", tags=["buses"])


# Tìm kiếm chuyến xe
@router.get("")
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
             WHERE bs.bus_id = b.bus_id AND bs.is_booked = 0) AS available_seats,
            (SELECT COUNT(*) FROM bus_seats bs
             WHERE bs.bus_id = b.bus_id AND bs.is_booked = 0 AND bs.seat_class = 'standard') AS standard_seats,
            (SELECT COUNT(*) FROM bus_seats bs
             WHERE bs.bus_id = b.bus_id AND bs.is_booked = 0 AND bs.seat_class = 'vip') AS vip_seats,
            (SELECT COUNT(*) FROM bus_seats bs
             WHERE bs.bus_id = b.bus_id AND bs.is_booked = 0 AND bs.seat_class = 'sleeper') AS sleeper_seats
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


@router.get("/destinations")
def get_bus_destinations(from_city: str | None = None):
    with engine.connect() as conn:
        if from_city:
            result = conn.execute(text("""
                SELECT DISTINCT to_city FROM buses
                WHERE status = 'active'
                  AND from_city LIKE :from_city
                  AND DATE(depart_time) >= CURDATE()
                ORDER BY to_city
            """), {"from_city": f"%{from_city}%"})
        else:
            result = conn.execute(text("""
                SELECT DISTINCT to_city FROM buses
                WHERE status = 'active' AND DATE(depart_time) >= CURDATE()
                ORDER BY to_city
            """))
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

        bus_d = dict(bus._mapping)
        company    = bus_d["company"]
        base_price = float(bus_d["price"])

        MULTIPLIERS  = {"standard": 1.0, "vip": 1.4, "sleeper": 1.6}
        CLASS_LABELS = {"standard": "Ghế thường", "vip": "Ghế VIP", "sleeper": "Giường nằm"}

        class_rows = conn.execute(text("""
            SELECT
                bs.seat_class,
                SUM(bs.is_booked = 0)                           AS available,
                COALESCE(tp.allows_reschedule,      1)          AS allows_reschedule,
                COALESCE(tp.allows_cancel,          1)          AS allows_cancel,
                COALESCE(tp.refund_on_cancel,       1)          AS refund_on_cancel,
                COALESCE(tp.reschedule_fee_percent, 0)          AS reschedule_fee_percent,
                COALESCE(tp.cancel_fee_percent,     10)         AS cancel_fee_percent,
                COALESCE(tp.min_hours_before,       2)          AS min_hours_before
            FROM bus_seats bs
            LEFT JOIN transport_policies tp
                ON  tp.entity_type = 'bus'
                AND tp.carrier     = :company
                AND tp.seat_class  = bs.seat_class
            WHERE bs.bus_id = :id
            GROUP BY bs.seat_class,
                tp.allows_reschedule, tp.allows_cancel, tp.refund_on_cancel,
                tp.reschedule_fee_percent, tp.cancel_fee_percent, tp.min_hours_before
            ORDER BY FIELD(bs.seat_class, 'standard', 'vip', 'sleeper')
        """), {"id": bus_id, "company": company}).fetchall()

        seat_classes = []
        for row in class_rows:
            d  = dict(row._mapping)
            sc = d["seat_class"]
            seat_classes.append({
                "seat_class":             sc,
                "label":                  CLASS_LABELS.get(sc, sc),
                "available":              int(d["available"] or 0),
                "price":                  round(base_price * MULTIPLIERS.get(sc, 1.0)),
                "allows_reschedule":      bool(d["allows_reschedule"]),
                "allows_cancel":          bool(d["allows_cancel"]),
                "refund_on_cancel":       bool(d["refund_on_cancel"]),
                "reschedule_fee_percent": float(d["reschedule_fee_percent"]),
                "cancel_fee_percent":     float(d["cancel_fee_percent"]),
                "min_hours_before":       int(d["min_hours_before"]),
            })

        bus_d["seat_classes"] = seat_classes
        return bus_d