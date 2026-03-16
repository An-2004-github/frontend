from fastapi import APIRouter
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/api/flights", tags=["Flights"])

@router.get("/")
def get_flights():

    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM Flights"))

        flights = [dict(row._mapping) for row in result]

        return flights