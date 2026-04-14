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
            d.destination_id, d.city, d.name, d.description,
            COUNT(h.hotel_id) AS hotel_count,
            (SELECT img.image_url FROM images img
             WHERE img.entity_type = 'destination' AND img.entity_id = d.destination_id
             LIMIT 1) AS image_url
        FROM destinations d
        LEFT JOIN hotels h ON h.destination_id = d.destination_id
        {where}
        GROUP BY d.destination_id, d.city, d.name, d.description
        ORDER BY hotel_count DESC, d.city ASC
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
            text("""
                SELECT d.*,
                       (SELECT img.image_url FROM images img
                        WHERE img.entity_type = 'destination' AND img.entity_id = d.destination_id
                        LIMIT 1) AS image_url
                FROM destinations d
                WHERE d.destination_id = :id
            """),
            {"id": destination_id}
        ).fetchone()

        if not result:
            raise HTTPException(404, "Destination not found")

        return dict(result._mapping)