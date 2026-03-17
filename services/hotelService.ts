import axiosInstance from "@/lib/axios";
import { Hotel } from "@/types/hotel";

interface GetHotelsParams {
    search?: string;
    min_price?: number;
    max_price?: number;
}

export const hotelService = {
    // Gọi API lấy danh sách khách sạn (có filter tên + giá)
    getHotels: async (params?: GetHotelsParams): Promise<Hotel[]> => {
        try {
            const response = await axiosInstance.get("/api/hotels", {
                params: {
                    search: params?.search || undefined,
                    min_price: params?.min_price,
                    max_price: params?.max_price,
                },
            });
            // FastAPI trả thẳng mảng []
            return response.data;
        } catch (error) {
            console.error("Lỗi khi fetch danh sách khách sạn:", error);
            throw error;
        }
    },

    // Gọi API lấy chi tiết 1 khách sạn
    getHotelById: async (id: number | string): Promise<Hotel> => {
        try {
            const response = await axiosInstance.get(`/api/hotels/${id}`);
            // FastAPI trả thẳng object {}, không bọc trong .data
            return response.data;
        } catch (error) {
            console.error(`Lỗi khi fetch khách sạn ID ${id}:`, error);
            throw error;
        }
    },
};