"""
Seed dữ liệu máy bay + xe khách:
  - 50 chuyến bay / ngày  (22/04/2026 → 05/05/2026)
  - 50 chuyến xe  / ngày  (22/04/2026 → 05/05/2026)
Chạy:  python -m scripts.seed_flights_buses   (từ thư mục backend/)
"""

from datetime import date, datetime, timedelta
import random
from database import engine
from sqlalchemy import text

# ═══════════════════════════════════════════════════════════════════
# ── FLIGHTS CONFIG ────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════

AIRLINES = [
    "Vietnam Airlines",
    "VietJet Air",
    "Bamboo Airways",
    "Korean Air",
    "Singapore Airlines",
]

# 50 tuyến bay đa dạng (nội địa + quốc tế)
FLIGHT_ROUTES = [
    # ── Nội địa: Hà Nội ←→ ──────────────────────────────────────
    {"from": "Hà Nội",        "to": "Hồ Chí Minh",  "duration_h": 2,  "duration_m": 10, "price": 1200000},
    {"from": "Hồ Chí Minh",   "to": "Hà Nội",        "duration_h": 2,  "duration_m": 10, "price": 1200000},
    {"from": "Hà Nội",        "to": "Đà Nẵng",       "duration_h": 1,  "duration_m": 20, "price": 850000},
    {"from": "Đà Nẵng",       "to": "Hà Nội",        "duration_h": 1,  "duration_m": 20, "price": 850000},
    {"from": "Hà Nội",        "to": "Nha Trang",     "duration_h": 1,  "duration_m": 50, "price": 1100000},
    {"from": "Nha Trang",     "to": "Hà Nội",        "duration_h": 1,  "duration_m": 50, "price": 1100000},
    {"from": "Hà Nội",        "to": "Đà Lạt",        "duration_h": 1,  "duration_m": 55, "price": 1050000},
    {"from": "Đà Lạt",        "to": "Hà Nội",        "duration_h": 1,  "duration_m": 55, "price": 1050000},
    {"from": "Hà Nội",        "to": "Phú Quốc",      "duration_h": 2,  "duration_m": 20, "price": 1400000},
    {"from": "Phú Quốc",      "to": "Hà Nội",        "duration_h": 2,  "duration_m": 20, "price": 1400000},
    {"from": "Hà Nội",        "to": "Huế",           "duration_h": 1,  "duration_m": 10, "price": 750000},
    {"from": "Huế",           "to": "Hà Nội",        "duration_h": 1,  "duration_m": 10, "price": 750000},
    {"from": "Hà Nội",        "to": "Quy Nhơn",      "duration_h": 1,  "duration_m": 35, "price": 950000},
    {"from": "Hà Nội",        "to": "Cần Thơ",       "duration_h": 2,  "duration_m": 5,  "price": 1300000},
    {"from": "Hà Nội",        "to": "Hải Phòng",     "duration_h": 0,  "duration_m": 50, "price": 550000},

    # ── Nội địa: HCM ←→ ─────────────────────────────────────────
    {"from": "Hồ Chí Minh",   "to": "Đà Nẵng",       "duration_h": 1,  "duration_m": 25, "price": 900000},
    {"from": "Đà Nẵng",       "to": "Hồ Chí Minh",   "duration_h": 1,  "duration_m": 25, "price": 900000},
    {"from": "Hồ Chí Minh",   "to": "Nha Trang",     "duration_h": 1,  "duration_m": 0,  "price": 650000},
    {"from": "Nha Trang",     "to": "Hồ Chí Minh",   "duration_h": 1,  "duration_m": 0,  "price": 650000},
    {"from": "Hồ Chí Minh",   "to": "Đà Lạt",        "duration_h": 0,  "duration_m": 55, "price": 600000},
    {"from": "Đà Lạt",        "to": "Hồ Chí Minh",   "duration_h": 0,  "duration_m": 55, "price": 600000},
    {"from": "Hồ Chí Minh",   "to": "Phú Quốc",      "duration_h": 1,  "duration_m": 0,  "price": 750000},
    {"from": "Phú Quốc",      "to": "Hồ Chí Minh",   "duration_h": 1,  "duration_m": 0,  "price": 750000},
    {"from": "Hồ Chí Minh",   "to": "Huế",           "duration_h": 1,  "duration_m": 20, "price": 850000},
    {"from": "Hồ Chí Minh",   "to": "Quy Nhơn",      "duration_h": 1,  "duration_m": 10, "price": 700000},
    {"from": "Hồ Chí Minh",   "to": "Cần Thơ",       "duration_h": 0,  "duration_m": 50, "price": 500000},
    {"from": "Hồ Chí Minh",   "to": "Vinh",          "duration_h": 1,  "duration_m": 45, "price": 1000000},
    {"from": "Hồ Chí Minh",   "to": "Hải Phòng",     "duration_h": 2,  "duration_m": 5,  "price": 1250000},
    {"from": "Hồ Chí Minh",   "to": "Buôn Ma Thuột", "duration_h": 1,  "duration_m": 5,  "price": 650000},
    {"from": "Hồ Chí Minh",   "to": "Pleiku",        "duration_h": 1,  "duration_m": 10, "price": 700000},

    # ── Nội địa: Đà Nẵng ←→ ─────────────────────────────────────
    {"from": "Đà Nẵng",       "to": "Nha Trang",     "duration_h": 1,  "duration_m": 10, "price": 650000},
    {"from": "Đà Nẵng",       "to": "Đà Lạt",        "duration_h": 1,  "duration_m": 15, "price": 700000},
    {"from": "Đà Nẵng",       "to": "Cần Thơ",       "duration_h": 1,  "duration_m": 30, "price": 800000},
    {"from": "Đà Nẵng",       "to": "Phú Quốc",      "duration_h": 1,  "duration_m": 40, "price": 950000},

    # ── Quốc tế từ Hà Nội ───────────────────────────────────────
    {"from": "Hà Nội",        "to": "Seoul",         "duration_h": 4,  "duration_m": 30, "price": 4500000},
    {"from": "Seoul",         "to": "Hà Nội",        "duration_h": 4,  "duration_m": 30, "price": 4500000},
    {"from": "Hà Nội",        "to": "Singapore",     "duration_h": 4,  "duration_m": 0,  "price": 3800000},
    {"from": "Singapore",     "to": "Hà Nội",        "duration_h": 4,  "duration_m": 0,  "price": 3800000},
    {"from": "Hà Nội",        "to": "Tokyo",         "duration_h": 5,  "duration_m": 30, "price": 6500000},
    {"from": "Tokyo",         "to": "Hà Nội",        "duration_h": 5,  "duration_m": 30, "price": 6500000},
    {"from": "Hà Nội",        "to": "Bangkok",       "duration_h": 2,  "duration_m": 0,  "price": 2500000},
    {"from": "Bangkok",       "to": "Hà Nội",        "duration_h": 2,  "duration_m": 0,  "price": 2500000},

    # ── Quốc tế từ HCM ──────────────────────────────────────────
    {"from": "Hồ Chí Minh",   "to": "Seoul",         "duration_h": 5,  "duration_m": 0,  "price": 4800000},
    {"from": "Seoul",         "to": "Hồ Chí Minh",   "duration_h": 5,  "duration_m": 0,  "price": 4800000},
    {"from": "Hồ Chí Minh",   "to": "Singapore",     "duration_h": 2,  "duration_m": 10, "price": 3200000},
    {"from": "Singapore",     "to": "Hồ Chí Minh",   "duration_h": 2,  "duration_m": 10, "price": 3200000},
    {"from": "Hồ Chí Minh",   "to": "Tokyo",         "duration_h": 6,  "duration_m": 0,  "price": 7000000},
    {"from": "Hồ Chí Minh",   "to": "Bangkok",       "duration_h": 1,  "duration_m": 45, "price": 2200000},
    {"from": "Hồ Chí Minh",   "to": "Kuala Lumpur",  "duration_h": 2,  "duration_m": 15, "price": 2800000},
    {"from": "Hồ Chí Minh",   "to": "Taipei",        "duration_h": 3,  "duration_m": 30, "price": 3500000},
]

