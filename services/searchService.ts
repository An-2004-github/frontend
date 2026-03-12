import api from "@/lib/axios"
import { Hotel } from "@/types/hotel"

export const searchService = {

    async searchHotels(destination?: string): Promise<Hotel[]> {

        const res = await api.get("/hotels", {
            params: {
                destination
            }
        })

        return res.data
    },

    async searchFlights(query: string) {

        const res = await api.get("/flights", {
            params: { query }
        })

        return res.data
    },

    async searchTrains(query: string) {

        const res = await api.get("/trains", {
            params: { query }
        })

        return res.data
    },

    async searchBuses(query: string) {

        const res = await api.get("/buses", {
            params: { query }
        })

        return res.data
    }

}