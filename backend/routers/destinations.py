from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/api/destinations", tags=["destinations"])


# Lấy danh sách điểm đến (kèm số khách sạn, có filter country)
@router.get("")
def get_destinations(limit: int | None = None, country: str | None = None):
    conditions = []
    params = {}

    if country:
        conditions.append("d.country = :country")
        params["country"] = country

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = f"""
        SELECT
            d.*,
            COUNT(h.hotel_id) AS hotel_count
        FROM destinations d
        LEFT JOIN hotels h ON h.destination_id = d.destination_id
        {where}
        GROUP BY d.destination_id
        ORDER BY d.avg_rating DESC
    """

    if limit:
        query += f" LIMIT {int(limit)}"

    with engine.connect() as conn:
        result = conn.execute(text(query), params)
        return [dict(row._mapping) for row in result]


# Chi tiết 1 điểm đến
@router.get("/{destination_id}")
def get_destination(destination_id: int):
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM destinations WHERE destination_id = :id"),
            {"id": destination_id}
        ).fetchone()

        if not result:
            raise HTTPException(404, "Destination not found")

        return dict(result._mapping)