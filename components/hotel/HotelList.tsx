"use client"

import { Hotel } from "@/types/hotel"
import HotelCard from "./HotelCard"

interface Props {
    hotels: Hotel[]
}

export default function HotelList({ hotels }: Props) {

    if (hotels.length === 0) {
        return <p>No hotels found</p>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {hotels.map((hotel) => (
                <HotelCard
                    key={hotel.hotel_id}
                    hotel={hotel}
                />
            ))}

        </div>
    )
}