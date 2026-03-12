export interface Booking {
    booking_id: number

    user_id: number

    entity_type: "hotel" | "flight" | "train" | "bus"

    entity_id: number

    booking_date: string

    status: "pending" | "confirmed" | "cancelled"

    total_price: number
}