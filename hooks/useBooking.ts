"use client"

import { useState } from "react"
import { bookingService } from "@/services/bookingService"
import { Booking } from "@/types/booking"

export function useBooking() {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(false)

    const loadBookings = async () => {
        setLoading(true)

        const data = await bookingService.getUserBookings()

        setBookings(data)

        setLoading(false)
    }

    return {
        bookings,
        loadBookings,
        loading,
    }
}