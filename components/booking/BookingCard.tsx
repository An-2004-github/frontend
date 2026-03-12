import { Booking } from "@/types/booking"
import Link from "next/link"
interface Props {
    booking: Booking
}

export default function BookingCard({ booking }: Props) {

    return (
        <div className="border rounded-lg p-4 flex flex-col gap-2">

            <p>
                Booking ID: {booking.booking_id}
            </p>

            <p>
                Service Type: {booking.entity_type}
            </p>

            <p>
                Service ID: {booking.entity_id}
            </p>

            <p>
                Date: {booking.booking_date}
            </p>
            <Link
                href={`/invoice/${booking.booking_id}`}
                className="text-blue-500"
            >
                View Invoice
            </Link>
        </div>
    )
}