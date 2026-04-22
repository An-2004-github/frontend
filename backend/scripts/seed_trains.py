# -*- coding: utf-8 -*-
"""
Seed du lieu tau hoa:
  - 50 chuyen tau / ngay  (22/04/2026 -> 05/05/2026)
  - Ten thanh pho lay tu bang destinations
Chay:  python -m scripts.seed_trains   (tu thu muc backend/)
"""

from datetime import date, datetime, timedelta
from database import engine
from sqlalchemy import text

# Ten thanh pho khop voi cot `city` trong bang destinations
HN        = "Hà Nội"          # Hà Nội
HCM       = "Hồ Chí Minh"  # Hồ Chí Minh
DA_NANG   = "Đà Nẵng"  # Đà Nẵng
HUE       = "Huế"                   # Huế
NHA_TRANG = "Nha Trang"
QUY_NHON  = "Quy Nhơn"  # Quy Nhơn
NINH_BINH = "Ninh Bình"  # Ninh Bình
THANH_HOA = "Thanh Hóa"  # Thanh Hóa
NGHE_AN   = "Nghệ An"  # Nghệ An
QUANG_BINH = "Quảng Bình"  # Quảng Bình
QUANG_NGAI = "Quảng Ngãi"  # Quảng Ngãi
PHU_YEN   = "Phú Yên"  # Phú Yên
PHAN_THIET = "Phan Thiết"  # Phan Thiết

# Ten ga tau tuong ung
GA_HN        = "Ga Hà Nội"
GA_HCM       = "Ga Sài Gòn"
GA_DA_NANG   = "Ga Đà Nẵng"
GA_HUE       = "Ga Huế"
GA_NHA_TRANG = "Ga Nha Trang"
GA_QUY_NHON  = "Ga Diêu Trì"
GA_NINH_BINH = "Ga Ninh Bình"
GA_THANH_HOA = "Ga Thanh Hóa"
GA_NGHE_AN   = "Ga Vinh"
GA_QUANG_BINH = "Ga Đồng Hới"
GA_QUANG_NGAI = "Ga Quảng Ngãi"
GA_PHU_YEN   = "Ga Tuy Hòa"
GA_PHAN_THIET = "Ga Phan Thiết"

