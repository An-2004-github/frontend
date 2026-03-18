from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from database import engine
from auth import get_current_user

router = APIRouter(prefix="/api/promotions", tags=["promotions"])


# Lấy tất cả promotions (có filter theo applies_to)
@router.get("/")
def get_promotions(applies_to: str | None = None):
    conditions = ["status = 'active'", "expired_at > NOW()"]
    params = {}

    if applies_to and applies_to != "all":
        conditions.append("(applies_to = :applies_to OR applies_to = 'all')")
        params["applies_to"] = applies_to

    query = f"""
        SELECT * FROM promotions
        WHERE {' AND '.join(conditions)}
        ORDER BY discount_percent DESC
    """

    with engine.connect() as conn:
        result = conn.execute(text(query), params)
        return [dict(row._mapping) for row in result]


# Lấy chi tiết 1 promotion
@router.get("/{promo_id}")
def get_promotion(promo_id: int):
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM promotions WHERE promo_id = :id"),
            {"id": promo_id}
        ).fetchone()

        if not result:
            raise HTTPException(404, "Promotion không tồn tại")

        return dict(result._mapping)


# Validate mã giảm giá (dùng ở checkout)
@router.post("/validate")
def validate_promo(data: dict, user_id: int = Depends(get_current_user)):
    code        = data.get("code", "").strip().upper()
    order_value = data.get("order_value", 0)
    applies_to  = data.get("applies_to", "all")

    if not code:
        raise HTTPException(400, "Vui lòng nhập mã giảm giá")

    with engine.connect() as conn:
        promo = conn.execute(
            text("""
                SELECT * FROM promotions
                WHERE code = :code
                  AND status = 'active'
                  AND expired_at > NOW()
                  AND (applies_to = :applies_to OR applies_to = 'all')
            """),
            {"code": code, "applies_to": applies_to}
        ).fetchone()

        if not promo:
            raise HTTPException(400, "Mã không hợp lệ hoặc đã hết hạn")

        promo = dict(promo._mapping)

        # Kiểm tra đã hết lượt chưa
        if promo["used_count"] >= promo["usage_limit"]:
            raise HTTPException(400, "Mã giảm giá đã hết lượt sử dụng")

        # Kiểm tra giá trị đơn hàng tối thiểu
        if order_value < promo["min_order_value"]:
            raise HTTPException(400, f"Đơn hàng tối thiểu {promo['min_order_value']:,.0f}₫ để dùng mã này")

        # Tính số tiền được giảm
        if promo["discount_type"] == "percent":
            discount_amount = order_value * promo["discount_percent"] / 100
            discount_amount = min(discount_amount, promo["max_discount"])
        else:
            discount_amount = min(promo["max_discount"], order_value)

        return {
            "valid": True,
            "promo_id": promo["promo_id"],
            "code": promo["code"],
            "discount_amount": round(discount_amount, 2),
            "message": f"Áp dụng thành công! Giảm {discount_amount:,.0f}₫"
        }