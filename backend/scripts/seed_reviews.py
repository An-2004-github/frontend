"""
Seed reviews: 20-30 reviews per hotel, 1 review per user per hotel.
"""
import sys, os, random
from datetime import datetime, timedelta
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

# ── Comment pools by rating ───────────────────────────────────────────────────

COMMENTS_5 = [
    "Khách sạn tuyệt vời, dịch vụ đẳng cấp 5 sao thực sự. Nhân viên rất thân thiện và chuyên nghiệp.",
    "Phòng rộng rãi, sạch sẽ, view đẹp. Bữa sáng phong phú, mình sẽ quay lại lần sau.",
    "Vị trí cực thuận tiện, gần trung tâm. Đặc biệt ấn tượng với spa và hồ bơi của khách sạn.",
    "Trải nghiệm lưu trú tuyệt vời nhất từ trước đến nay. Giường cực êm, phòng cực sang.",
    "Nhân viên lễ tân rất nhiệt tình hỗ trợ. Check-in/out nhanh chóng, không phải chờ đợi.",
    "Đồ ăn nhà hàng khách sạn ngon xuất sắc, đặc biệt là món buffet sáng. Rất xứng đáng.",
    "Hồ bơi vô cực view biển đẹp mê hồn. Phòng thiết kế hiện đại, tiện nghi đầy đủ.",
    "Dịch vụ phòng nhanh, đồ uống minibar đa dạng. Mọi thứ đều hoàn hảo từ A đến Z.",
    "Khách sạn xứng danh 5 sao quốc tế. Sẽ giới thiệu cho bạn bè và gia đình.",
    "Check-in lúc 2h sáng vẫn được phục vụ chu đáo. Cảm ơn đội ngũ nhân viên tận tâm!",
    "Phòng suite rộng lớn với view toàn cảnh thành phố. Giá cả xứng đáng với chất lượng.",
    "Bể bơi và khu vực thư giãn rất yên tĩnh và sạch sẽ. Trẻ em rất thích nơi này.",
    "Ẩm thực tại nhà hàng khách sạn đa dạng và ngon. Đặc biệt thích món hải sản tươi sống.",
    "Trợ lý concierge hỗ trợ đặt tour rất nhiệt tình. Chuyến đi thêm phần trọn vẹn.",
    "Phòng luôn được dọn dẹp tinh tươm. Hoa tươi mỗi ngày khiến không gian thêm ấm cúng.",
]

COMMENTS_4 = [
    "Khách sạn tốt, phòng sạch sẽ và thoải mái. Sẽ cân nhắc quay lại lần sau.",
    "Vị trí đẹp, tiện di chuyển. Nhân viên thân thiện, dịch vụ ổn. Bữa sáng khá ngon.",
    "Phòng rộng, tiện nghi cơ bản đầy đủ. Hơi tiếc là view không đẹp như hình quảng cáo.",
    "Nhìn chung hài lòng với kỳ nghỉ này. Hồ bơi sạch, đồ ăn sáng đa dạng.",
    "Dịch vụ tốt, phòng thoáng mát. Chỉ cần cải thiện thêm tốc độ WiFi là hoàn hảo.",
    "Giá cả hợp lý so với chất lượng. Nhân viên nhiệt tình, phòng tiện nghi.",
    "Khách sạn đẹp, sạch sẽ. Vị trí thuận tiện gần các điểm tham quan.",
    "Bữa sáng khá đa dạng với nhiều lựa chọn. Nhân viên lễ tân nói tiếng Anh tốt.",
    "Phòng có thiết kế hiện đại, ánh sáng tốt. Giường ngủ êm ái, ngủ ngon.",
    "Trải nghiệm tốt, hơi ồn một chút do gần đường lớn nhưng không đáng kể.",
    "Khách sạn sang trọng với giá vừa phải. Sẽ giới thiệu cho bạn bè.",
    "Không gian lobby rất ấn tượng. Phòng sạch, view đẹp, dịch vụ chu đáo.",
    "Hài lòng với chuyến nghỉ dưỡng lần này. Nhân viên tận tâm, phòng tiện nghi.",
    "Vị trí thuận lợi, check-in nhanh. Chỉ một điểm trừ nhỏ là phòng hơi nhỏ.",
    "Trải nghiệm tốt hơn mong đợi. Nhà hàng ngon, giá cả phù hợp.",
]

