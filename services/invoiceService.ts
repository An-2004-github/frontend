import api from "@/lib/axios"
import { Invoice } from "@/types/invoice"

export const invoiceService = {

    async getInvoice(id: number): Promise<Invoice> {

        const res = await api.get(`/invoices/${id}`)

        return res.data
    }

}