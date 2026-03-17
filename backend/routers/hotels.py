from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from database import engine

router = APIRouter(
    prefix="/api/hotels",
    tags=["hotels"]
)

# Lấy danh sách khách sạn (có filter tên + giá)
@router.get("/")
def get_hotels(
    search: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
):
    conditions = []
    params = {}

    if search:
        conditions.append("name LIKE :search")
        params["search"] = f"%{search}%"

    if min_price is not None:
        conditions.append("price_per_night >= :min_price")
        params["min_price"] = min_price

    if max_price is not None:
        conditions.append("price_per_night <= :max_price")
        params["max_price"] = max_price

    query = "SELECT * FROM hotels"
    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    with engine.connect() as conn:
        result = conn.execute(text(query), params)
        return [dict(row._mapping) for row in result]


# Lấy chi tiết khách sạn
@router.get("/{hotel_id}")
def get_hotel_by_id(hotel_id: int):
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM hotels WHERE hotel_id = :id"),
            {"id": hotel_id}
        ).fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Hotel not found")

        return dict(result._mapping)