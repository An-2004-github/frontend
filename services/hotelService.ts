import axiosInstance from "@/lib/axios";
import { Hotel } from "@/types/hotel";

export const hotelService = {
    // Lấy danh sách khách sạn (có hỗ trợ tìm kiếm và lọc)
    getHotels: async (searchQuery?: string): Promise<Hotel[]> => {
        try {
            const response = await axiosInstance.get('/hotels', {
                params: { search: searchQuery }
            });
            return response.data;
        } catch (error) {
            console.error("Lỗi khi fetch danh sách khách sạn:", error);
            throw error;
        }
    },

    // Lấy chi tiết 1 khách sạn theo ID
    getHotelById: async (id: number | string): Promise<Hotel> => {
        try {
            const response = await axiosInstance.get(`/hotels/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Lỗi khi fetch khách sạn ID ${id}:`, error);
            throw error;
        }
    }
};