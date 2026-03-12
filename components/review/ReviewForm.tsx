"use client";

import { useState } from "react";
import Button from "@/components/ui/button";

interface Props {
    // Đây chính là điểm cốt lõi của Polymorphic Association ở Frontend
    entityType: "hotel" | "flight" | "train" | "bus";
    entityId: number;
}

export default function ReviewForm({ entityType, entityId }: Props) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Payload chuẩn bị gửi xuống Backend
        const reviewData = {
            entity_type: entityType,
            entity_id: entityId,
            rating: rating,
            comment: comment,
            // user_id sẽ được backend lấy từ token (JWT) để bảo mật
        };

        try {
            // Giả lập gọi API: 
            // await axiosInstance.post('/reviews', reviewData);
            console.log("Dữ liệu gửi lên API:", reviewData);

            setTimeout(() => {
                alert("Cảm ơn bạn đã gửi đánh giá!");
                setComment("");
                setRating(5);
                setIsSubmitting(false);
            }, 800);
        } catch (error) {
            console.error("Lỗi khi gửi đánh giá:", error);
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-xl mt-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Viết đánh giá của bạn</h3>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Điểm đánh giá
                </label>
                <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full md:w-48 h-10 px-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                    <option value={5}>5 Sao (Tuyệt vời)</option>
                    <option value={4}>4 Sao (Rất tốt)</option>
                    <option value={3}>3 Sao (Bình thường)</option>
                    <option value={2}>2 Sao (Tạm được)</option>
                    <option value={1}>1 Sao (Tệ)</option>
                </select>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bình luận
                </label>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Chia sẻ trải nghiệm của bạn về dịch vụ này..."
                />
            </div>

            <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
            </Button>
        </form>
    );
}