# 50 lich trinh/ngay: (train_code, from_city, to_city, from_station, to_station,
#                      depart_h, depart_m, duration_h, prices_dict)
SCHEDULES = [
    # Ha Noi <-> Ho Chi Minh (10 chuyen, 30h)
    ("SE1",  HN,  HCM, GA_HN, GA_HCM,  6,  0, 30,
     {"hard_seat": 350000, "soft_seat": 530000, "hard_sleeper": 700000, "soft_sleeper": 950000}),
    ("SE2",  HCM, HN,  GA_HCM, GA_HN,  7,  0, 30,
     {"hard_seat": 350000, "soft_seat": 530000, "hard_sleeper": 700000, "soft_sleeper": 950000}),
    ("SE3",  HN,  HCM, GA_HN, GA_HCM, 10,  0, 30,
     {"hard_seat": 360000, "soft_seat": 545000, "hard_sleeper": 720000, "soft_sleeper": 980000}),
    ("SE4",  HCM, HN,  GA_HCM, GA_HN, 11,  0, 30,
     {"hard_seat": 360000, "soft_seat": 545000, "hard_sleeper": 720000, "soft_sleeper": 980000}),
    ("SE5",  HN,  HCM, GA_HN, GA_HCM, 14,  0, 30,
     {"hard_seat": 355000, "soft_seat": 535000, "hard_sleeper": 710000, "soft_sleeper": 960000}),
    ("SE6",  HCM, HN,  GA_HCM, GA_HN, 15,  0, 30,
     {"hard_seat": 355000, "soft_seat": 535000, "hard_sleeper": 710000, "soft_sleeper": 960000}),
    ("SE7",  HN,  HCM, GA_HN, GA_HCM, 19,  0, 30,
     {"hard_seat": 370000, "soft_seat": 555000, "hard_sleeper": 730000, "soft_sleeper": 990000}),
    ("SE8",  HCM, HN,  GA_HCM, GA_HN, 20,  0, 30,
     {"hard_seat": 370000, "soft_seat": 555000, "hard_sleeper": 730000, "soft_sleeper": 990000}),
    ("SE9",  HN,  HCM, GA_HN, GA_HCM, 22,  0, 30,
     {"hard_seat": 345000, "soft_seat": 525000, "hard_sleeper": 695000, "soft_sleeper": 940000}),
    ("SE10", HCM, HN,  GA_HCM, GA_HN, 23,  0, 30,
     {"hard_seat": 345000, "soft_seat": 525000, "hard_sleeper": 695000, "soft_sleeper": 940000}),

    # Ha Noi <-> Da Nang (6 chuyen, 13h)
    ("SE11", HN,      DA_NANG, GA_HN,      GA_DA_NANG,  6, 30, 13,
     {"hard_seat": 180000, "soft_seat": 280000, "hard_sleeper": 420000, "soft_sleeper": 580000}),
    ("SE12", DA_NANG, HN,      GA_DA_NANG, GA_HN,        7,  0, 13,
     {"hard_seat": 180000, "soft_seat": 280000, "hard_sleeper": 420000, "soft_sleeper": 580000}),
    ("SE13", HN,      DA_NANG, GA_HN,      GA_DA_NANG,  10,  0, 13,
     {"hard_seat": 185000, "soft_seat": 290000, "hard_sleeper": 430000, "soft_sleeper": 595000}),
    ("SE14", DA_NANG, HN,      GA_DA_NANG, GA_HN,       13,  0, 13,
     {"hard_seat": 185000, "soft_seat": 290000, "hard_sleeper": 430000, "soft_sleeper": 595000}),
    ("SE15", HN,      DA_NANG, GA_HN,      GA_DA_NANG,  20, 30, 13,
     {"hard_seat": 180000, "soft_seat": 285000, "hard_sleeper": 425000, "soft_sleeper": 585000}),
    ("SE16", DA_NANG, HN,      GA_DA_NANG, GA_HN,        5,  0, 13,
     {"hard_seat": 180000, "soft_seat": 285000, "hard_sleeper": 425000, "soft_sleeper": 585000}),

    # Ha Noi <-> Hue (4 chuyen, 13h)
    ("SE17", HN,  HUE, GA_HN,  GA_HUE,  8,  0, 13,
     {"hard_seat": 200000, "soft_seat": 310000, "hard_sleeper": 460000, "soft_sleeper": 630000}),
    ("SE18", HUE, HN,  GA_HUE, GA_HN,   9,  0, 13,
     {"hard_seat": 200000, "soft_seat": 310000, "hard_sleeper": 460000, "soft_sleeper": 630000}),
    ("SE19", HN,  HUE, GA_HN,  GA_HUE, 20,  0, 13,
     {"hard_seat": 205000, "soft_seat": 320000, "hard_sleeper": 470000, "soft_sleeper": 645000}),
    ("SE20", HUE, HN,  GA_HUE, GA_HN,  21,  0, 13,
     {"hard_seat": 205000, "soft_seat": 320000, "hard_sleeper": 470000, "soft_sleeper": 645000}),

    # Ha Noi <-> Ninh Binh (6 chuyen, 2h)
    ("TN1",  HN,        NINH_BINH, GA_HN,        GA_NINH_BINH,  6, 30, 2,
     {"hard_seat": 60000, "soft_seat": 90000, "hard_sleeper": None, "soft_sleeper": None}),
    ("TN2",  NINH_BINH, HN,        GA_NINH_BINH, GA_HN,         7, 30, 2,
     {"hard_seat": 60000, "soft_seat": 90000, "hard_sleeper": None, "soft_sleeper": None}),
    ("TN3",  HN,        NINH_BINH, GA_HN,        GA_NINH_BINH, 12,  0, 2,
     {"hard_seat": 60000, "soft_seat": 90000, "hard_sleeper": None, "soft_sleeper": None}),
    ("TN4",  NINH_BINH, HN,        GA_NINH_BINH, GA_HN,        13,  0, 2,
     {"hard_seat": 60000, "soft_seat": 90000, "hard_sleeper": None, "soft_sleeper": None}),
    ("TN5",  HN,        NINH_BINH, GA_HN,        GA_NINH_BINH, 18,  0, 2,
     {"hard_seat": 60000, "soft_seat": 90000, "hard_sleeper": None, "soft_sleeper": None}),
    ("TN6",  NINH_BINH, HN,        GA_NINH_BINH, GA_HN,        19,  0, 2,
     {"hard_seat": 60000, "soft_seat": 90000, "hard_sleeper": None, "soft_sleeper": None}),

    # Ha Noi <-> Thanh Hoa (4 chuyen, 3h)
    ("TN7",  HN,        THANH_HOA, GA_HN,        GA_THANH_HOA,  7,  0, 3,
     {"hard_seat": 80000, "soft_seat": 125000, "hard_sleeper": None, "soft_sleeper": None}),
    ("TN8",  THANH_HOA, HN,        GA_THANH_HOA, GA_HN,         8,  0, 3,
     {"hard_seat": 80000, "soft_seat": 125000, "hard_sleeper": None, "soft_sleeper": None}),
    ("TN9",  HN,        THANH_HOA, GA_HN,        GA_THANH_HOA, 15,  0, 3,
     {"hard_seat": 80000, "soft_seat": 125000, "hard_sleeper": None, "soft_sleeper": None}),
    ("TN10", THANH_HOA, HN,        GA_THANH_HOA, GA_HN,        16,  0, 3,
     {"hard_seat": 80000, "soft_seat": 125000, "hard_sleeper": None, "soft_sleeper": None}),

    # Ha Noi <-> Nghe An (4 chuyen, 5h)
    ("TN11", HN,      NGHE_AN, GA_HN,      GA_NGHE_AN,  6,  0, 5,
     {"hard_seat": 120000, "soft_seat": 185000, "hard_sleeper": 280000, "soft_sleeper": 380000}),
    ("TN12", NGHE_AN, HN,      GA_NGHE_AN, GA_HN,        7,  0, 5,
     {"hard_seat": 120000, "soft_seat": 185000, "hard_sleeper": 280000, "soft_sleeper": 380000}),
    ("TN13", HN,      NGHE_AN, GA_HN,      GA_NGHE_AN,  14,  0, 5,
     {"hard_seat": 125000, "soft_seat": 190000, "hard_sleeper": 285000, "soft_sleeper": 390000}),
    ("TN14", NGHE_AN, HN,      GA_NGHE_AN, GA_HN,       15,  0, 5,
     {"hard_seat": 125000, "soft_seat": 190000, "hard_sleeper": 285000, "soft_sleeper": 390000}),

    # Ho Chi Minh <-> Nha Trang (6 chuyen, 7h)
    ("TN15", HCM,       NHA_TRANG, GA_HCM,       GA_NHA_TRANG,  6,  0, 7,
     {"hard_seat": 150000, "soft_seat": 230000, "hard_sleeper": 350000, "soft_sleeper": 480000}),
    ("TN16", NHA_TRANG, HCM,       GA_NHA_TRANG, GA_HCM,        7,  0, 7,
     {"hard_seat": 150000, "soft_seat": 230000, "hard_sleeper": 350000, "soft_sleeper": 480000}),
    ("TN17", HCM,       NHA_TRANG, GA_HCM,       GA_NHA_TRANG, 10,  0, 7,
     {"hard_seat": 155000, "soft_seat": 240000, "hard_sleeper": 360000, "soft_sleeper": 495000}),
    ("TN18", NHA_TRANG, HCM,       GA_NHA_TRANG, GA_HCM,       15,  0, 7,
     {"hard_seat": 155000, "soft_seat": 240000, "hard_sleeper": 360000, "soft_sleeper": 495000}),
    ("TN19", HCM,       NHA_TRANG, GA_HCM,       GA_NHA_TRANG, 14,  0, 7,
     {"hard_seat": 150000, "soft_seat": 235000, "hard_sleeper": 355000, "soft_sleeper": 485000}),
    ("TN20", NHA_TRANG, HCM,       GA_NHA_TRANG, GA_HCM,       20,  0, 7,
     {"hard_seat": 150000, "soft_seat": 235000, "hard_sleeper": 355000, "soft_sleeper": 485000}),

    # Ho Chi Minh <-> Quy Nhon (4 chuyen, 10h)
    ("TN21", HCM,      QUY_NHON, GA_HCM,      GA_QUY_NHON,  8,  0, 10,
     {"hard_seat": 200000, "soft_seat": 310000, "hard_sleeper": 460000, "soft_sleeper": 630000}),
    ("TN22", QUY_NHON, HCM,      GA_QUY_NHON, GA_HCM,       9,  0, 10,
     {"hard_seat": 200000, "soft_seat": 310000, "hard_sleeper": 460000, "soft_sleeper": 630000}),
    ("TN23", HCM,      QUY_NHON, GA_HCM,      GA_QUY_NHON, 20,  0, 10,
     {"hard_seat": 205000, "soft_seat": 315000, "hard_sleeper": 465000, "soft_sleeper": 640000}),
    ("TN24", QUY_NHON, HCM,      GA_QUY_NHON, GA_HCM,      21,  0, 10,
     {"hard_seat": 205000, "soft_seat": 315000, "hard_sleeper": 465000, "soft_sleeper": 640000}),

    # Da Nang <-> Hue (4 chuyen, 3h)
    ("TN25", DA_NANG, HUE,     GA_DA_NANG, GA_HUE,      8,  0, 3,
     {"hard_seat": 80000, "soft_seat": 120000, "hard_sleeper": None, "soft_sleeper": None}),
    ("TN26", HUE,     DA_NANG, GA_HUE,     GA_DA_NANG,  9,  0, 3,
     {"hard_seat": 80000, "soft_seat": 120000, "hard_sleeper": None, "soft_sleeper": None}),
    ("TN27", DA_NANG, HUE,     GA_DA_NANG, GA_HUE,     16,  0, 3,
     {"hard_seat": 80000, "soft_seat": 120000, "hard_sleeper": None, "soft_sleeper": None}),
    ("TN28", HUE,     DA_NANG, GA_HUE,     GA_DA_NANG, 17,  0, 3,
     {"hard_seat": 80000, "soft_seat": 120000, "hard_sleeper": None, "soft_sleeper": None}),

    # Da Nang <-> Nha Trang (2 chuyen, 4h)
    ("TN29", DA_NANG,   NHA_TRANG, GA_DA_NANG,   GA_NHA_TRANG,  8,  0, 4,
     {"hard_seat": 90000, "soft_seat": 140000, "hard_sleeper": 200000, "soft_sleeper": 270000}),
    ("TN30", NHA_TRANG, DA_NANG,   GA_NHA_TRANG, GA_DA_NANG,    9,  0, 4,
     {"hard_seat": 90000, "soft_seat": 140000, "hard_sleeper": 200000, "soft_sleeper": 270000}),
]

