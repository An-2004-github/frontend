"use client"
import BookingForm from "@/components/booking/BookingForm"
import { useEffect, useState } from "react"
import { hotelService } from "@/services/hotelService"
import { Hotel } from "@/types/hotel"
import { useParams } from "next/navigation"
import ReviewList from "@/components/review/ReviewList"
import ReviewForm from "@/components/review/ReviewForm"
import ImageGallery from "@/components/gallery/ImageGallery"
export default function HotelDetailPage() {

    const { id } = useParams()

    const [hotel, setHotel] = useState<Hotel | null>(null)

    useEffect(() => {

        const loadHotel = async () => {
            const data = await hotelService.getHotelDetail(Number(id))
            setHotel(data)
        }

        loadHotel()

    }, [id])

    if (!hotel) return <p>Loading...</p>

    return (
        <div className="flex flex-col gap-4">

            <h1 className="text-2xl font-bold">
                {hotel.name}
            </h1>

            <p>{hotel.address}</p>

            <p className="text-gray-600">
                {hotel.description}
            </p>
            <BookingForm
                serviceId={hotel.hotel_id}
                serviceType="hotel"
            />
            <ReviewList
                entityId={hotel.hotel_id}
                entityType="hotel"
            />

            <ReviewForm
                entityId={hotel.hotel_id}
                entityType="hotel"
            />
            <ImageGallery
                entityId={hotel.hotel_id}
                entityType="hotel"
            />
        </div>
    )
}