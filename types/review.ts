export interface Review {
    review_id: number

    user_id: number

    entity_type: "hotel" | "flight" | "train" | "bus"

    entity_id: number

    rating: number

    comment: string

    created_at: string
}