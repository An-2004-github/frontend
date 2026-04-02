export interface Review {
    review_id: number
    user_id: number
    full_name?: string
    entity_type: "hotel" | "flight" | "train" | "bus"
    entity_id: number
    rating: number
    comment: string
    created_at: string
}