# Giờ khởi hành trong ngày (phân bố đều)
FLIGHT_DEPART_HOURS = [
    (5, 0), (5, 30), (6, 0), (6, 30), (6, 45),
    (7, 0), (7, 15), (7, 30), (7, 45), (8, 0),
    (8, 30), (9, 0), (9, 30), (10, 0), (10, 30),
    (11, 0), (11, 30), (12, 0), (12, 30), (13, 0),
    (13, 30), (14, 0), (14, 30), (15, 0), (15, 30),
    (16, 0), (16, 30), (17, 0), (17, 30), (18, 0),
    (18, 30), (19, 0), (19, 30), (20, 0), (20, 30),
    (21, 0), (21, 30), (22, 0), (22, 30), (23, 0),
    (5, 15), (6, 15), (7, 50), (8, 15), (9, 15),
    (10, 15), (14, 15), (16, 15), (18, 15), (20, 15),
]


def make_flight_seats() -> list[tuple]:
    """
    Trả về list (seat_number, seat_class)
    Economy:  120 ghế (20 hàng × A–F)
    Business:  30 ghế ( 5 hàng × A–F)
    First:     10 ghế ( 5 hàng × A–B)
    Tổng: 160 ghế/chuyến
    """
    seats = []
    # Economy: hàng 10–29, cột A–F
    for row in range(10, 30):
        for col in ["A", "B", "C", "D", "E", "F"]:
            seats.append((f"{row}{col}", "economy"))
    # Business: hàng 1–5, cột A–F
    for row in range(1, 6):
        for col in ["A", "B", "C", "D", "E", "F"]:
            seats.append((f"{row}{col}", "business"))
    # First: hàng 1–5, cột A–B
    for row in range(1, 6):
        for col in ["A", "B"]:
            seats.append((f"F{row}{col}", "first"))
    return seats


