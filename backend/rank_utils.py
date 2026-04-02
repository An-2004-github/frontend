def get_rank(total_spent: float) -> str:
    if total_spent >= 50_000_000:
        return "diamond"
    elif total_spent >= 20_000_000:
        return "gold"
    elif total_spent >= 5_000_000:
        return "silver"
    return "bronze"


def get_cashback_rate(rank: str) -> float:
    return {
        "bronze":  0.005,
        "silver":  0.01,
        "gold":    0.015,
        "diamond": 0.02,
    }.get(rank, 0.005)


def get_cancel_fee_rate(rank: str, days_until: int, entity_type: str) -> float:
    """Trả về tỉ lệ phí hủy (0.0 – 1.0)."""
    if entity_type == "room":
        if days_until < 1:          # hủy trong ngày → không hoàn
            return 1.0
        if rank == "diamond":       # miễn phí hủy trước 1 ngày
            return 0.0
        elif rank == "gold":        # phí 10% nếu < 3 ngày
            return 0.1 if days_until < 3 else 0.0
        elif rank == "silver":      # phí 20% nếu < 3 ngày
            return 0.2 if days_until < 3 else 0.0
        else:                       # bronze: phí 30% nếu < 3 ngày
            return 0.3 if days_until < 3 else 0.0

    elif entity_type in ("flight", "bus"):
        if days_until < 1:
            return 0.3
        elif days_until < 3:
            return 0.1
        return 0.0

    return 0.0


RANK_LABELS = {
    "bronze":  "🥉 Đồng",
    "silver":  "🥈 Bạc",
    "gold":    "🥇 Vàng",
    "diamond": "💎 Kim cương",
}

RANK_THRESHOLDS = [
    ("bronze",  0),
    ("silver",  5_000_000),
    ("gold",    20_000_000),
    ("diamond", 50_000_000),
]
