"use client";

import { useState } from "react";
import { reviewService } from "@/services/reviewService";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

interface Props {
    entityType: "hotel" | "flight" | "train" | "bus";
    entityId: number;
    onSuccess?: () => void;
}

export default function ReviewForm({ entityType, entityId, onSuccess }: Props) {
    const { user } = useAuthStore();
    const [rating, setRating] = useState(5);
    const [hovered, setHovered] = useState(0);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;
        setIsSubmitting(true);
        setMessage(null);

        try {
            await reviewService.createReview({
                entity_type: entityType,
                entity_id: entityId,
                rating,
                comment,
            });
            setMessage({ type: "success", text: "Cảm ơn bạn đã gửi đánh giá! 🎉" });
            setComment("");
            setRating(5);
            onSuccess?.();
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 409) {
                setMessage({ type: "error", text: "Bạn đã đánh giá dịch vụ này rồi." });
            } else {
                setMessage({ type: "error", text: "Có lỗi xảy ra. Vui lòng thử lại sau." });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) {
        return (
            <div style={{
                background: "#f0f4ff", border: "1px solid #c8d8ff", borderRadius: 14,
                padding: "1.25rem 1.5rem", textAlign: "center", color: "#4a5568",
                fontSize: "0.92rem", marginTop: "1.5rem",
            }}>
                <span style={{ fontSize: "1.4rem", display: "block", marginBottom: "0.5rem" }}>✍️</span>
                <Link href="/login" style={{ color: "#0052cc", fontWeight: 600 }}>Đăng nhập</Link>
                {" "}để viết đánh giá của bạn
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{
            background: "#f8faff", border: "1px solid #e8f0fe", borderRadius: 14,
            padding: "1.5rem", marginTop: "1.5rem",
        }}>
            <h3 style={{
                fontFamily: "'Nunito', sans-serif", fontSize: "1rem", fontWeight: 700,
                color: "#1a3c6b", marginBottom: "1.1rem", paddingBottom: "0.75rem",
                borderBottom: "2px solid #e8f0fe",
            }}>
                ✍️ Viết đánh giá của bạn
            </h3>

            {/* Star Rating */}
            <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6b778c", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "0.4rem" }}>
                    Điểm đánh giá
                </div>
                <div style={{ display: "flex", gap: "0.3rem" }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <span
                            key={star}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHovered(star)}
                            onMouseLeave={() => setHovered(0)}
                            style={{
                                fontSize: "2rem",
                                cursor: "pointer",
                                color: star <= (hovered || rating) ? "#ffb800" : "#dde3f0",
                                transition: "color 0.15s, transform 0.1s",
                                transform: star <= (hovered || rating) ? "scale(1.15)" : "scale(1)",
                                userSelect: "none",
                            }}
                        >
                            ★
                        </span>
                    ))}
                    <span style={{ alignSelf: "center", marginLeft: "0.5rem", fontSize: "0.85rem", color: "#6b8cbf", fontWeight: 500 }}>
                        {["", "Tệ", "Tạm được", "Bình thường", "Rất tốt", "Tuyệt vời"][hovered || rating]}
                    </span>
                </div>
            </div>

            {/* Comment */}
            <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6b778c", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "0.4rem" }}>
                    Bình luận
                </div>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    rows={4}
                    style={{
                        width: "100%", padding: "0.75rem", border: "1.5px solid #dde3f0",
                        borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem",
                        color: "#1a3c6b", outline: "none", resize: "vertical",
                        transition: "border-color 0.2s", boxSizing: "border-box",
                    }}
                    onFocus={e => e.target.style.borderColor = "#0052cc"}
                    onBlur={e => e.target.style.borderColor = "#dde3f0"}
                    placeholder="Chia sẻ trải nghiệm của bạn về dịch vụ này..."
                />
            </div>

            {/* Message */}
            {message && (
                <div style={{
                    padding: "0.65rem 1rem", borderRadius: 10, fontSize: "0.88rem",
                    marginBottom: "0.75rem",
                    background: message.type === "success" ? "#d4edda" : "#fff0ee",
                    color: message.type === "success" ? "#00875a" : "#bf2600",
                    border: `1px solid ${message.type === "success" ? "#b7dfbb" : "#ffbdad"}`,
                }}>
                    {message.text}
                </div>
            )}

            <button type="submit" disabled={isSubmitting} style={{
                padding: "0.75rem 1.75rem", background: "linear-gradient(135deg,#0052cc,#0065ff)",
                color: "#fff", border: "none", borderRadius: 10,
                fontFamily: "'Nunito', sans-serif", fontSize: "0.92rem", fontWeight: 700,
                cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.6 : 1,
                transition: "opacity 0.15s, transform 0.1s",
            }}>
                {isSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
        </form>
    );
}