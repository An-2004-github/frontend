import axiosInstance from "@/lib/axios";
import { Promotion } from "@/types/promotion";

interface ValidatePromoParams {
    code: string;
    order_value: number;
    applies_to?: string;
}

interface ValidatePromoResult {
    valid: boolean;
    promo_id: number;
    code: string;
    discount_amount: number;
    message: string;
}

export const promotionService = {
    // Lấy danh sách promotions (tuỳ chọn lọc theo loại)
    getPromotions: async (applies_to?: string): Promise<Promotion[]> => {
        const response = await axiosInstance.get("/api/promotions", {
            params: { applies_to },
        });
        return response.data;
    },

    // Validate mã giảm giá tại checkout
    validatePromo: async (params: ValidatePromoParams): Promise<ValidatePromoResult> => {
        const response = await axiosInstance.post("/api/promotions/validate", params);
        return response.data;
    },
};