"use client"

import Link from "next/link"
import { Hotel } from "@/types/hotel"

interface Props {
    hotel: Hotel
}

export default function HotelCard({ hotel }: Props) {

    return (
        <div className="border rounded-lg p-4 shadow">

            <h2 className="text-lg font-bold">
                {hotel.name}
            </h2>

            <p className="text-gray-500">
                {hotel.address}
            </p>

            <Link
                href={`/hotels/${hotel.hotel_id}`}
                className="text-blue-500"
            >
                View Detail
            </Link>

        </div>
    )
}