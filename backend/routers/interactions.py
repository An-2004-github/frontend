"""
API để ghi lại hành vi người dùng vào user_interactions và search_logs.
Dùng cho training NCF recommendation model.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from pydantic import BaseModel
from database import engine
from auth import get_current_user

router = APIRouter(prefix="/api/interactions", tags=["interactions"])


class InteractionLog(BaseModel):
    entity_type: str   # 'hotel' | 'flight' | 'bus'
    entity_id:   int
    action:      str   # 'view_detail' | 'click' | 'view' | 'book'


class SearchLog(BaseModel):
    keyword: str


@router.post("/log")
def log_interaction(
    body: InteractionLog,
    user_id: int = Depends(get_current_user),
):
    """Ghi lại hành vi user với một entity."""
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO user_interactions (user_id, entity_type, entity_id, action)
            VALUES (:uid, :etype, :eid, :action)
        """), {
            "uid":    user_id,
            "etype":  body.entity_type,
            "eid":    body.entity_id,
            "action": body.action,
        })
    return {"ok": True}


@router.post("/search")
def log_search(
    body: SearchLog,
    user_id: int = Depends(get_current_user),
):
    """Ghi lại từ khóa tìm kiếm của user."""
    keyword = (body.keyword or "").strip()
    if not keyword or len(keyword) < 2:
        return {"ok": False}
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO search_logs (user_id, keyword)
            VALUES (:uid, :kw)
        """), {"uid": user_id, "kw": keyword[:200]})
    return {"ok": True}
