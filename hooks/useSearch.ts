import { useState } from "react"
import { Hotel } from "@/types/hotel"
import { searchService } from "@/services/searchService"

export function useSearch() {

    const [hotels, setHotels] = useState<Hotel[]>([])
    const [loading, setLoading] = useState(false)

    const searchHotels = async (destination?: string) => {

        try {

            setLoading(true)

            const data = await searchService.searchHotels(destination)

            setHotels(data)

        } catch (error) {

            console.error(error)

        } finally {

            setLoading(false)

        }

    }

    return {
        hotels,
        loading,
        searchHotels
    }

}