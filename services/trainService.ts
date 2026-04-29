import axiosInstance from "@/lib/axios";
import { Train, TrainDetail, TrainSearchParams } from "@/types/train";

export const trainService = {
    searchTrains: async (params?: TrainSearchParams, signal?: AbortSignal): Promise<Train[]> => {
        const response = await axiosInstance.get("/api/trains", { params, signal });
        return response.data;
    },

    getTrainById: async (id: number | string): Promise<TrainDetail> => {
        const response = await axiosInstance.get(`/api/trains/${id}`);
        return response.data;
    },

    getCities: async (): Promise<string[]> => {
        const response = await axiosInstance.get("/api/trains/cities");
        return response.data;
    },

    getDestinationCities: async (fromCity: string): Promise<string[]> => {
        const response = await axiosInstance.get("/api/trains/destinations", {
            params: { from_city: fromCity },
        });
        return response.data;
    },
};
