export interface Promotion {
    promo_id: number;
    code: string;
    discount_percent: number;
    max_discount: number;
    min_order_value: number;
    expired_at: string;
    usage_limit: number | null;
    used_count: number;
    per_user_limit: number | null;
    status: "active" | "inactive" | "expired";
    discount_type: "percent" | "fixed";
    applies_to: "hotel" | "flight" | "bus" | "train" | "all";
}