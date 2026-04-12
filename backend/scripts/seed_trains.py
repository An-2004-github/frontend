"""
Seed dữ liệu tàu hỏa: 10 tuyến/ngày từ hôm nay đến 01/05/2026
Chạy: python -m scripts.seed_trains   (từ thư mục backend/)
"""
from datetime import date, datetime, timedelta
from database import engine
from sqlalchemy import text

# ── Cấu hình 10 tuyến tàu ──────────────────────────────────────────
ROUTES = [
    {
        "code": "SE1",
        "from_city": "Hà Nội",    "to_city": "Hồ Chí Minh",
        "from_station": "Ga Hà Nội", "to_station": "Ga Sài Gòn",
        "depart_h": 6,  "depart_m": 0,  "duration_h": 30,
        "prices": {"hard_seat": 350000, "soft_seat": 530000, "hard_sleeper": 700000, "soft_sleeper": 950000},
    },
    {
        "code": "SE2",
        "from_city": "Hồ Chí Minh", "to_city": "Hà Nội",
        "from_station": "Ga Sài Gòn", "to_station": "Ga Hà Nội",
        "depart_h": 7,  "depart_m": 0,  "duration_h": 30,
        "prices": {"hard_seat": 350000, "soft_seat": 530000, "hard_sleeper": 700000, "soft_sleeper": 950000},
    },
    {
        "code": "SE3",
        "from_city": "Hà Nội",    "to_city": "Đà Nẵng",
        "from_station": "Ga Hà Nội", "to_station": "Ga Đà Nẵng",
        "depart_h": 7,  "depart_m": 30, "duration_h": 13,
        "prices": {"hard_seat": 180000, "soft_seat": 280000, "hard_sleeper": 420000, "soft_sleeper": 580000},
    },
    {
        "code": "SE4",
        "from_city": "Đà Nẵng",   "to_city": "Hà Nội",
        "from_station": "Ga Đà Nẵng", "to_station": "Ga Hà Nội",
        "depart_h": 14, "depart_m": 0,  "duration_h": 13,
        "prices": {"hard_seat": 180000, "soft_seat": 280000, "hard_sleeper": 420000, "soft_sleeper": 580000},
    },
    {
        "code": "SE5",
        "from_city": "Hà Nội",    "to_city": "Huế",
        "from_station": "Ga Hà Nội", "to_station": "Ga Huế",
        "depart_h": 20, "depart_m": 0,  "duration_h": 13,
        "prices": {"hard_seat": 200000, "soft_seat": 310000, "hard_sleeper": 460000, "soft_sleeper": 630000},
    },
    {
        "code": "SE6",
        "from_city": "Huế",       "to_city": "Hà Nội",
        "from_station": "Ga Huế", "to_station": "Ga Hà Nội",
        "depart_h": 20, "depart_m": 30, "duration_h": 13,
        "prices": {"hard_seat": 200000, "soft_seat": 310000, "hard_sleeper": 460000, "soft_sleeper": 630000},
    },
    {
        "code": "SE7",
        "from_city": "Hồ Chí Minh", "to_city": "Nha Trang",
        "from_station": "Ga Sài Gòn", "to_station": "Ga Nha Trang",
        "depart_h": 8,  "depart_m": 0,  "duration_h": 7,
        "prices": {"hard_seat": 150000, "soft_seat": 230000, "hard_sleeper": 350000, "soft_sleeper": 480000},
    },
    {
        "code": "SE8",
        "from_city": "Nha Trang",  "to_city": "Hồ Chí Minh",
        "from_station": "Ga Nha Trang", "to_station": "Ga Sài Gòn",
        "depart_h": 15, "depart_m": 0,  "duration_h": 7,
        "prices": {"hard_seat": 150000, "soft_seat": 230000, "hard_sleeper": 350000, "soft_sleeper": 480000},
    },
    {
        "code": "TN1",
        "from_city": "Hà Nội",    "to_city": "Hải Phòng",
        "from_station": "Ga Hà Nội", "to_station": "Ga Hải Phòng",
        "depart_h": 6,  "depart_m": 30, "duration_h": 2,
        "prices": {"hard_seat": 45000,  "soft_seat": 65000,  "hard_sleeper": None, "soft_sleeper": None},
    },
    {
        "code": "TN2",
        "from_city": "Hải Phòng", "to_city": "Hà Nội",
        "from_station": "Ga Hải Phòng", "to_station": "Ga Hà Nội",
        "depart_h": 9,  "depart_m": 0,  "duration_h": 2,
        "prices": {"hard_seat": 45000,  "soft_seat": 65000,  "hard_sleeper": None, "soft_sleeper": None},
    },
]

