export interface Destination {
    destination_id: number
    name: string
    country: string
    city: string
    description?: string

    avg_rating?: number
    review_count?: number
}