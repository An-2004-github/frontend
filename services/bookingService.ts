import { api } from "./api"
import { Booking } from "@/types/booking"

export const bookingService = {

    createBooking: (data: Partial<Booking>) => {
        return api.post<Booking, Partial<Booking>>(
            "/bookings",
            data
        )
    },

    getUserBookings: () => {
        return api.get<Booking[]>("/bookings")
    },

}