"use client"

import { useState } from "react"
import Input from "@/components/ui/input"
import Button from "@/components/ui/button"
import { bookingService } from "@/services/bookingService"

interface Props {
    serviceId: number
    serviceType: "hotel" | "flight" | "train" | "bus"
}

export default function BookingForm({
    serviceId,
    serviceType,
}: Props) {

    const [date, setDate] = useState("")
    const [guests, setGuests] = useState(1)

    const handleBooking = async () => {
        await bookingService.createBooking({
            entity_id: serviceId,
            entity_type: serviceType,
            booking_date: date,

        })

        alert("Booking created!")
    }

    return (
        <div className="flex flex-col gap-4 border p-4 rounded-lg">

            <h3 className="font-semibold text-lg">
                Book this service
            </h3>

            <Input
                label="Booking date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
            />

            <Input
                label="Guests"
                type="number"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
            />

            <Button onClick={handleBooking}>
                Book now
            </Button>

        </div>
    )
}