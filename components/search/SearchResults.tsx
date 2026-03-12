"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Hotel } from "@/types/hotel"
import { hotelService } from "@/services/hotelService"

import HotelList from "@/components/hotel/HotelList"

export default function SearchResults() {

    const params = useSearchParams()
    const destination = params.get("destination") || ""

    const [hotels, setHotels] = useState<Hotel[]>([])

    useEffect(() => {

        const loadHotels = async () => {

            const data = await hotelService.searchHotels(destination)

            setHotels(data)

        }

        loadHotels()

    }, [destination])

    return (
        <div>

            <HotelList hotels={hotels} />

        </div>
    )
}