import axiosInstance from "@/lib/axios"
import { ApiResponse } from "@/types/api"

export const api = {
    async get<T>(url: string): Promise<T> {
        const res = await axiosInstance.get<ApiResponse<T>>(url)
        return res.data.data
    },

    async post<T, D = unknown>(url: string, data: D): Promise<T> {
        const res = await axiosInstance.post<ApiResponse<T>>(url, data)
        return res.data.data
    },

    async put<T, D = unknown>(url: string, data: D): Promise<T> {
        const res = await axiosInstance.put<ApiResponse<T>>(url, data)
        return res.data.data
    },

    async delete<T>(url: string): Promise<T> {
        const res = await axiosInstance.delete<ApiResponse<T>>(url)
        return res.data.data
    },
}