# -*- coding: utf-8 -*-
import sys

with open(r'c:/Users/ADMIN/Documents/DATN/frontend/backend/routers/admin.py', 'r', encoding='utf-8') as f:
    src = f.read()

changes = 0

# ── 1. /bookings signature ────────────────────────────────────────
old = 'def get_all_bookings(admin_id: int = Depends(get_admin_user)):'
new = 'def get_all_bookings(skip: int = 0, limit: int = 50, search: str = "", admin_id: int = Depends(get_admin_user)):'
if old in src:
    src = src.replace(old, new, 1); changes += 1; print("bookings sig OK")
else:
    print("ERROR: bookings sig not found")

# /bookings body — the arrow chars are stored as literal → in the file
# We locate by the unique GROUP BY line and replace the full execute block
OLD_BK_MARKER = '            ORDER BY b.booking_date DESC\n        """)).fetchall()\n    return [dict(r._mapping) for r in rows]'
NEW_BK_MARKER = '''            {having}\n            ORDER BY b.booking_date DESC\n            LIMIT :limit OFFSET :skip\n        """), params).fetchall()\n    return [dict(r._mapping) for r in rows]'''

# Also need to replace the execute call and add params
# Strategy: replace from "    with engine.connect() as conn:" (first after /bookings def) to end
idx_def = src.find('def get_all_bookings(skip:')
idx_end_func = src.find('\n@router', idx_def)
old_func_body = src[idx_def:idx_end_func]

# Build the new body replacing just the with-block
old_with = '    with engine.connect() as conn:\n        rows = conn.execute(text("""'
new_with = (
    '    with engine.connect() as conn:\n'
    '        params: dict = {"limit": limit, "skip": skip}\n'
    '        having = ""\n'
    '        if search:\n'
    '            having = "HAVING user_name LIKE :s OR user_email LIKE :s OR entity_name LIKE :s"\n'
    '            params["s"] = f"%{search}%"\n'
    '        rows = conn.execute(text(f"""'
)
# Replace the arrow chars in the body
old_func_body2 = old_func_body.replace(old_with, new_with, 1)
# Replace ORDER BY line (end of query)
old_func_body2 = old_func_body2.replace(
    '            ORDER BY b.booking_date DESC\n        """)).fetchall()',
    '            {having}\n            ORDER BY b.booking_date DESC\n            LIMIT :limit OFFSET :skip\n        """), params).fetchall()',
    1
)
if old_func_body2 != old_func_body:
    src = src[:idx_def] + old_func_body2 + src[idx_end_func:]
    changes += 1; print("bookings body OK")
else:
    print("ERROR: bookings body no change")

# ── 2. /hotels ────────────────────────────────────────────────────
old = 'def admin_get_hotels(admin_id: int = Depends(get_admin_user)):'
new = 'def admin_get_hotels(skip: int = 0, limit: int = 50, search: str = "", admin_id: int = Depends(get_admin_user)):'
if old in src:
    src = src.replace(old, new, 1); changes += 1; print("hotels sig OK")
else:
    print("ERROR: hotels sig not found")

idx_def = src.find('def admin_get_hotels(skip:')
idx_end = src.find('\n@router', idx_def)
old_body = src[idx_def:idx_end]
new_body = old_body.replace(
    '    with engine.connect() as conn:\n        rows = conn.execute(text("""',
    (
        '    with engine.connect() as conn:\n'
        '        params: dict = {"limit": limit, "skip": skip}\n'
        '        where = ""\n'
        '        if search:\n'
        '            where = "WHERE h.name LIKE :s OR d.city LIKE :s OR h.address LIKE :s"\n'
        '            params["s"] = f"%{search}%"\n'
        '        rows = conn.execute(text(f"""'
    ), 1
).replace(
    '            ORDER BY h.hotel_id DESC\n        """)).fetchall()',
    '            {where}\n            ORDER BY h.hotel_id DESC\n            LIMIT :limit OFFSET :skip\n        """), params).fetchall()',
    1
)
if new_body != old_body:
    src = src[:idx_def] + new_body + src[idx_end:]
    changes += 1; print("hotels body OK")
else:
    print("ERROR: hotels body no change")

# ── 3. /flights ───────────────────────────────────────────────────
old = 'def admin_get_flights(admin_id: int = Depends(get_admin_user)):'
new = 'def admin_get_flights(skip: int = 0, limit: int = 50, search: str = "", admin_id: int = Depends(get_admin_user)):'
if old in src:
    src = src.replace(old, new, 1); changes += 1; print("flights sig OK")
