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


from typing import Tuple

def get_cancel_fee_rate(rank: str, days_until: int, entity_type: str) -> Tuple[float, str]:
    """Trả về tuple (tỉ lệ phí hủy, chuỗi giải thích chính sách)."""
    if entity_type == "room":
        if days_until < 1:
            return 1.0, "Ngay tại ngày nhận phòng: Không hoàn tiền (phí 100%)."
        if rank == "diamond":
            return 0.0, "Hạng Ưu tú Kim Cương: Tuyệt đối miễn phí hủy phòng."
        elif rank == "gold":
            return (0.1, "Hạng Vàng (hủy < 3 ngày): Phí hủy 10%.") if days_until < 3 else (0.0, "Hủy sớm >= 3 ngày: Miễn phí hủy.")
        elif rank == "silver":
            return (0.2, "Hạng Bạc (hủy < 3 ngày): Phí hủy 20%.") if days_until < 3 else (0.0, "Hủy sớm >= 3 ngày: Miễn phí hủy.")
        else:
            return (0.3, "Khách thường (hủy < 3 ngày): Phí hủy 30%.") if days_until < 3 else (0.0, "Hủy sớm >= 3 ngày: Miễn phí hủy.")

    elif entity_type in ("flight", "bus"):
        if days_until < 1:
            return 1.0, "Hủy ngay trong ngày khởi hành: Không hoàn tiền (phí 100%)."
        elif days_until < 3:
            return 0.3, "Hủy trước 1-3 ngày: Phí hủy 30% (Hoàn 70%)."
        return 0.1, "Hủy sớm >= 3 ngày: Phí hủy 10% (Hoàn 90%)."

    return 0.0, "Không áp dụng phí hủy."


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
