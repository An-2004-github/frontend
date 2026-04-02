from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from database import engine
from auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


class ReviewCreate(BaseModel):
    entity_type: str  # "hotel" | "flight" | "train" | "bus"
    entity_id: int
    rating: int       # 1 – 5
    comment: str


@router.get("/")
def get_reviews(entity_type: str, entity_id: int):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT r.review_id, r.user_id, r.entity_type, r.entity_id,
                       r.rating, r.comment, r.created_at,
                       u.full_name
                FROM reviews r
                LEFT JOIN users u ON u.user_id = r.user_id
                WHERE r.entity_type = :entity_type AND r.entity_id = :entity_id
                ORDER BY r.created_at DESC
            """),
            {"entity_type": entity_type, "entity_id": entity_id}
        )
        return [dict(row._mapping) for row in result]


@router.post("/", status_code=201)
def create_review(data: ReviewCreate, user_id: int = Depends(get_current_user)):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating phải từ 1 đến 5")

    with engine.begin() as conn:
        # Kiểm tra đã review chưa
        existing = conn.execute(
            text("""
                SELECT review_id FROM reviews
                WHERE user_id = :user_id AND entity_type = :entity_type AND entity_id = :entity_id
            """),
            {"user_id": user_id, "entity_type": data.entity_type, "entity_id": data.entity_id}
        ).fetchone()

        if existing:
            raise HTTPException(status_code=409, detail="Bạn đã đánh giá rồi")

        # Insert review
        result = conn.execute(
            text("""
                INSERT INTO reviews (user_id, entity_type, entity_id, rating, comment)
                VALUES (:user_id, :entity_type, :entity_id, :rating, :comment)
            """),
            {
                "user_id": user_id,
                "entity_type": data.entity_type,
                "entity_id": data.entity_id,
                "rating": data.rating,
                "comment": data.comment,
            }
        )
        new_id = result.lastrowid

        # Cập nhật avg_rating và review_count cho khách sạn
        if data.entity_type == "hotel":
            conn.execute(
                text("""
                    UPDATE hotels
                    SET avg_rating = (
                            SELECT AVG(rating) FROM reviews
                            WHERE entity_type = 'hotel' AND entity_id = :eid
                        ),
                        review_count = (
                            SELECT COUNT(*) FROM reviews
                            WHERE entity_type = 'hotel' AND entity_id = :eid
                        )
                    WHERE hotel_id = :eid
                """),
                {"eid": data.entity_id}
            )

    return {"message": "Đánh giá thành công", "review_id": new_id}