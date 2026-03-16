from fastapi import APIRouter
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


@router.get("/")
def get_reviews():

    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM Reviews"))

        reviews = [dict(row._mapping) for row in result]

        return reviews