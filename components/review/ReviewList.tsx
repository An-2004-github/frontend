"use client"

import { useEffect, useState } from "react"
import { reviewService } from "@/services/reviewService"
import { Review } from "@/types/review"

interface Props {
    entityId: number
    entityType: "hotel" | "flight" | "train" | "bus"
}

export default function ReviewList({
    entityId,
    entityType,
}: Props) {

    const [reviews, setReviews] = useState<Review[]>([])

    useEffect(() => {

        const loadReviews = async () => {

            try {

                const data = await reviewService.getReviews(
                    entityType,
                    entityId
                )

                setReviews(data)

            } catch (error) {
                console.error(error)
            }
        }

        loadReviews()

    }, [entityId, entityType])

    return (
        <div className="flex flex-col gap-3">

            <h3 className="text-xl font-bold">
                Reviews
            </h3>

            {reviews.map((review) => (
                <div
                    key={review.review_id}
                    className="border p-3 rounded"
                >

                    <p>
                        Rating: {review.rating}
                    </p>

                    <p>
                        {review.comment}
                    </p>

                </div>
            ))}

        </div>
    )
}