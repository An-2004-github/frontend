from fastapi import APIRouter, Depends
from sqlalchemy import text
from database import engine
from auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


# ── Helper: tạo notification (dùng trong các router khác) ──────────
def create_notification(conn, user_id: int, type: str, title: str, content: str, related_id: int | None = None):
    conn.execute(
        text("""
            INSERT INTO notifications (user_id, type, title, content, related_id)
            VALUES (:uid, :type, :title, :content, :related_id)
        """),
        {"uid": user_id, "type": type, "title": title, "content": content, "related_id": related_id}
    )


# ── Lấy danh sách thông báo ────────────────────────────────────────
@router.get("")
def get_notifications(
    limit: int = 20,
    offset: int = 0,
    user_id: int = Depends(get_current_user),
):
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT notification_id, type, title, content, is_read, created_at, related_id
                FROM notifications
                WHERE user_id = :uid
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            """),
            {"uid": user_id, "limit": limit, "offset": offset}
        ).fetchall()

        total_unread = conn.execute(
            text("SELECT COUNT(*) FROM notifications WHERE user_id = :uid AND is_read = 0"),
            {"uid": user_id}
        ).scalar()

        return {
            "items": [dict(r._mapping) for r in rows],
            "unread_count": total_unread,
        }


# ── Đếm chưa đọc (cho badge navbar) ──────────────────────────────
@router.get("/unread-count")
def get_unread_count(user_id: int = Depends(get_current_user)):
    with engine.connect() as conn:
        count = conn.execute(
            text("SELECT COUNT(*) FROM notifications WHERE user_id = :uid AND is_read = 0"),
            {"uid": user_id}
        ).scalar()
        return {"count": count}


# ── Đánh dấu 1 thông báo đã đọc ──────────────────────────────────
@router.put("/{notification_id}/read")
def mark_read(notification_id: int, user_id: int = Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE notifications SET is_read = 1 WHERE notification_id = :nid AND user_id = :uid"),
            {"nid": notification_id, "uid": user_id}
        )
    return {"ok": True}


# ── Đánh dấu tất cả đã đọc ───────────────────────────────────────
@router.put("/read-all")
def mark_all_read(user_id: int = Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE notifications SET is_read = 1 WHERE user_id = :uid AND is_read = 0"),
            {"uid": user_id}
        )
    return {"ok": True}
