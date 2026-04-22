"use client";

import Link from "next/link";
import Image from "next/image";
import { Hotel } from "@/types/hotel";
import { logInteraction } from "@/lib/logInteraction";

interface Props {
    hotel: Hotel;
    adults?: number;
    childrenCount?: number;
    rooms?: number;
    checkIn?: string;
    checkOut?: string;
}

export default function HotelCard({ hotel, adults = 1, childrenCount = 0, rooms = 1, checkIn = "", checkOut = "" }: Props) {
    const stars = hotel.star_rating ?? hotel.stars ?? 0;
    const price = hotel.min_price ?? hotel.price_per_night ?? null;
    const imageUrl = hotel.image_url ?? null;
    const rating = hotel.avg_rating ?? 0;
    const reviews = hotel.review_count ?? 0;
    const city = hotel.destination_city ?? hotel.address ?? "Đang cập nhật";
    const availRooms = hotel.available_rooms ?? null;
    const isLowRoom = availRooms !== null && availRooms <= 3;
    const isFull = availRooms !== null && availRooms === 0;

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

                {/* Room availability + refund policy */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.2rem" }}>
                    {availRooms !== null && (
                        <div style={{
                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                            fontSize: "0.72rem", fontWeight: 700,
                            padding: "0.2rem 0.6rem", borderRadius: 99,
                            background: isFull ? "#fff0f0" : isLowRoom ? "#fff8e1" : "#e6f9f0",
                            color: isFull ? "#c0392b" : isLowRoom ? "#b8860b" : "#00875a",
                            border: `1px solid ${isFull ? "#ffcdd2" : isLowRoom ? "#ffe082" : "#b7dfbb"}`,
                        }}>
                            {isFull ? "🚫 Hết phòng" : isLowRoom ? `🔥 Còn ${availRooms} phòng` : `✅ Còn ${availRooms} phòng trống`}
                        </div>
                    )}
                    {!hotel.allows_refund ? (
                        <div style={{
                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                            fontSize: "0.72rem", fontWeight: 700,
                            padding: "0.2rem 0.6rem", borderRadius: 99,
                            background: "#fff0f0", color: "#c0392b", border: "1px solid #ffcdd2",
                        }}>
                            ⛔ Không hoàn tiền
                        </div>
                    ) : (
                        <div style={{
                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                            fontSize: "0.72rem", fontWeight: 700,
                            padding: "0.2rem 0.6rem", borderRadius: 99,
                            background: "#e6f9f0", color: "#00875a", border: "1px solid #b7dfbb",
                        }}>
                            ✓ Có thể hoàn tiền
                        </div>
                    )}
                </div>

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
                    <Link
                        href={`/hotels/${hotel.hotel_id}?adults=${adults}&children=${childrenCount}&rooms=${rooms}${checkIn ? `&check_in=${checkIn}` : ""}${checkOut ? `&check_out=${checkOut}` : ""}`}
                        className="hcard-btn"
                        onClick={() => logInteraction("hotel", hotel.hotel_id, "click")}
                    >
                        Xem chi tiết
                    </Link>

                </div>
            </div>
        </div>
    );
}