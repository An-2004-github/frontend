"""
booking_expire.py — Tự động hủy các booking pending quá 15 phút.

Logic:
- Chạy mỗi 60 giây (asyncio loop).
- Tìm tất cả booking có status='pending' và booking_date < NOW() - 15 phút.
- Với mỗi booking:
    + Cập nhật status → 'cancelled'
    + Giải phóng ghế flight/bus/train đã giữ (is_booked → 0)
    + Hoàn lại ghế không ảnh hưởng đến room (phòng khách sạn không hold ghế)
"""

import asyncio
import logging
from sqlalchemy import text
from database import engine

logger = logging.getLogger("booking_expire")


def _cancel_expired_bookings():
    """Chạy trong thread đồng bộ, gọi từ asyncio."""
    with engine.begin() as conn:
        # Lấy các booking pending quá 15 phút
        expired = conn.execute(text("""
            SELECT b.booking_id,
                   bi.entity_type,
                   bi.entity_id,
                   bi.quantity
            FROM bookings b
            JOIN booking_items bi ON bi.booking_id = b.booking_id
            WHERE b.status = 'pending'
              AND b.booking_date < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        """)).fetchall()

        if not expired:
            return 0

        cancelled_ids = []
        for row in expired:
            r = dict(row._mapping)
            bid = r["booking_id"]
            etype = r["entity_type"]
            eid = r["entity_id"]
            qty = r["quantity"] or 1

            # Giải phóng ghế flight
            if etype == "flight":
                booked_seats = conn.execute(text("""
                    SELECT seat_id FROM flight_seats
                    WHERE flight_id = :fid AND is_booked = 1
                    LIMIT :n
                """), {"fid": eid, "n": qty}).fetchall()
                for s in booked_seats:
                    conn.execute(text("UPDATE flight_seats SET is_booked = 0 WHERE seat_id = :sid"), {"sid": s.seat_id})

            # Giải phóng ghế bus
            elif etype == "bus":
                booked_seats = conn.execute(text("""
                    SELECT seat_id FROM bus_seats
                    WHERE bus_id = :bid AND is_booked = 1
                    LIMIT :n
                """), {"bid": eid, "n": qty}).fetchall()
                for s in booked_seats:
                    conn.execute(text("UPDATE bus_seats SET is_booked = 0 WHERE seat_id = :sid"), {"sid": s.seat_id})

            # Giải phóng ghế train
            elif etype == "train":
                booked_seats = conn.execute(text("""
                    SELECT seat_id FROM train_seats
                    WHERE train_id = :tid AND is_booked = 1
                    LIMIT :n
                """), {"tid": eid, "n": qty}).fetchall()
                for s in booked_seats:
                    conn.execute(text("UPDATE train_seats SET is_booked = 0 WHERE seat_id = :sid"), {"sid": s.seat_id})

            cancelled_ids.append(bid)

        if cancelled_ids:
            for bid in cancelled_ids:
                conn.execute(text("UPDATE bookings SET status = 'cancelled' WHERE booking_id = :bid"), {"bid": bid})
            logger.info(f"[BookingExpire] Auto-cancelled {len(cancelled_ids)} booking(s): {cancelled_ids}")

        return len(cancelled_ids)


async def booking_expire_loop():
    """Vòng lặp asyncio chạy mỗi 60 giây."""
    logger.info("[BookingExpire] Scheduler started — checking every 60s")
    while True:
        try:
            count = await asyncio.get_event_loop().run_in_executor(
                None, _cancel_expired_bookings
            )
            if count:
                logger.info(f"[BookingExpire] Cancelled {count} expired booking(s)")
        except Exception as e:
            logger.error(f"[BookingExpire] Error: {e}")
        await asyncio.sleep(60)
