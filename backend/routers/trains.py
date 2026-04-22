from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/api/trains", tags=["trains"])

SEAT_CLASS_LABEL = {
    "hard_seat":    "Ngồi cứng",
    "soft_seat":    "Ngồi mềm",
    "hard_sleeper": "Nằm cứng",
    "soft_sleeper": "Nằm mềm",
}


@router.get("")
def search_trains(
    from_city: str | None = None,
    to_city: str | None = None,
    depart_date: str | None = None,
    seat_class: str | None = None,   # hard_seat | soft_seat | hard_sleeper | soft_sleeper
    min_price: float | None = None,
    max_price: float | None = None,
    sort: str | None = "depart_asc",
):
    conditions = ["t.status = 'active'"]
    params: dict = {}

    if from_city:
        conditions.append("t.from_city LIKE :from_city")
        params["from_city"] = f"%{from_city}%"

    if to_city:
        conditions.append("t.to_city LIKE :to_city")
        params["to_city"] = f"%{to_city}%"

    if depart_date:
        conditions.append("DATE(t.depart_time) = :depart_date")
        params["depart_date"] = depart_date

    if min_price is not None:
        conditions.append("t.price >= :min_price")
        params["min_price"] = min_price

    if max_price is not None:
        conditions.append("t.price <= :max_price")
        params["max_price"] = max_price

    sort_map = {
        "price_asc":  "t.price ASC",
        "price_desc": "t.price DESC",
        "depart_asc": "t.depart_time ASC",
        "duration":   "duration_minutes ASC",
    }
    order = sort_map.get(sort, "t.depart_time ASC")

    query = f"""
        SELECT
            t.*,
            TIMESTAMPDIFF(MINUTE, t.depart_time, t.arrive_time) AS duration_minutes,
            (SELECT COUNT(*) FROM train_seats ts
             WHERE ts.train_id = t.train_id AND ts.is_booked = 0) AS available_seats,
            (SELECT COUNT(*) FROM train_seats ts
             WHERE ts.train_id = t.train_id AND ts.is_booked = 0 AND ts.seat_class = 'hard_seat') AS hard_seat_count,
            (SELECT MIN(ts.price) FROM train_seats ts
             WHERE ts.train_id = t.train_id AND ts.is_booked = 0 AND ts.seat_class = 'hard_seat') AS hard_seat_price,
            (SELECT COUNT(*) FROM train_seats ts
             WHERE ts.train_id = t.train_id AND ts.is_booked = 0 AND ts.seat_class = 'soft_seat') AS soft_seat_count,
            (SELECT MIN(ts.price) FROM train_seats ts
             WHERE ts.train_id = t.train_id AND ts.is_booked = 0 AND ts.seat_class = 'soft_seat') AS soft_seat_price,
            (SELECT COUNT(*) FROM train_seats ts
             WHERE ts.train_id = t.train_id AND ts.is_booked = 0 AND ts.seat_class = 'hard_sleeper') AS hard_sleeper_count,
            (SELECT MIN(ts.price) FROM train_seats ts
             WHERE ts.train_id = t.train_id AND ts.is_booked = 0 AND ts.seat_class = 'hard_sleeper') AS hard_sleeper_price,
            (SELECT COUNT(*) FROM train_seats ts
             WHERE ts.train_id = t.train_id AND ts.is_booked = 0 AND ts.seat_class = 'soft_sleeper') AS soft_sleeper_count,
            (SELECT MIN(ts.price) FROM train_seats ts
             WHERE ts.train_id = t.train_id AND ts.is_booked = 0 AND ts.seat_class = 'soft_sleeper') AS soft_sleeper_price
        FROM trains t
        WHERE {' AND '.join(conditions)}
        ORDER BY {order}
    """

    with engine.connect() as conn:
        rows = conn.execute(text(query), params).fetchall()
        results = [dict(r._mapping) for r in rows]

    # Lọc theo seat_class sau khi query (chỉ trả về tàu còn chỗ hạng đó)
    if seat_class:
        count_key = f"{seat_class}_count"
        results = [r for r in results if (r.get(count_key) or 0) > 0]

    return results


@router.get("/cities")
def get_cities():
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT DISTINCT city FROM (
                SELECT from_city AS city FROM trains
                UNION
                SELECT to_city AS city FROM trains
            ) c ORDER BY city
        """)).fetchall()
    return [r[0] for r in rows]


@router.get("/destinations")
def get_destinations(from_city: str | None = None):
    with engine.connect() as conn:
        if from_city:
            rows = conn.execute(text("""
                SELECT DISTINCT to_city FROM trains
                WHERE status = 'active'
                  AND from_city LIKE :from_city
                  AND DATE(depart_time) >= CURDATE()
                ORDER BY to_city
            """), {"from_city": f"%{from_city}%"}).fetchall()
        else:
            rows = conn.execute(text("""
                SELECT DISTINCT to_city FROM trains
                WHERE status = 'active' AND DATE(depart_time) >= CURDATE()
                ORDER BY to_city
            """)).fetchall()
    return [r[0] for r in rows]


@router.get("/{train_id}")
def get_train(train_id: int):
    with engine.connect() as conn:
        train = conn.execute(text("""
            SELECT t.*,
                TIMESTAMPDIFF(MINUTE, t.depart_time, t.arrive_time) AS duration_minutes
            FROM trains t WHERE t.train_id = :id
        """), {"id": train_id}).fetchone()

        if not train:
            raise HTTPException(404, "Tàu không tồn tại")

        seats = conn.execute(text("""
            SELECT
                ts.seat_class,
                COUNT(*)                                        AS total,
                SUM(ts.is_booked = 0)                          AS available,
                MIN(ts.price)                                   AS price,
                COALESCE(tp.allows_reschedule,      1)         AS allows_reschedule,
                COALESCE(tp.allows_cancel,          1)         AS allows_cancel,
                COALESCE(tp.refund_on_cancel,       1)         AS refund_on_cancel,
                COALESCE(tp.reschedule_fee_percent, 0)         AS reschedule_fee_percent,
                COALESCE(tp.cancel_fee_percent,     10)        AS cancel_fee_percent,
                COALESCE(tp.min_hours_before,       2)         AS min_hours_before
            FROM train_seats ts
            LEFT JOIN transport_policies tp
                ON  tp.entity_type = 'train'
                AND tp.carrier     = 'Đường sắt Việt Nam'
                AND tp.seat_class  = ts.seat_class
            WHERE ts.train_id = :id
            GROUP BY ts.seat_class,
                tp.allows_reschedule, tp.allows_cancel, tp.refund_on_cancel,
                tp.reschedule_fee_percent, tp.cancel_fee_percent, tp.min_hours_before
            ORDER BY FIELD(ts.seat_class, 'hard_seat','soft_seat','hard_sleeper','soft_sleeper')
        """), {"id": train_id}).fetchall()

        result = dict(train._mapping)
        result["seat_classes"] = [{
            **dict(s._mapping),
            "available":              int(dict(s._mapping).get("available") or 0),
            "allows_reschedule":      bool(dict(s._mapping)["allows_reschedule"]),
            "allows_cancel":          bool(dict(s._mapping)["allows_cancel"]),
            "refund_on_cancel":       bool(dict(s._mapping)["refund_on_cancel"]),
            "reschedule_fee_percent": float(dict(s._mapping)["reschedule_fee_percent"]),
            "cancel_fee_percent":     float(dict(s._mapping)["cancel_fee_percent"]),
            "min_hours_before":       int(dict(s._mapping)["min_hours_before"]),
        } for s in seats]
        return result
