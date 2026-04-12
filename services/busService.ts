import axiosInstance from "@/lib/axios";
import { Bus, BusSeat } from "@/types/bus";

interface SearchBusesParams {
    from_city?: string;
    to_city?: string;
    depart_date?: string;
    company?: string;
    min_price?: number;
    max_price?: number;
    sort?: "price_asc" | "price_desc" | "depart_asc" | "duration";
}

export const busService = {
    searchBuses: async (params?: SearchBusesParams): Promise<Bus[]> => {
        const response = await axiosInstance.get("/api/buses", { params });
        return response.data;
    },

    getBusById: async (id: number | string): Promise<Bus & { seats: BusSeat[] }> => {
        const response = await axiosInstance.get(`/api/buses/${id}`);
        return response.data;
    },

    getCompanies: async (): Promise<string[]> => {
        const response = await axiosInstance.get("/api/buses/companies");
        return response.data;
    },

    getCities: async (): Promise<string[]> => {
        const response = await axiosInstance.get("/api/buses/cities");
        return response.data;
    },

    getDestinationCities: async (fromCity: string): Promise<string[]> => {
        const response = await axiosInstance.get("/api/buses/destinations", {
            params: { from_city: fromCity },
        });
        return response.data;
    },
};