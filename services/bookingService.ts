import axiosInstance from "@/lib/axios";

// Interface tạm thời cho payload đặt chỗ, bạn có thể chuyển nó vào types/booking.ts sau
export interface CreateBookingPayload {
    entity_type: "hotel" | "flight" | "train" | "bus";
    entity_id: number;
    full_name: string;
    email: string;
    phone: string;
    special_requests?: string;
    payment_method: string;
    total_amount: number;
}

export const bookingService = {
    // Tạo đơn đặt chỗ mới
    createBooking: async (payload: CreateBookingPayload) => {
        try {
            const response = await axiosInstance.post('/bookings', payload);
            return response.data;
            // Thường API này sẽ trả về { booking_id: "...", invoice_id: "..." }
        } catch (error) {
            console.error("Lỗi tạo đơn đặt chỗ:", error);
            throw error;
        }
    },

    // Lấy lịch sử đặt chỗ của User đang đăng nhập
    getUserBookings: async () => {
        try {
            const response = await axiosInstance.get('/bookings/my-bookings');
            return response.data;
        } catch (error) {
            console.error("Lỗi lấy lịch sử đặt chỗ:", error);
            throw error;
        }
    }
};