# ═══════════════════════════════════════════════════════════════════
# ── BUS CONFIG ────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════

BUS_COMPANIES = [
    "Phương Trang",
    "Futa Bus",
    "Hoàng Long",
    "Mai Linh",
    "Kumho Samco",
    "Thanh Buổi",
]

# 50 tuyến xe khách
BUS_ROUTES = [
    # ── HCM ←→ Miền Tây ─────────────────────────────────────────
    {"from": "Hồ Chí Minh", "to": "Cần Thơ",      "duration_h": 4,  "duration_m": 0,  "price": 200000},
    {"from": "Cần Thơ",     "to": "Hồ Chí Minh",   "duration_h": 4,  "duration_m": 0,  "price": 200000},
    {"from": "Hồ Chí Minh", "to": "Vũng Tàu",     "duration_h": 2,  "duration_m": 30, "price": 120000},
    {"from": "Vũng Tàu",    "to": "Hồ Chí Minh",   "duration_h": 2,  "duration_m": 30, "price": 120000},
    {"from": "Hồ Chí Minh", "to": "Đà Lạt",        "duration_h": 7,  "duration_m": 0,  "price": 280000},
    {"from": "Đà Lạt",      "to": "Hồ Chí Minh",   "duration_h": 7,  "duration_m": 0,  "price": 280000},
    {"from": "Hồ Chí Minh", "to": "Mỹ Tho",       "duration_h": 2,  "duration_m": 0,  "price": 100000},
    {"from": "Mỹ Tho",      "to": "Hồ Chí Minh",   "duration_h": 2,  "duration_m": 0,  "price": 100000},
    {"from": "Hồ Chí Minh", "to": "Long Xuyên",   "duration_h": 5,  "duration_m": 0,  "price": 220000},
    {"from": "Hồ Chí Minh", "to": "Rạch Giá",     "duration_h": 6,  "duration_m": 30, "price": 260000},
    {"from": "Hồ Chí Minh", "to": "Cà Mau",       "duration_h": 8,  "duration_m": 0,  "price": 300000},
    {"from": "Hồ Chí Minh", "to": "Bến Tre",      "duration_h": 2,  "duration_m": 30, "price": 130000},
    {"from": "Hồ Chí Minh", "to": "Sóc Trăng",    "duration_h": 5,  "duration_m": 30, "price": 230000},
    {"from": "Hồ Chí Minh", "to": "Trà Vinh",     "duration_h": 3,  "duration_m": 30, "price": 170000},

    # ── HCM ←→ Miền Trung ───────────────────────────────────────
    {"from": "Hồ Chí Minh", "to": "Nha Trang",    "duration_h": 9,  "duration_m": 0,  "price": 320000},
    {"from": "Nha Trang",   "to": "Hồ Chí Minh",   "duration_h": 9,  "duration_m": 0,  "price": 320000},
    {"from": "Hồ Chí Minh", "to": "Phan Thiết",   "duration_h": 4,  "duration_m": 30, "price": 180000},
    {"from": "Phan Thiết",  "to": "Hồ Chí Minh",   "duration_h": 4,  "duration_m": 30, "price": 180000},
    {"from": "Hồ Chí Minh", "to": "Quy Nhơn",     "duration_h": 11, "duration_m": 0,  "price": 380000},
    {"from": "Hồ Chí Minh", "to": "Buôn Ma Thuột","duration_h": 8,  "duration_m": 0,  "price": 300000},
    {"from": "Hồ Chí Minh", "to": "Pleiku",       "duration_h": 10, "duration_m": 0,  "price": 350000},

    # ── HCM ←→ Miền Đông ────────────────────────────────────────
    {"from": "Hồ Chí Minh", "to": "Biên Hòa",     "duration_h": 1,  "duration_m": 30, "price": 60000},
    {"from": "Hồ Chí Minh", "to": "Tây Ninh",     "duration_h": 3,  "duration_m": 0,  "price": 130000},
    {"from": "Hồ Chí Minh", "to": "Bình Phước",   "duration_h": 3,  "duration_m": 30, "price": 150000},

    # ── Hà Nội ←→ ───────────────────────────────────────────────
    {"from": "Hà Nội",      "to": "Hải Phòng",    "duration_h": 2,  "duration_m": 30, "price": 100000},
    {"from": "Hải Phòng",   "to": "Hà Nội",        "duration_h": 2,  "duration_m": 30, "price": 100000},
    {"from": "Hà Nội",      "to": "Ninh Bình",    "duration_h": 2,  "duration_m": 0,  "price": 90000},
    {"from": "Ninh Bình",   "to": "Hà Nội",        "duration_h": 2,  "duration_m": 0,  "price": 90000},
    {"from": "Hà Nội",      "to": "Sapa",          "duration_h": 6,  "duration_m": 0,  "price": 350000},
    {"from": "Sapa",         "to": "Hà Nội",        "duration_h": 6,  "duration_m": 0,  "price": 350000},
    {"from": "Hà Nội",      "to": "Hạ Long",       "duration_h": 4,  "duration_m": 0,  "price": 200000},
    {"from": "Hạ Long",      "to": "Hà Nội",        "duration_h": 4,  "duration_m": 0,  "price": 200000},
    {"from": "Hà Nội",      "to": "Thanh Hóa",    "duration_h": 3,  "duration_m": 30, "price": 150000},
    {"from": "Thanh Hóa",   "to": "Hà Nội",        "duration_h": 3,  "duration_m": 30, "price": 150000},
    {"from": "Hà Nội",      "to": "Vinh",          "duration_h": 6,  "duration_m": 0,  "price": 250000},
    {"from": "Vinh",         "to": "Hà Nội",        "duration_h": 6,  "duration_m": 0,  "price": 250000},
    {"from": "Hà Nội",      "to": "Nam Định",     "duration_h": 2,  "duration_m": 0,  "price": 80000},
    {"from": "Hà Nội",      "to": "Thái Nguyên",  "duration_h": 2,  "duration_m": 0,  "price": 85000},
    {"from": "Hà Nội",      "to": "Lạng Sơn",     "duration_h": 3,  "duration_m": 30, "price": 160000},
    {"from": "Hà Nội",      "to": "Hà Giang",     "duration_h": 7,  "duration_m": 0,  "price": 300000},
    {"from": "Hà Nội",      "to": "Điện Biên",    "duration_h": 10, "duration_m": 0,  "price": 400000},
    {"from": "Hà Nội",      "to": "Mộc Châu",     "duration_h": 5,  "duration_m": 0,  "price": 220000},
    {"from": "Hà Nội",      "to": "Mai Châu",     "duration_h": 4,  "duration_m": 0,  "price": 180000},

    # ── Đà Nẵng ←→ ──────────────────────────────────────────────
    {"from": "Đà Nẵng",     "to": "Huế",           "duration_h": 2,  "duration_m": 30, "price": 110000},
    {"from": "Huế",          "to": "Đà Nẵng",       "duration_h": 2,  "duration_m": 30, "price": 110000},
    {"from": "Đà Nẵng",     "to": "Hội An",        "duration_h": 1,  "duration_m": 0,  "price": 50000},
    {"from": "Hội An",       "to": "Đà Nẵng",       "duration_h": 1,  "duration_m": 0,  "price": 50000},
    {"from": "Đà Nẵng",     "to": "Quy Nhơn",     "duration_h": 5,  "duration_m": 0,  "price": 200000},
    {"from": "Đà Nẵng",     "to": "Quảng Ngãi",   "duration_h": 3,  "duration_m": 0,  "price": 140000},
    {"from": "Nha Trang",   "to": "Đà Lạt",        "duration_h": 3,  "duration_m": 30, "price": 150000},
    {"from": "Đà Lạt",      "to": "Nha Trang",     "duration_h": 3,  "duration_m": 30, "price": 150000},
]