assert len(SCHEDULES) == 50, f"Can co 50 lich trinh, hien co {len(SCHEDULES)}"


def make_seats(prices: dict) -> list[tuple]:
    """
    T1: Ngoi cung  — 64 ghe (16 hang x A B C D)
    T2: Ngoi mem   — 56 ghe (14 hang x A B C D)
    T3: Nam cung   — 48 ghe (8 khoang x 6 giuong)  [neu co]
    T4: Nam mem    — 28 ghe (7 khoang x 4 giuong)  [neu co]
    """
    seats = []
    for row in range(1, 17):
        for col in ["A", "B", "C", "D"]:
            seats.append(("T1", f"{row:02d}{col}", "hard_seat", prices["hard_seat"]))
    for row in range(1, 15):
        for col in ["A", "B", "C", "D"]:
            seats.append(("T2", f"{row:02d}{col}", "soft_seat", prices["soft_seat"]))
    if prices["hard_sleeper"]:
        for comp in range(1, 9):
            for side in ["L", "R"]:
                for level in ["D", "G", "T"]:
                    seats.append(("T3", f"{comp:02d}{side}{level}", "hard_sleeper", prices["hard_sleeper"]))
    if prices["soft_sleeper"]:
        for comp in range(1, 8):
            for side in ["L", "R"]:
                for level in ["D", "T"]:
                    seats.append(("T4", f"{comp:02d}{side}{level}", "soft_sleeper", prices["soft_sleeper"]))
    return seats