else:
    print("ERROR: flights sig not found")

idx_def = src.find('def admin_get_flights(skip:')
idx_end = src.find('\n@router', idx_def)
old_body = src[idx_def:idx_end]
new_body = old_body.replace(
    '    with engine.connect() as conn:\n        rows = conn.execute(text("""',
    (
        '    with engine.connect() as conn:\n'
        '        params: dict = {"limit": limit, "skip": skip}\n'
        '        where = ""\n'
        '        if search:\n'
        '            where = "WHERE f.airline LIKE :s OR f.from_city LIKE :s OR f.to_city LIKE :s"\n'
        '            params["s"] = f"%{search}%"\n'
        '        rows = conn.execute(text(f"""'
    ), 1
).replace(
    '            FROM flights f\n            ORDER BY f.flight_id DESC\n        """)).fetchall()',
    '            FROM flights f\n            {where}\n            ORDER BY f.flight_id DESC\n            LIMIT :limit OFFSET :skip\n        """), params).fetchall()',
    1
)
if new_body != old_body:
    src = src[:idx_def] + new_body + src[idx_end:]
    changes += 1; print("flights body OK")
else:
    print("ERROR: flights body no change")

# ── 4. /buses ─────────────────────────────────────────────────────
old = 'def admin_get_buses(admin_id: int = Depends(get_admin_user)):'
new = 'def admin_get_buses(skip: int = 0, limit: int = 50, search: str = "", admin_id: int = Depends(get_admin_user)):'
if old in src:
    src = src.replace(old, new, 1); changes += 1; print("buses sig OK")
else:
    print("ERROR: buses sig not found")

idx_def = src.find('def admin_get_buses(skip:')
idx_end = src.find('\n@router', idx_def)
old_body = src[idx_def:idx_end]
new_body = old_body.replace(
    '    with engine.connect() as conn:\n        rows = conn.execute(text("""',
    (
        '    with engine.connect() as conn:\n'
        '        params: dict = {"limit": limit, "skip": skip}\n'
        '        where = ""\n'
        '        if search:\n'
        '            where = "WHERE b.company LIKE :s OR b.from_city LIKE :s OR b.to_city LIKE :s"\n'
        '            params["s"] = f"%{search}%"\n'
        '        rows = conn.execute(text(f"""'
    ), 1
).replace(
    '            FROM buses b\n            ORDER BY b.bus_id DESC\n        """)).fetchall()',
    '            FROM buses b\n            {where}\n            ORDER BY b.bus_id DESC\n            LIMIT :limit OFFSET :skip\n        """), params).fetchall()',
    1
)
if new_body != old_body:
    src = src[:idx_def] + new_body + src[idx_end:]
    changes += 1; print("buses body OK")
else:
    print("ERROR: buses body no change")

# ── 5. /reviews ───────────────────────────────────────────────────
old = 'def admin_get_reviews(admin_id: int = Depends(get_admin_user)):'
new = 'def admin_get_reviews(skip: int = 0, limit: int = 50, search: str = "", admin_id: int = Depends(get_admin_user)):'
if old in src:
    src = src.replace(old, new, 1); changes += 1; print("reviews sig OK")
else:
    print("ERROR: reviews sig not found")

idx_def = src.find('def admin_get_reviews(skip:')
idx_end = src.find('\n@router', idx_def)
old_body = src[idx_def:idx_end]
new_body = old_body.replace(
    '    with engine.connect() as conn:\n        rows = conn.execute(text("""',
    (
        '    with engine.connect() as conn:\n'
        '        params: dict = {"limit": limit, "skip": skip}\n'
        '        where = ""\n'
        '        if search:\n'
        '            where = "WHERE u.full_name LIKE :s OR u.email LIKE :s OR r.comment LIKE :s"\n'
        '            params["s"] = f"%{search}%"\n'
        '        rows = conn.execute(text(f"""'
    ), 1
).replace(
    '            ORDER BY r.created_at DESC\n        """)).fetchall()\n    return [dict(row._mapping) for row in rows]',
    '            {where}\n            ORDER BY r.created_at DESC\n            LIMIT :limit OFFSET :skip\n        """), params).fetchall()\n    return [dict(row._mapping) for row in rows]',
    1
)
if new_body != old_body:
    src = src[:idx_def] + new_body + src[idx_end:]
    changes += 1; print("reviews body OK")
else:
    print("ERROR: reviews body no change")

