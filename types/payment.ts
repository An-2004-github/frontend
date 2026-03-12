export interface Payment {
    payment_id: number

    invoice_id: number

    method: string

    amount: number

    status: string

    paid_at?: string
}