import axiosInstance from "@/lib/axios";
import { Hotel } from "@/types/hotel";

export const hotelService = {
    // Gọi API lấy danh sách khách sạn
    getHotels: async (searchQuery?: string): Promise<Hotel[]> => {
        try {
            const response = await axiosInstance.get('/api/hotels', {
                params: { search: searchQuery } // Truyền param tìm kiếm nếu có
            });

            // Tùy thuộc vào cấu trúc Backend FastAPI trả về. 
            // Nếu Backend trả về dạng { data: [...] } thì dùng response.data.data
            // Nếu Backend trả về thẳng mảng [...] thì dùng response.data
            return response.data;
        } catch (error) {
            console.error("Lỗi khi fetch danh sách khách sạn:", error);
            throw error;
        }
    },

    // Gọi API lấy chi tiết 1 khách sạn
    getHotelById: async (id: number | string): Promise<Hotel> => {
        try {
            const response = await axiosInstance.get(`/hotels/${id}`);
            return response.data.data; // Tùy thuộc vào cấu trúc Backend trả về
        } catch (error) {
            console.error(`Lỗi khi fetch khách sạn ID ${id}:`, error);
            throw error;
        }
    }
};