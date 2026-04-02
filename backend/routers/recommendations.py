"""
Recommendation API endpoints.
GET /api/recommendations          - top destinations for current user (or popular if guest)
GET /api/recommendations/popular  - top destinations by avg rating (no ML needed)
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from database import engine
from auth import get_current_user
from ml.recommend import recommender

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


def _enrich_destinations(dest_ids: list[int], preds: list[dict]) -> list[dict]:
    """Fetch full destination info + merge score/boosted from preds."""
    if not dest_ids:
        return []
    pred_map = {p["destination_id"]: p for p in preds}

    with engine.connect() as conn:
        placeholders = ",".join(str(d) for d in dest_ids)
        rows = conn.execute(text(f"""
            SELECT
                d.destination_id,
                d.name,
                d.city,
                d.country,
                d.description,
                (SELECT MIN(rt.price_per_night)
                 FROM room_types rt
                 JOIN hotels h2 ON h2.hotel_id = rt.hotel_id
                 WHERE h2.destination_id = d.destination_id) AS min_price,
                (SELECT h.avg_rating FROM hotels h
                 WHERE h.destination_id = d.destination_id
                 ORDER BY h.avg_rating DESC LIMIT 1) AS best_rating,
                (SELECT image_url FROM images
                 WHERE entity_type = 'hotel'
                   AND entity_id = (
                       SELECT hotel_id FROM hotels
                       WHERE destination_id = d.destination_id
                       ORDER BY avg_rating DESC LIMIT 1
                   )
                 LIMIT 1) AS image_url
            FROM destinations d
            WHERE d.destination_id IN ({placeholders})
        """)).fetchall()

    row_map = {dict(r._mapping)["destination_id"]: dict(r._mapping) for r in rows}
    result = []
    for did in dest_ids:
        if did in row_map:
            item = row_map[did]
            p = pred_map.get(did, {})
            item["score"]   = round(p.get("score", 0.0), 4)
            item["boosted"] = p.get("boosted", False)   # True nếu boost từ search
            result.append(item)
    return result


def _get_search_boost(user_id: int) -> dict[int, float]:
    """
    Lấy các keyword user tìm gần đây (7 ngày) → map sang destination_id → boost weight.
    Keyword xuất hiện nhiều lần = boost mạnh hơn (max 0.4).
    """
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT sl.keyword, COUNT(*) AS cnt
            FROM search_logs sl
            WHERE sl.user_id = :uid
              AND sl.created_at >= NOW() - INTERVAL 7 DAY
            GROUP BY sl.keyword
            ORDER BY cnt DESC
            LIMIT 20
        """), {"uid": user_id}).fetchall()

        if not rows:
            return {}

        # For each keyword, find matching destinations
        boost: dict[int, float] = {}
        for row in rows:
            kw = str(row[0])
            cnt = int(row[1])
            weight = min(0.15 + cnt * 0.05, 0.4)

            dest_rows = conn.execute(text("""
                SELECT destination_id FROM destinations
                WHERE city  LIKE :kw
                   OR name  LIKE :kw
                LIMIT 3
            """), {"kw": f"%{kw}%"}).fetchall()

            for dr in dest_rows:
                did = int(dr[0])
                boost[did] = max(boost.get(did, 0.0), weight)

        return boost


@router.get("/")
def get_recommendations(
    limit: int = 8,
    user_id: int = Depends(get_current_user),
):
    """
    Personalized recommendations for logged-in user.
    Tích hợp:
    - NCF score từ lịch sử đặt/xem
    - Real-time boost từ search_logs gần đây
    - Falls back to popular nếu model chưa train
    """
    if not recommender.ready:
        return _get_popular(limit)

    with engine.connect() as conn:
        visited = conn.execute(text("""
            SELECT DISTINCT h.destination_id
            FROM bookings b
            JOIN booking_items bi ON bi.booking_id = b.booking_id
            JOIN room_types rt    ON rt.room_type_id = bi.entity_id AND bi.entity_type = 'room'
            JOIN hotels h         ON h.hotel_id = rt.hotel_id
            WHERE b.user_id = :uid AND b.status = 'confirmed'
        """), {"uid": user_id}).fetchall()
    exclude = [r[0] for r in visited]

    # Real-time boost từ search gần đây
    boost = _get_search_boost(user_id)

    preds = recommender.predict(user_id, top_k=limit, exclude_dest_ids=exclude, boost_dest_ids=boost)
    if not preds:
        return _get_popular(limit)

    dest_ids = [p["destination_id"] for p in preds]
    return _enrich_destinations(dest_ids, preds)


@router.get("/popular")
def get_popular(limit: int = 8):
    return _get_popular(limit)


@router.get("/guest")
def get_guest_recommendations(limit: int = 8):
    """Recommendations for non-logged-in users (popular + model average)."""
    if recommender.ready:
        preds = recommender._popular_items(limit, [])
        if preds:
            dest_ids = [p["destination_id"] for p in preds]
            return _enrich_destinations(dest_ids, preds)
    return _get_popular(limit)


def _get_popular(limit: int) -> list[dict]:
    """Rule-based popular destinations (no ML)."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT
                d.destination_id,
                d.name,
                d.city,
                d.country,
                d.description,
                COUNT(DISTINCT b.booking_id)     AS booking_count,
                AVG(h.avg_rating)                AS best_rating,
                MIN(rt.price_per_night)          AS min_price,
                (SELECT image_url FROM images
                 WHERE entity_type = 'hotel'
                   AND entity_id = (
                       SELECT hotel_id FROM hotels h2
                       WHERE h2.destination_id = d.destination_id
                       ORDER BY h2.avg_rating DESC LIMIT 1
                   )
                 LIMIT 1) AS image_url
            FROM destinations d
            LEFT JOIN hotels h      ON h.destination_id = d.destination_id
            LEFT JOIN room_types rt ON rt.hotel_id = h.hotel_id
            LEFT JOIN booking_items bi ON bi.entity_type = 'room' AND bi.entity_id = rt.room_type_id
            LEFT JOIN bookings b    ON b.booking_id = bi.booking_id AND b.status = 'confirmed'
            GROUP BY d.destination_id, d.name, d.city, d.country, d.description
            ORDER BY booking_count DESC, best_rating DESC
            LIMIT :limit
        """), {"limit": limit}).fetchall()

        return [dict(r._mapping) for r in rows]
