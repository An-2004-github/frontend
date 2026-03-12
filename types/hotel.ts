export interface Hotel {
    hotel_id: number
    destination_id: number

    name: string
    address: string
    description?: string
    avg_rating?: number
    review_count?: number
}