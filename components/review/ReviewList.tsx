"use client";

import { useEffect, useState } from "react";
import { reviewService } from "@/services/reviewService";
import { Review } from "@/types/review";

interface Props {
    entityId: number;
    entityType: "hotel" | "flight" | "train" | "bus";
    refreshKey?: number;
}

const INITIAL_SHOW = 3;

export default function ReviewList({ entityId, entityType, refreshKey }: Props) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        setLoading(true);
        reviewService
            .getReviews(entityType, entityId)
            .then(setReviews)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [entityId, entityType, refreshKey]);

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem 0" }}>
                <div style={{
                    width: 28, height: 28, border: "3px solid #e8f0fe",
                    borderTopColor: "#0052cc", borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                }} />
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div style={{
                textAlign: "center", padding: "2.5rem 1rem",
                color: "#6b8cbf", fontSize: "0.9rem",
            }}>
                <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>💬</span>
                Chưa có đánh giá nào. Hãy là người đầu tiên!
            </div>
        );
    }

    const visible = showAll ? reviews : reviews.slice(0, INITIAL_SHOW);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {visible.map((review) => (
                <div key={review.review_id} style={{
                    padding: "1rem 0",
                    borderBottom: "1px solid #f0f4ff",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                        {/* Avatar */}
                        <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: "linear-gradient(135deg,#0052cc,#0065ff)",
                            color: "#fff", fontSize: "0.85rem", fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                        }}>
                            {(review.full_name ?? "U").charAt(0).toUpperCase()}
                        </div>

                        {/* Name + date */}
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1a3c6b" }}>
                                {review.full_name ?? "Khách ẩn danh"}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#6b8cbf" }}>
                                {new Date(review.created_at).toLocaleDateString("vi-VN")}
                            </div>
                        </div>

                        {/* Stars */}
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} style={{
                                    color: i < review.rating ? "#ffb800" : "#dde3f0",
                                    fontSize: "0.82rem",
                                }}>★</span>
                            ))}
                        </div>
                    </div>

                    <p style={{ fontSize: "0.88rem", color: "#4a5568", lineHeight: 1.65, margin: 0 }}>
                        {review.comment}
                    </p>
                </div>
            ))}

            {reviews.length > INITIAL_SHOW && (
                <button
                    onClick={() => setShowAll(v => !v)}
                    style={{
                        marginTop: "0.75rem", width: "100%",
                        padding: "0.55rem", borderRadius: 8,
                        border: "1.5px solid #c8d8ff", background: "#f0f4ff",
                        color: "#0052cc", fontSize: "0.85rem", fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    {showAll ? "▲ Thu gọn" : `▼ Xem thêm ${reviews.length - INITIAL_SHOW} đánh giá`}
                </button>
            )}
        </div>
    );
}