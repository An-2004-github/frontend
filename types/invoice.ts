export interface Invoice {

    invoice_id: number

    booking_id: number

    total_price: number

    status: "pending" | "paid" | "cancelled"

    created_at: string
}