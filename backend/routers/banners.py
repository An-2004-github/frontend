from fastapi import APIRouter
from sqlalchemy import text
from database import engine

from typing import Optional

router = APIRouter(prefix="/api/banners", tags=["banners"])

# Tạo bảng nếu chưa có
with engine.begin() as _conn:
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS banners (
            banner_id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200),
            subtitle VARCHAR(300),
            image_url VARCHAR(500) NOT NULL,
            link_url VARCHAR(500),
            display_order INT DEFAULT 0,
            is_active TINYINT(1) DEFAULT 1,
            page_display VARCHAR(50) DEFAULT 'home',
            start_date DATE,
            end_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    # Thêm cột page_display nếu chưa có (migration an toàn)
    try:
        _conn.execute(text("ALTER TABLE banners ADD COLUMN page_display VARCHAR(50) DEFAULT 'home'"))
    except Exception:
        pass  # Cột đã tồn tại
    # Bỏ NOT NULL trên title nếu cần
    try:
        _conn.execute(text("ALTER TABLE banners MODIFY COLUMN title VARCHAR(200) NULL"))
    except Exception:
        pass


@router.get("")
def get_active_banners(page: Optional[str] = None):
    """Trả về banners đang active và còn trong thời gian hiển thị.
    Param page: 'home' | 'promotion' | None (lấy tất cả)
    """
    with engine.connect() as conn:
        if page:
            rows = conn.execute(text("""
                SELECT * FROM banners
                WHERE is_active = 1
                  AND page_display = :page
                  AND (start_date IS NULL OR start_date <= CURDATE())
                  AND (end_date IS NULL OR end_date >= CURDATE())
                ORDER BY display_order ASC, banner_id DESC
            """), {"page": page}).fetchall()
        else:
            rows = conn.execute(text("""
                SELECT * FROM banners
                WHERE is_active = 1
                  AND (start_date IS NULL OR start_date <= CURDATE())
                  AND (end_date IS NULL OR end_date >= CURDATE())
                ORDER BY display_order ASC, banner_id DESC
            """)).fetchall()
    return [dict(r._mapping) for r in rows]
