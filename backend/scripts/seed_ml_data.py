"""
Seed fake data cho ML model (NCF recommendation).
Tự tạo fake users nếu DB chưa có đủ, sau đó insert:
  - user_interactions  (view, click, book)
  - search_logs        (từ khoá tìm kiếm)
  - reviews            (đánh giá khách sạn)

Chạy từ thư mục backend/:
    python -m scripts.seed_ml_data

Flags:
    --users   N   Số fake user cần có (mặc định 80)
    --clear       Xoá data seed cũ trước khi chạy lại
"""

import sys
import os
import random
import argparse
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import engine
from sqlalchemy import text

SEED = 42
random.seed(SEED)

SEARCH_KEYWORDS = [
    "Đà Nẵng", "Hội An", "Nha Trang", "Đà Lạt", "Phú Quốc",
    "Hà Nội", "Hồ Chí Minh", "Huế", "Phan Thiết", "Vũng Tàu",
    "Sapa", "Hạ Long", "Ninh Bình", "Mũi Né", "Côn Đảo",
    "khách sạn biển", "resort 5 sao", "khách sạn giá rẻ",
    "nghỉ dưỡng gia đình", "phòng view biển",
]

ACTIONS = [
    ("view",        0.35),
    ("click",       0.25),
    ("view_detail", 0.20),
    ("search",      0.12),
    ("book",        0.08),
]

REVIEW_COMMENTS = [
    "Phòng sạch sẽ, nhân viên thân thiện, sẽ quay lại.",
    "Vị trí đẹp, gần biển, buổi sáng yên tĩnh.",
    "Dịch vụ tốt, giá cả hợp lý.",
    "Phòng rộng rãi, view đẹp, breakfast ngon.",
    "Trải nghiệm tuyệt vời, rất đáng tiền.",
    "Nhân viên nhiệt tình, cơ sở vật chất hiện đại.",
    "Tạm ổn, phòng hơi nhỏ nhưng sạch.",
    "Khách sạn đẹp, hồ bơi lớn, con nít thích lắm.",
    "Ổn áp, sẽ giới thiệu cho bạn bè.",
    "Giá tốt cho chất lượng nhận được.",
    "Bữa sáng phong phú, phòng thoáng mát.",
    "Check-in nhanh, nhân viên vui vẻ.",
    "Không gian sang trọng, dịch vụ 5 sao.",
    "Vị trí trung tâm, tiện đi lại.",
]

FAKE_USER_MARKER = "seed_fake_"   # email prefix để nhận biết user giả

FAKE_NAMES = [
    "Nguyễn Văn An", "Trần Thị Bình", "Lê Văn Cường", "Phạm Thị Dung",
    "Hoàng Văn Em", "Ngô Thị Phương", "Vũ Văn Giang", "Đặng Thị Hoa",
    "Bùi Văn Inh", "Đỗ Thị Kim", "Lý Văn Long", "Trịnh Thị Mai",
    "Dương Văn Nam", "Hồ Thị Oanh", "Phan Văn Phúc", "Tô Thị Quỳnh",
    "Cao Văn Rồng", "Lâm Thị Sen", "Tăng Văn Tú", "Nguyễn Thị Uyên",
]


def weighted_choice(choices):
    items, weights = zip(*choices)
    r = random.random()
    cumulative = 0
    for item, w in zip(items, weights):
        cumulative += w
        if r < cumulative:
            return item
    return items[-1]


def rand_dt(days_back=180):
    delta = timedelta(
        days=random.randint(0, days_back),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )
    return datetime.now() - delta


