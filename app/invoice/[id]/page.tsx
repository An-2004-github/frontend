"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

import { invoiceService } from "@/services/invoiceService"
import { Invoice } from "@/types/invoice"

export default function InvoicePage() {

    const params = useParams()
    const id = params.id as string

    const [invoice, setInvoice] = useState<Invoice | null>(null)

    useEffect(() => {

        const loadInvoice = async () => {

            try {

                const data = await invoiceService.getInvoice(Number(id))

                setInvoice(data)

            } catch (error) {
                console.error(error)
            }
        }

        loadInvoice()

    }, [id])

    if (!invoice) {
        return <p>Loading invoice...</p>
    }

    return (
        <div className="flex flex-col gap-4">

            <h1 className="text-2xl font-bold">
                Invoice #{invoice.invoice_id}
            </h1>

            <p>
                Booking ID: {invoice.booking_id}
            </p>

            <p>
                Total Price: ${invoice.total_price}
            </p>

            <p>
                Status: {invoice.status}
            </p>

            <p>
                Created At: {invoice.created_at}
            </p>

        </div>
    )
}