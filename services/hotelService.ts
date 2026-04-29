import axiosInstance from "@/lib/axios";
import { Hotel } from "@/types/hotel";

interface GetHotelsParams {
    search?: string;
    destination_id?: number;
    min_price?: number;
    max_price?: number;
    sort?: "rating" | "price_asc" | "price_desc";
    limit?: number;
    min_guests?: number;
}

export const hotelService = {
    getHotels: async (params?: GetHotelsParams, signal?: AbortSignal): Promise<Hotel[]> => {
        const response = await axiosInstance.get("/api/hotels", { params, signal });
        return response.data;
    },

    getHotelById: async (id: number | string): Promise<Hotel> => {
        const response = await axiosInstance.get(`/api/hotels/${id}`);
        return response.data;
    },
};