# ── Ghế mỗi toa (chuẩn tàu VN) ───────────────────────────────────
def make_seats(prices: dict) -> list[tuple]:
    """
    Trả về list (coach, seat_number, seat_class, price)
    Toa T1: Ngồi cứng  — 64 ghế (16 hàng × A B C D)
    Toa T2: Ngồi mềm   — 56 ghế (14 hàng × A B C D)
    Toa T3: Nằm cứng   — 48 ghế (8 khoang × 6 giường: 1T-3T trái/phải)
    Toa T4: Nằm mềm    — 28 ghế (7 khoang × 4 giường: T/D trái/phải)
    """
    seats = []

    # T1 — Ngồi cứng: 16 hàng × 4 ghế
    for row in range(1, 17):
        for col in ["A", "B", "C", "D"]:
            seats.append(("T1", f"{row:02d}{col}", "hard_seat", prices["hard_seat"]))

    # T2 — Ngồi mềm: 14 hàng × 4 ghế
    for row in range(1, 15):
        for col in ["A", "B", "C", "D"]:
            seats.append(("T2", f"{row:02d}{col}", "soft_seat", prices["soft_seat"]))

    # T3 — Nằm cứng: 8 khoang × 6 giường (trên/giữa/dưới × trái/phải)
    if prices["hard_sleeper"]:
        for comp in range(1, 9):
            for side in ["L", "R"]:
                for level in ["D", "G", "T"]:   # Dưới / Giữa / Trên
                    seats.append(("T3", f"{comp:02d}{side}{level}", "hard_sleeper", prices["hard_sleeper"]))

    # T4 — Nằm mềm: 7 khoang × 4 giường (trên/dưới × trái/phải)
    if prices["soft_sleeper"]:
        for comp in range(1, 8):
            for side in ["L", "R"]:
                for level in ["D", "T"]:         # Dưới / Trên
                    seats.append(("T4", f"{comp:02d}{side}{level}", "soft_sleeper", prices["soft_sleeper"]))

    return seats


def run():
    start = date.today()
    end   = date(2026, 5, 1)

    total_trains = 0
    total_seats  = 0

    with engine.begin() as conn:
        current = start
        while current <= end:
            for route in ROUTES:
                depart = datetime(current.year, current.month, current.day,
                                  route["depart_h"], route["depart_m"])
                arrive = depart + timedelta(hours=route["duration_h"])

                # Insert train
                result = conn.execute(text("""
                    INSERT INTO trains
                        (train_code, from_city, to_city, from_station, to_station,
                         depart_time, arrive_time, price, status)
                    VALUES
                        (:code, :from_city, :to_city, :from_station, :to_station,
                         :depart, :arrive, :price, 'active')
                """), {
                    "code":         route["code"],
                    "from_city":    route["from_city"],
                    "to_city":      route["to_city"],
                    "from_station": route["from_station"],
                    "to_station":   route["to_station"],
                    "depart":       depart,
                    "arrive":       arrive,
                    "price":        route["prices"]["hard_seat"],
                })
                train_id = result.lastrowid
                total_trains += 1

                # Insert seats
                seat_rows = make_seats(route["prices"])
                for (coach, seat_num, seat_class, price) in seat_rows:
                    conn.execute(text("""
                        INSERT INTO train_seats
                            (train_id, coach_number, seat_number, seat_class, price, is_booked)
                        VALUES
                            (:tid, :coach, :seat, :cls, :price, 0)
                    """), {
                        "tid":   train_id,
                        "coach": coach,
                        "seat":  seat_num,
                        "cls":   seat_class,
                        "price": price,
                    })
                    total_seats += 1

            current += timedelta(days=1)

    print(f"✅ Đã thêm {total_trains} chuyến tàu và {total_seats:,} ghế")
    print(f"   Từ {start} đến {end}")
    print()
    print("Tóm tắt mỗi tàu (tuyến dài):")
    print("  T1 - Ngồi cứng  : 64 ghế (16 hàng × 4)")
    print("  T2 - Ngồi mềm   : 56 ghế (14 hàng × 4)")
    print("  T3 - Nằm cứng   : 48 ghế (8 khoang × 6 giường)")
    print("  T4 - Nằm mềm    : 28 ghế (7 khoang × 4 giường)")
    print("  Tổng             : 196 ghế/tàu")
    print()
    print("Tuyến ngắn (TN1, TN2) chỉ có T1 + T2 (không có giường nằm):")
    print("  T1 - Ngồi cứng  : 64 ghế")
    print("  T2 - Ngồi mềm   : 56 ghế")
    print("  Tổng             : 120 ghế/tàu")


if __name__ == "__main__":
    run()
