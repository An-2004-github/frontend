from fastapi import APIRouter
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


@router.get("/")
def get_bookings():

    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM Bookings"))

        bookings = [dict(row._mapping) for row in result]

        return bookings


@router.post("/")
def create_booking(user_id: int, entity_type: str, entity_id: int, total_price: float):

    with engine.connect() as conn:

        conn.execute(
            text("""
            INSERT INTO Bookings(user_id, entity_type, entity_id, status, total_price)
            VALUES(:user_id, :entity_type, :entity_id, 'CONFIRMED', :total_price)
            """),
            {
                "user_id": user_id,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "total_price": total_price
            }
        )

        conn.commit()

        return {"message": "Booking created"}