BUS_DEPART_HOURS = [
    (4, 0),  (4, 30), (5, 0),  (5, 30), (6, 0),
    (6, 30), (7, 0),  (7, 30), (8, 0),  (8, 30),
    (9, 0),  (9, 30), (10, 0), (10, 30), (11, 0),
    (11, 30),(12, 0), (12, 30),(13, 0), (13, 30),
    (14, 0), (14, 30),(15, 0), (15, 30),(16, 0),
    (16, 30),(17, 0), (17, 30),(18, 0), (18, 30),
    (19, 0), (19, 30),(20, 0), (20, 30),(21, 0),
    (21, 30),(22, 0), (22, 30),(23, 0), (23, 30),
    (4, 15), (5, 15), (6, 15), (7, 15), (8, 15),
    (14, 15),(16, 15),(18, 15),(20, 15),(22, 15),
]


def make_bus_seats() -> list[tuple]:
    """
    Trả về list (seat_number, seat_class)
    Standard: 25 ghế (A01–A25)
    VIP:      10 ghế (V01–V10)
    Sleeper:  15 ghế (S01–S15)
    Tổng: 50 ghế/xe
    """
    seats = []
    for i in range(1, 26):
        seats.append((f"A{i:02d}", "standard"))
    for i in range(1, 11):
        seats.append((f"V{i:02d}", "vip"))
    for i in range(1, 16):
        seats.append((f"S{i:02d}", "sleeper"))
    return seats


