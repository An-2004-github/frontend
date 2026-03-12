import api from "@/lib/axios"
import { Hotel } from "@/types/hotel"

export const hotelService = {

    async searchHotels(destination?: string): Promise<Hotel[]> {

        const res = await api.get("/hotels", {
            params: {
                destination,
            },
        })

        return res.data
    },

    async getHotelDetail(id: number): Promise<Hotel> {

        const res = await api.get(`/hotels/${id}`)

        return res.data
    },
}