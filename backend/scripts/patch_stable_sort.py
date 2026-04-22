# -*- coding: utf-8 -*-
"""Fix unstable ORDER BY in paginated admin endpoints by adding primary key as tiebreaker."""

with open(r'c:/Users/ADMIN/Documents/DATN/frontend/backend/routers/admin.py', 'r', encoding='utf-8') as f:
    src = f.read()

fixes = [
    # users
    ('ORDER BY created_at DESC LIMIT :limit OFFSET :skip',
     'ORDER BY created_at DESC, user_id DESC LIMIT :limit OFFSET :skip'),
    # bookings
    ('ORDER BY b.booking_date DESC\n            LIMIT :limit OFFSET :skip',
     'ORDER BY b.booking_date DESC, b.booking_id DESC\n            LIMIT :limit OFFSET :skip'),
    # hotels
    ('ORDER BY h.hotel_id DESC\n            LIMIT :limit OFFSET :skip',
     'ORDER BY h.hotel_id DESC\n            LIMIT :limit OFFSET :skip'),   # already unique
    # flights
    ('ORDER BY f.flight_id DESC\n            LIMIT :limit OFFSET :skip',
     'ORDER BY f.flight_id DESC\n            LIMIT :limit OFFSET :skip'),   # already unique
    # buses
    ('ORDER BY b.bus_id DESC\n            LIMIT :limit OFFSET :skip',
     'ORDER BY b.bus_id DESC\n            LIMIT :limit OFFSET :skip'),     # already unique
    # trains
    ('ORDER BY t.depart_time DESC\n            LIMIT :limit OFFSET :skip',
     'ORDER BY t.depart_time DESC, t.train_id DESC\n            LIMIT :limit OFFSET :skip'),
    # reviews
    ('ORDER BY r.created_at DESC\n            LIMIT :limit OFFSET :skip',
     'ORDER BY r.created_at DESC, r.review_id DESC\n            LIMIT :limit OFFSET :skip'),
    # promotions
    ('ORDER BY promo_id DESC LIMIT :limit OFFSET :skip',
     'ORDER BY promo_id DESC LIMIT :limit OFFSET :skip'),   # already unique
]

changes = 0
for old, new in fixes:
    if old != new and old in src:
        src = src.replace(old, new, 1)
        changes += 1
        print(f"Fixed: ...{old[-40:]}")
    elif old == new:
        pass  # already stable
    else:
        print(f"NOT FOUND: ...{old[-40:]}")

with open(r'c:/Users/ADMIN/Documents/DATN/frontend/backend/routers/admin.py', 'w', encoding='utf-8') as f:
    f.write(src)
print(f"\nBackend: {changes} sort fixes applied")