# ═══════════════════════════════════════════════════════════════════
# ── MAIN ──────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════

def run():
    start = date(2026, 4, 22)
    end   = date(2026, 5, 5)
    num_days = (end - start).days + 1   # 14 ngày

    total_flights = 0
    total_flight_seats = 0
    total_buses = 0
    total_bus_seats = 0

    random.seed(42)  # kết quả ổn định

    flight_seat_template = make_flight_seats()
    bus_seat_template    = make_bus_seats()

    with engine.begin() as conn:
        # ── SEED FLIGHTS ─────────────────────────────────────────
        current = start
        while current <= end:
            # Chọn 50 chuyến cho ngày này
            day_routes = []
            shuffled = list(range(len(FLIGHT_ROUTES)))
            random.shuffle(shuffled)
            for idx in shuffled[:50]:
                day_routes.append(idx)
            # Nếu ít hơn 50 tuyến, lặp lại
            while len(day_routes) < 50:
                extra = list(range(len(FLIGHT_ROUTES)))
                random.shuffle(extra)
                day_routes.extend(extra[:50 - len(day_routes)])

            for i, route_idx in enumerate(day_routes):
                route = FLIGHT_ROUTES[route_idx]
                airline = AIRLINES[i % len(AIRLINES)]
                h, m = FLIGHT_DEPART_HOURS[i]

                depart = datetime(current.year, current.month, current.day, h, m)
                arrive = depart + timedelta(hours=route["duration_h"], minutes=route["duration_m"])

                # Biến thiên giá ±15%
                price_factor = 1.0 + random.uniform(-0.15, 0.15)
                price = round(route["price"] * price_factor / 1000) * 1000

                result = conn.execute(text("""
                    INSERT INTO flights (airline, from_city, to_city, depart_time, arrive_time, price, status)
                    VALUES (:airline, :from_city, :to_city, :depart, :arrive, :price, 'active')
                """), {
                    "airline":   airline,
                    "from_city": route["from"],
                    "to_city":   route["to"],
                    "depart":    depart,
                    "arrive":    arrive,
                    "price":     price,
                })
                flight_id = result.lastrowid
                total_flights += 1

                # Insert seats
                for (seat_num, seat_class) in flight_seat_template:
                    conn.execute(text("""
                        INSERT INTO flight_seats (flight_id, seat_number, seat_class, is_booked)
                        VALUES (:fid, :seat, :cls, 0)
                    """), {
                        "fid":  flight_id,
                        "seat": seat_num,
                        "cls":  seat_class,
                    })
                    total_flight_seats += 1

            current += timedelta(days=1)

        # ── SEED BUSES ───────────────────────────────────────────
        current = start
        while current <= end:
            day_routes = []
            shuffled = list(range(len(BUS_ROUTES)))
            random.shuffle(shuffled)
            for idx in shuffled[:50]:
                day_routes.append(idx)
            while len(day_routes) < 50:
                extra = list(range(len(BUS_ROUTES)))
                random.shuffle(extra)
                day_routes.extend(extra[:50 - len(day_routes)])

            for i, route_idx in enumerate(day_routes):
                route = BUS_ROUTES[route_idx]
                company = BUS_COMPANIES[i % len(BUS_COMPANIES)]
                h, m = BUS_DEPART_HOURS[i]

                depart = datetime(current.year, current.month, current.day, h, m)
                arrive = depart + timedelta(hours=route["duration_h"], minutes=route["duration_m"])

                # Biến thiên giá ±10%
                price_factor = 1.0 + random.uniform(-0.10, 0.10)
                price = round(route["price"] * price_factor / 1000) * 1000

                result = conn.execute(text("""
                    INSERT INTO buses (company, from_city, to_city, depart_time, arrive_time, price, status)
                    VALUES (:company, :from_city, :to_city, :depart, :arrive, :price, 'active')
                """), {
                    "company":   company,
                    "from_city": route["from"],
                    "to_city":   route["to"],
                    "depart":    depart,
                    "arrive":    arrive,
                    "price":     price,
                })
                bus_id = result.lastrowid
                total_buses += 1

                # Insert seats
                for (seat_num, seat_class) in bus_seat_template:
                    conn.execute(text("""
                        INSERT INTO bus_seats (bus_id, seat_number, seat_class, is_booked)
                        VALUES (:bid, :seat, :cls, 0)
                    """), {
                        "bid":  bus_id,
                        "seat": seat_num,
                        "cls":  seat_class,
                    })
                    total_bus_seats += 1

            current += timedelta(days=1)

    print("=" * 60)
    print("✅ SEED HOÀN TẤT!")
    print("=" * 60)
    print()
    print(f"📅 Từ {start} đến {end} ({num_days} ngày)")
    print()
    print(f"✈️  Chuyến bay : {total_flights:,} chuyến ({total_flights // num_days}/ngày)")
    print(f"    Ghế bay    : {total_flight_seats:,} ghế")
    print(f"    (Economy 120 + Business 30 + First 10 = 160 ghế/chuyến)")
    print()
    print(f"🚌 Xe khách   : {total_buses:,} chuyến ({total_buses // num_days}/ngày)")
    print(f"    Ghế xe     : {total_bus_seats:,} ghế")
    print(f"    (Standard 25 + VIP 10 + Sleeper 15 = 50 ghế/xe)")
    print()
    print(f"📊 Tổng cộng  : {total_flights + total_buses:,} chuyến, "
          f"{total_flight_seats + total_bus_seats:,} ghế")
    print()
    print("Hãng bay:", ", ".join(AIRLINES))
    print("Nhà xe:  ", ", ".join(BUS_COMPANIES))


if __name__ == "__main__":
    run()
