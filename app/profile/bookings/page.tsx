"use client"

import { useEffect, useState } from "react"

import { bookingService } from "@/services/bookingService"
import { Booking } from "@/types/booking"

import BookingCard from "@/components/booking/BookingCard"

export default function ProfileBookingsPage() {

    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {

        const loadBookings = async () => {
            try {

                const data = await bookingService.getUserBookings()

                setBookings(data)

            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }

        loadBookings()

    }, [])

    if (loading) {
        return <p>Loading bookings...</p>
    }

    return (
        <div className="flex flex-col gap-4">

            <h1 className="text-2xl font-bold">
                My Bookings
            </h1>

            {bookings.length === 0 && (
                <p>No bookings yet</p>
            )}

            {bookings.map((booking) => (
                <BookingCard
                    key={booking.booking_id}
                    booking={booking}
                />
            ))}

        </div>
    )
}