# ── 6. /promotions ────────────────────────────────────────────────
old = 'def admin_get_promotions(admin_id: int = Depends(get_admin_user)):'
new = 'def admin_get_promotions(skip: int = 0, limit: int = 50, search: str = "", admin_id: int = Depends(get_admin_user)):'
if old in src:
    src = src.replace(old, new, 1); changes += 1; print("promotions sig OK")
else:
    print("ERROR: promotions sig not found")

idx_def = src.find('def admin_get_promotions(skip:')
idx_end = src.find('\n@router', idx_def)
old_body = src[idx_def:idx_end]
new_body = old_body.replace(
    '    with engine.connect() as conn:\n        rows = conn.execute(text(\n            "SELECT * FROM promotions ORDER BY promo_id DESC"\n        )).fetchall()\n    return [dict(r._mapping) for r in rows]',
    (
        '    with engine.connect() as conn:\n'
        '        params: dict = {"limit": limit, "skip": skip}\n'
        '        where = ""\n'
        '        if search:\n'
        '            where = f"WHERE code LIKE \'%{search}%\' OR description LIKE \'%{search}%\'"\n'
        '        rows = conn.execute(text(\n'
        '            f"SELECT * FROM promotions {where} ORDER BY promo_id DESC LIMIT :limit OFFSET :skip"\n'
        '        ), params).fetchall()\n'
        '    return [dict(r._mapping) for r in rows]'
    ), 1
)
if new_body != old_body:
    src = src[:idx_def] + new_body + src[idx_end:]
    changes += 1; print("promotions body OK")
else:
    print("ERROR: promotions body no change")

# ── 7. /modifications ─────────────────────────────────────────────
old = 'def get_modifications(admin_id: int = Depends(get_admin_user)):'
new = 'def get_modifications(skip: int = 0, limit: int = 50, search: str = "", admin_id: int = Depends(get_admin_user)):'
if old in src:
    src = src.replace(old, new, 1); changes += 1; print("modifications sig OK")
else:
    print("ERROR: modifications sig not found")

idx_def = src.find('def get_modifications(skip:')
idx_end = src.find('\n@router', idx_def)
old_body = src[idx_def:idx_end]
new_body = old_body.replace(
    '            ORDER BY m.created_at DESC\n        """)).fetchall()\n        return [dict(r._mapping) for r in rows]',
    (
        '            ORDER BY m.created_at DESC\n'
        '            LIMIT :limit OFFSET :skip\n'
        '        """), {"limit": limit, "skip": skip}).fetchall()\n'
        '        return [dict(r._mapping) for r in rows]'
    ), 1
)
if new_body != old_body:
    src = src[:idx_def] + new_body + src[idx_end:]
    changes += 1; print("modifications body OK")
else:
    print("ERROR: modifications body no change")

# ── 8. /trains ────────────────────────────────────────────────────
old = 'def admin_get_trains(admin_id: int = Depends(get_admin_user)):'
new = 'def admin_get_trains(skip: int = 0, limit: int = 50, search: str = "", admin_id: int = Depends(get_admin_user)):'
if old in src:
    src = src.replace(old, new, 1); changes += 1; print("trains sig OK")
else:
    print("ERROR: trains sig not found")

idx_def = src.find('def admin_get_trains(skip:')
idx_end = src.find('\n@router', idx_def)
if idx_end == -1:
    idx_end = src.find('\n# ──', idx_def)
old_body = src[idx_def:idx_end]
new_body = old_body.replace(
    '    with engine.connect() as conn:\n        rows = conn.execute(text("""',
    (
        '    with engine.connect() as conn:\n'
        '        params: dict = {"limit": limit, "skip": skip}\n'
        '        where = ""\n'
        '        if search:\n'
        '            where = "WHERE t.train_code LIKE :s OR t.from_city LIKE :s OR t.to_city LIKE :s"\n'
        '            params["s"] = f"%{search}%"\n'
        '        rows = conn.execute(text(f"""'
    ), 1
).replace(
    '            FROM trains t\n            ORDER BY t.depart_time DESC\n        """)).fetchall()',
    '            FROM trains t\n            {where}\n            ORDER BY t.depart_time DESC\n            LIMIT :limit OFFSET :skip\n        """), params).fetchall()',
    1
)
if new_body != old_body:
    src = src[:idx_def] + new_body + src[idx_end:]
    changes += 1; print("trains body OK")
else:
    print("ERROR: trains body no change")

with open(r'c:/Users/ADMIN/Documents/DATN/frontend/backend/routers/admin.py', 'w', encoding='utf-8') as f:
    f.write(src)
print(f"\nDone. Total changes: {changes}")
