from fastapi import APIRouter
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/api/banners", tags=["banners"])

# Tạo bảng nếu chưa có
with engine.begin() as _conn:
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS banners (
            banner_id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            subtitle VARCHAR(300),
            image_url VARCHAR(500) NOT NULL,
            link_url VARCHAR(500),
            display_order INT DEFAULT 0,
            is_active TINYINT(1) DEFAULT 1,
            start_date DATE,
            end_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))


@router.get("")
def get_active_banners():
    """Trả về banners đang active và còn trong thời gian hiển thị, dùng cho homepage."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT * FROM banners
            WHERE is_active = 1
              AND (start_date IS NULL OR start_date <= CURDATE())
              AND (end_date IS NULL OR end_date >= CURDATE())
            ORDER BY display_order ASC, banner_id DESC
        """)).fetchall()
    return [dict(r._mapping) for r in rows]
