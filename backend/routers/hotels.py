from fastapi import APIRouter
from sqlalchemy import text
from database import engine

router = APIRouter(
    prefix="/api/hotels",
    tags=["hotels"]
)

# Lấy danh sách khách sạn
@router.get("/")
def get_hotels(search: str | None = None):
    query = "SELECT * FROM hotels"

    if search:
        query += " WHERE name LIKE :search"

    with engine.connect() as conn:
        result = conn.execute(
            text(query),
            {"search": f"%{search}%"} if search else {}
        )

        hotels = [dict(row._mapping) for row in result]
        return hotels


# Lấy chi tiết khách sạn
@router.get("/{hotel_id}")
def get_hotel_by_id(hotel_id: int):
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM hotels WHERE hotel_id = :id"),
            {"id": hotel_id}
        ).fetchone()

        if not result:
            return {"error": "Hotel not found"}

        return dict(result._mapping)