COMMENTS_3 = [
    "Khách sạn ở mức trung bình. Phòng sạch nhưng hơi cũ, cần nâng cấp thêm.",
    "Dịch vụ chấp nhận được. WiFi đôi lúc chập chờn, cần cải thiện.",
    "Vị trí tốt nhưng tiếng ồn nhiều vào buổi tối. Phòng cơ bản, không có gì nổi bật.",
    "Giá và chất lượng ở mức tương đương. Bữa sáng hơi ít lựa chọn.",
    "Phòng sạch, nhân viên thân thiện. Hồ bơi cần vệ sinh thêm.",
    "Tạm ổn cho một chuyến đi ngắn. Không gian nhỏ hơn hình trên web.",
    "Nhân viên nhiệt tình nhưng dịch vụ phòng hơi chậm. Cần cải thiện.",
    "Trang thiết bị cũ, cần nâng cấp. Vị trí thuận tiện là điểm cộng.",
]

COMMENTS_2 = [
    "Phòng nhỏ hơn so với mô tả, điều hòa hoạt động không tốt. Hơi thất vọng.",
    "Dịch vụ chậm, nhân viên không chủ động hỗ trợ. Bữa sáng nghèo nàn.",
    "Không tương xứng với giá tiền. Phòng cũ, tiếng ồn nhiều.",
]

def pick_comment(rating: int) -> str:
    if rating == 5:
        return random.choice(COMMENTS_5)
    elif rating == 4:
        return random.choice(COMMENTS_4)
    elif rating == 3:
        return random.choice(COMMENTS_3)
    else:
        return random.choice(COMMENTS_2)

def random_rating() -> int:
    """Phân phối thực tế: chủ yếu 4-5 sao."""
    return random.choices([5, 4, 3, 2], weights=[45, 35, 15, 5])[0]

def random_date() -> str:
    """Ngày ngẫu nhiên trong 12 tháng gần đây."""
    days_ago = random.randint(1, 365)
    dt = datetime.now() - timedelta(days=days_ago)
    return dt.strftime("%Y-%m-%d %H:%M:%S")

# ── Main ─────────────────────────────────────────────────────────────────────

with engine.begin() as conn:
    # Lấy danh sách hotel_id
    hotels = [r[0] for r in conn.execute(text("SELECT hotel_id FROM hotels ORDER BY hotel_id")).fetchall()]
    # Lấy danh sách user_id (loại admin user_id=3)
    users = [r[0] for r in conn.execute(text("SELECT user_id FROM users WHERE user_id != 3 ORDER BY user_id")).fetchall()]

    print(f"Hotels: {len(hotels)}, Users: {len(users)}")

    total_inserted = 0
    total_skipped = 0

    for hotel_id in hotels:
        # Xóa reviews cũ của hotel này (để seed lại sạch)
        conn.execute(text("DELETE FROM reviews WHERE entity_type='hotel' AND entity_id=:hid"), {"hid": hotel_id})

        # Chọn ngẫu nhiên 20-30 user cho hotel này
        count = random.randint(20, 30)
        chosen_users = random.sample(users, min(count, len(users)))

        for user_id in chosen_users:
            rating = random_rating()
            comment = pick_comment(rating)
            created_at = random_date()

            conn.execute(text("""
                INSERT INTO reviews (user_id, entity_type, entity_id, rating, comment, created_at)
                VALUES (:uid, 'hotel', :hid, :rating, :comment, :created_at)
            """), {
                "uid": user_id,
                "hid": hotel_id,
                "rating": rating,
                "comment": comment,
                "created_at": created_at,
            })
            total_inserted += 1

        # Cập nhật avg_rating và review_count cho hotel
        conn.execute(text("""
            UPDATE hotels
            SET avg_rating = (
                    SELECT ROUND(AVG(rating), 1) FROM reviews
                    WHERE entity_type = 'hotel' AND entity_id = :hid
                ),
                review_count = (
                    SELECT COUNT(*) FROM reviews
                    WHERE entity_type = 'hotel' AND entity_id = :hid
                )
            WHERE hotel_id = :hid
        """), {"hid": hotel_id})

        print(f"  Hotel {hotel_id}: {len(chosen_users)} reviews inserted")

    print(f"\nDone! Inserted {total_inserted} reviews across {len(hotels)} hotels.")