def ensure_fake_users(conn, target_count: int) -> list[int]:
    """Tạo fake users nếu chưa đủ target_count. Trả về list user_id."""
    existing = conn.execute(text(
        "SELECT user_id FROM users WHERE email LIKE :marker"
    ), {"marker": f"{FAKE_USER_MARKER}%"}).fetchall()
    existing_ids = [r[0] for r in existing]

    need = target_count - len(existing_ids)
    if need <= 0:
        print(f"[INFO] Đã có {len(existing_ids)} fake users trong DB.")
        return existing_ids

    print(f"[INFO] Tạo thêm {need} fake users...")
    # Dùng hash đơn giản thay bcrypt để seed nhanh
    # Tạo bcrypt hash hợp lệ cho password "seed123"
    from passlib.context import CryptContext
    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    dummy_hash = pwd_ctx.hash("seed123")

    new_ids = []
    for i in range(len(existing_ids), len(existing_ids) + need):
        name = FAKE_NAMES[i % len(FAKE_NAMES)]
        email = f"{FAKE_USER_MARKER}{i+1}@seed.local"
        result = conn.execute(text("""
            INSERT INTO users (full_name, email, password_hash, role, wallet)
            VALUES (:name, :email, :pwd, 'USER', 0)
        """), {"name": name, "email": email, "pwd": dummy_hash})
        new_ids.append(result.lastrowid)

    print(f"[INFO] Đã tạo {len(new_ids)} fake users mới.")
    return existing_ids + new_ids


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--users", type=int, default=80, help="Số fake user cần có")
    parser.add_argument("--clear", action="store_true", help="Xoá data seed cũ")
    args = parser.parse_args()

    with engine.connect() as conn:
        hotels = conn.execute(text(
            "SELECT hotel_id, destination_id FROM hotels WHERE destination_id IS NOT NULL"
        )).fetchall()
        destinations = [r[0] for r in conn.execute(text("SELECT destination_id FROM destinations")).fetchall()]

    if not hotels:
        print("[ERROR] Không có hotel nào có destination_id. Hãy seed hotels trước.")
        return
    if not destinations:
        print("[ERROR] Không có destination nào trong DB.")
        return

    hotel_ids = [h[0] for h in hotels]
    print(f"[INFO] Tìm thấy {len(hotel_ids)} hotels, {len(destinations)} destinations.")

    with engine.begin() as conn:
        if args.clear:
            print("[CLEAR] Xoá data seed cũ...")
            conn.execute(text(
                "DELETE FROM user_interactions WHERE user_id IN "
                "(SELECT user_id FROM users WHERE email LIKE :m)"
            ), {"m": f"{FAKE_USER_MARKER}%"})
            conn.execute(text(
                "DELETE FROM search_logs WHERE user_id IN "
                "(SELECT user_id FROM users WHERE email LIKE :m)"
            ), {"m": f"{FAKE_USER_MARKER}%"})
            conn.execute(text(
                "DELETE FROM reviews WHERE user_id IN "
                "(SELECT user_id FROM users WHERE email LIKE :m)"
            ), {"m": f"{FAKE_USER_MARKER}%"})
            conn.execute(text(
                "DELETE FROM users WHERE email LIKE :m"
            ), {"m": f"{FAKE_USER_MARKER}%"})
            print("[CLEAR] Xong.")

        # Đảm bảo đủ fake users
        user_ids = ensure_fake_users(conn, args.users)
        if not user_ids:
            print("[ERROR] Không thể tạo user.")
            return

        # ── 1. user_interactions ──────────────────────────────────
        print("[SEED] Tạo user_interactions...")
        n_interactions = 0
        for user_id in user_ids:
            n_hotels = random.randint(3, 12)
            chosen = random.sample(hotel_ids, min(n_hotels, len(hotel_ids)))
            for hotel_id in chosen:
                for _ in range(random.randint(1, 4)):
                    conn.execute(text("""
                        INSERT INTO user_interactions (user_id, entity_type, entity_id, action, created_at)
                        VALUES (:uid, 'hotel', :eid, :action, :ts)
                    """), {
                        "uid": user_id,
                        "eid": hotel_id,
                        "action": weighted_choice(ACTIONS),
                        "ts": rand_dt(180),
                    })
                    n_interactions += 1
        print(f"[SEED] ✓ {n_interactions} user_interactions")

        # ── 2. search_logs ────────────────────────────────────────
        print("[SEED] Tạo search_logs...")
        n_searches = 0
        for user_id in user_ids:
            for _ in range(random.randint(2, 8)):
                conn.execute(text("""
                    INSERT INTO search_logs (user_id, keyword, created_at)
                    VALUES (:uid, :kw, :ts)
                """), {
                    "uid": user_id,
                    "kw": random.choice(SEARCH_KEYWORDS),
                    "ts": rand_dt(90),
                })
                n_searches += 1
        print(f"[SEED] ✓ {n_searches} search_logs")

        # ── 3. reviews ────────────────────────────────────────────
        print("[SEED] Tạo reviews...")
        n_reviews = 0
        for hotel_id in hotel_ids:
            n = random.randint(2, 8)
            reviewers = random.sample(user_ids, min(n, len(user_ids)))
            for user_id in reviewers:
                exists = conn.execute(text("""
                    SELECT review_id FROM reviews
                    WHERE user_id=:uid AND entity_type='hotel' AND entity_id=:eid LIMIT 1
                """), {"uid": user_id, "eid": hotel_id}).fetchone()
                if exists:
                    continue
                rating = random.choices([1,2,3,4,5], weights=[2,3,10,35,50])[0]
                conn.execute(text("""
                    INSERT INTO reviews (user_id, entity_type, entity_id, rating, comment, created_at)
                    VALUES (:uid, 'hotel', :eid, :rating, :comment, :ts)
                """), {
                    "uid": user_id, "eid": hotel_id, "rating": rating,
                    "comment": random.choice(REVIEW_COMMENTS),
                    "ts": rand_dt(365),
                })
                n_reviews += 1
        print(f"[SEED] ✓ {n_reviews} reviews")

        # ── 4. Cập nhật avg_rating ────────────────────────────────
        print("[SEED] Cập nhật avg_rating hotels...")
        conn.execute(text("""
            UPDATE hotels h
            SET avg_rating = (
                SELECT COALESCE(AVG(r.rating), 0)
                FROM reviews r
                WHERE r.entity_type = 'hotel' AND r.entity_id = h.hotel_id
            )
        """))
        print("[SEED] ✓ avg_rating cập nhật xong.")

    print("\n✅ Seed hoàn tất! Chạy tiếp:")
    print("   python -m ml.train\n")


if __name__ == "__main__":
    main()
