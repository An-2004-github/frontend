"use client"

import { useState } from "react"
import { reviewService } from "@/services/reviewService"

interface Props {
    entityId: number
    entityType: "hotel" | "flight" | "train" | "bus"
}

export default function ReviewForm({
    entityId,
    entityType,
}: Props) {

    const [rating, setRating] = useState(5)
    const [comment, setComment] = useState("")

    const handleSubmit = async () => {

        try {

            await reviewService.createReview({
                entity_id: entityId,
                entity_type: entityType,
                rating,
                comment,
            })

            alert("Review submitted!")

        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="flex flex-col gap-2">

            <h3 className="font-bold">
                Write a review
            </h3>

            <input
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="border p-2"
            />

            <textarea
                placeholder="Write comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="border p-2"
            />

            <button
                onClick={handleSubmit}
                className="bg-blue-500 text-white p-2 rounded"
            >
                Submit Review
            </button>

        </div>
    )
}