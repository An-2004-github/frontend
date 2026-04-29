import axiosInstance from "@/lib/axios";
import { Flight, FlightSeat } from "@/types/flight";

interface SearchFlightsParams {
    from_city?: string;
    to_city?: string;
    depart_date?: string;
    airline?: string;
    min_price?: number;
    max_price?: number;
    sort?: "price_asc" | "price_desc" | "depart_asc" | "duration";
}

export const flightService = {
    searchFlights: async (params?: SearchFlightsParams, signal?: AbortSignal): Promise<Flight[]> => {
        const response = await axiosInstance.get("/api/flights", { params, signal });
        return response.data;
    },

    getFlightById: async (id: number | string): Promise<Flight & { seats: FlightSeat[] }> => {
        const response = await axiosInstance.get(`/api/flights/${id}`);
        return response.data;
    },

    getAirlines: async (): Promise<string[]> => {
        const response = await axiosInstance.get("/api/flights/airlines");
        return response.data;
    },

    getCities: async (): Promise<string[]> => {
        const response = await axiosInstance.get("/api/flights/cities");
        return response.data;
    },

    getDestinationCities: async (fromCity: string, departDate?: string): Promise<string[]> => {
        const response = await axiosInstance.get("/api/flights/destinations", {
            params: { from_city: fromCity, depart_date: departDate || undefined },
        });
        return response.data;
    },
};