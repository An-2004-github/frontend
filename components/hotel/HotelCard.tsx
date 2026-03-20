"use client";

import Link from "next/link";
import Image from "next/image";
import { Hotel } from "@/types/hotel";

interface Props {
    hotel: Hotel;
}

export default function HotelCard({ hotel }: Props) {
    // ✅ Không dùng "as any" vì hotel.ts đã có đủ các field này
    const stars = hotel.star_rating ?? hotel.stars ?? 0;
    const price = hotel.min_price ?? hotel.price_per_night ?? null;
    const imageUrl = hotel.image_url ?? null;
    const rating = hotel.avg_rating ?? 0;          // ✅ fallback 0, không còn undefined
    const reviews = hotel.review_count ?? 0;
    const city = hotel.destination_city ?? hotel.address ?? "Đang cập nhật";

    return (
        <div className="hcard">
            {/* Image */}
            <div className="hcard-img" style={{ position: "relative" }}>
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={hotel.name}
                        fill
                        style={{ objectFit: "cover" }}
                        sizes="(max-width: 768px) 100vw, 33vw"
                    />
                ) : (
                    <>
                        <div className="hcard-img-pattern" />
                        <div className="hcard-img-icon">🏨</div>
                    </>
                )}
                {stars > 0 && (
                    <div className="hcard-star-badge">{stars} ⭐</div>
                )}
            </div>

            {/* Body */}
            <div className="hcard-body">
                {/* Stars row */}
                {stars > 0 && (
                    <div className="hcard-stars">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} style={{ color: i < stars ? "#ffb800" : "#dde3f0", fontSize: "0.72rem" }}>★</span>
                        ))}
                    </div>
                )}

                <div className="hcard-name">{hotel.name}</div>

                <div className="hcard-location">
                    <span>📍</span>
                    <span>{city}</span>
                </div>

                {/* Rating */}
                {rating > 0 && (
                    <div className="hcard-rating">
                        <span className="hcard-rating-badge">{rating.toFixed(1)}</span>
                        <span className="hcard-rating-label">
                            {rating >= 4.8 ? "Xuất sắc" : rating >= 4.5 ? "Rất tốt" : "Tốt"}
                        </span>
                        {reviews > 0 && (
                            <span className="hcard-rating-count">
                                ({reviews.toLocaleString()} đánh giá)
                            </span>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="hcard-footer">
                    {price ? (
                        <div className="hcard-price">
                            <span className="hcard-price-from">Từ</span>
                            <span className="hcard-price-value">
                                {Number(price).toLocaleString("vi-VN")}₫
                            </span>
                            <span className="hcard-price-night">/đêm</span>
                        </div>
                    ) : (
                        <span className="hcard-price-contact">Liên hệ báo giá</span>
                    )}
                    <Link href={`/hotels/${hotel.hotel_id}`} className="hcard-btn">
                        Xem chi tiết
                    </Link>

                </div>
            </div>
        </div>
    );
}