def run():
    start = date(2026, 4, 22)
    end   = date(2026, 5, 5)
    num_days = (end - start).days + 1

    total_trains = 0
    total_seats  = 0

    with engine.begin() as conn:
        conn.execute(text("""
            DELETE ts FROM train_seats ts
            JOIN trains t ON ts.train_id = t.train_id
            WHERE t.depart_time >= :start AND t.depart_time <= :end
        """), {"start": datetime(2026, 4, 22), "end": datetime(2026, 5, 5, 23, 59, 59)})
        conn.execute(text("""
            DELETE FROM trains
            WHERE depart_time >= :start AND depart_time <= :end
        """), {"start": datetime(2026, 4, 22), "end": datetime(2026, 5, 5, 23, 59, 59)})

        current = start
        while current <= end:
            for (code, from_city, to_city, from_station, to_station,
                 dh, dm, duration_h, prices) in SCHEDULES:

                depart = datetime(current.year, current.month, current.day, dh, dm)
                arrive = depart + timedelta(hours=duration_h)

                result = conn.execute(text("""
                    INSERT INTO trains
                        (train_code, from_city, to_city, from_station, to_station,
                         depart_time, arrive_time, price, status)
                    VALUES
                        (:code, :from_city, :to_city, :from_station, :to_station,
                         :depart, :arrive, :price, 'active')
                """), {
                    "code":         code,
                    "from_city":    from_city,
                    "to_city":      to_city,
                    "from_station": from_station,
                    "to_station":   to_station,
                    "depart":       depart,
                    "arrive":       arrive,
                    "price":        prices["hard_seat"],
                })
                train_id = result.lastrowid
                total_trains += 1

                for (coach, seat_num, seat_class, price) in make_seats(prices):
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

    print(f"SEED HOAN TAT!")
    print(f"Tu {start} den {end} ({num_days} ngay)")
    print(f"Chuyen tau: {total_trains} ({total_trains // num_days}/ngay)")
    print(f"Ghe tau:    {total_seats:,}")


if __name__ == "__main__":
    run()
