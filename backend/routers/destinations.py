from fastapi import APIRouter
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/api/destinations", tags=["Destinations"])

@router.get("/")
def get_destinations():

    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM Destinations"))

        destinations = [dict(row._mapping) for row in result]

        return destinations