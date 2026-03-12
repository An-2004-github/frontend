"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { hotelService } from "@/services/hotelService"
import { Hotel } from "@/types/hotel"

import HotelCard from "@/components/hotel/HotelCard"

export default function HotelsPage() {

    const searchParams = useSearchParams()

    const destination = searchParams.get("destination") || undefined

    const [hotels, setHotels] = useState<Hotel[]>([])

    useEffect(() => {

        const loadHotels = async () => {

            const data = await hotelService.searchHotels(destination)

            setHotels(data)

        }

        loadHotels()

    }, [destination])

    return (
        <div className="flex flex-col gap-4">

            <h1 className="text-2xl font-bold">
                Hotels in {destination}
            </h1>

            {hotels.map((hotel) => (
                <HotelCard
                    key={hotel.hotel_id}
                    hotel={hotel}
                />
            ))}

        </div>
    )
}