import axiosInstance from "@/lib/axios";

export interface Destination {
    destination_id: number;
    name: string;
    country: string;
    city: string;
    description: string;
    image_url: string;
    avg_rating: number;
    review_count: number;
    hotel_count: number;
}

export const destinationService = {
    getDestinations: async (params?: { limit?: number; country?: string }): Promise<Destination[]> => {
        const response = await axiosInstance.get("/api/destinations", { params });
        return response.data;
    },
};