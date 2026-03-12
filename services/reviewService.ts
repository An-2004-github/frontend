import api from "@/lib/axios"
import { Review } from "@/types/review"

export const reviewService = {

    async getReviews(
        entityType: string,
        entityId: number
    ): Promise<Review[]> {

        const res = await api.get("/reviews", {
            params: {
                entity_type: entityType,
                entity_id: entityId,
            },
        })

        return res.data
    },

    async createReview(data: Partial<Review>) {

        const res = await api.post("/reviews", data)

        return res.data
    },
}