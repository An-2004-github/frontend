"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/axios";

interface Hotel {
    hotel_id: number;
    name: string;
    address: string;
    avg_rating: number;
    min_price: number;
    image_url?: string;
    destination_city?: string;
}

interface Props {
    entityType: "room" | "flight" | "bus";
    toCity?: string;       // dùng cho flight/bus
    checkIn?: string;      // dùng cho hotel → suggest vé
}

export default function BookingSuggestions({ entityType, toCity, checkIn }: Props) {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(false);

    const isTransport = entityType === "flight" || entityType === "bus";
    const city = toCity || "";

    useEffect(() => {
        if (!isTransport || !city) return;
        setLoading(true);
        api.get("/api/hotels", { params: { search: city, limit: 3, sort: "rating" } })
            .then(res => setHotels(res.data.slice(0, 3)))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isTransport, city]);

    return (
        <>
            <style>{`
                .bs-wrap {
                    max-width: 600px; margin: 1.5rem auto 0;
                    font-family: 'DM Sans', sans-serif;
                }
                .bs-title {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1.05rem; font-weight: 800; color: #1a3c6b;
                    margin-bottom: 0.85rem;
                    display: flex; align-items: center; gap: 0.5rem;
                }
                /* Transport cards (for hotel booking) */
                .bs-transport-grid {
                    display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;
                }
                .bs-transport-card {
                    background: #fff; border: 1.5px solid #e8f0fe; border-radius: 14px;
                    padding: 1.25rem 1rem; text-align: center; text-decoration: none;
                    transition: box-shadow 0.18s, transform 0.18s;
                    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
                }
                .bs-transport-card:hover {
                    box-shadow: 0 6px 20px rgba(0,82,204,0.12);
                    transform: translateY(-2px);
                }
                .bs-transport-icon { font-size: 2.2rem; }
                .bs-transport-label {
                    font-family: 'Nunito', sans-serif;
                    font-size: 0.95rem; font-weight: 700; color: #1a3c6b;
                }
                .bs-transport-sub { font-size: 0.78rem; color: #6b8cbf; }
                .bs-transport-btn {
                    margin-top: 0.4rem; padding: 0.4rem 1rem;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; border-radius: 99px; font-size: 0.8rem;
                    font-weight: 600; font-family: 'DM Sans', sans-serif;
                }

                /* Hotel cards (for flight/bus booking) */
                .bs-hotel-list { display: flex; flex-direction: column; gap: 0.75rem; }
                .bs-hotel-card {
                    background: #fff; border: 1.5px solid #e8f0fe; border-radius: 14px;
                    overflow: hidden; display: flex; text-decoration: none;
                    transition: box-shadow 0.18s, transform 0.18s;
                }
                .bs-hotel-card:hover {
                    box-shadow: 0 6px 20px rgba(0,82,204,0.12);
                    transform: translateY(-2px);
                }
                .bs-hotel-img {
                    width: 90px; flex-shrink: 0; position: relative;
                    background: linear-gradient(135deg, #003580, #0065ff);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 2rem;
                }
                .bs-hotel-body { padding: 0.75rem 1rem; flex: 1; min-width: 0; }
                .bs-hotel-name {
                    font-weight: 700; color: #1a3c6b; font-size: 0.9rem;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    margin-bottom: 0.2rem;
                }
                .bs-hotel-addr { font-size: 0.75rem; color: #6b8cbf; margin-bottom: 0.4rem; }
                .bs-hotel-footer { display: flex; align-items: center; justify-content: space-between; }
                .bs-hotel-rating {
                    background: #0052cc; color: #fff; font-size: 0.72rem;
                    font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 6px;
                }
                .bs-hotel-price { font-size: 0.82rem; font-weight: 700; color: #0052cc; }

                .bs-skeleton {
                    background: linear-gradient(90deg, #f0f4ff 25%, #e0eaff 50%, #f0f4ff 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.2s infinite;
                    border-radius: 14px; height: 80px;
                }
                @keyframes shimmer { to { background-position: -200% 0; } }

                @media (max-width: 480px) {
                    .bs-transport-grid { grid-template-columns: 1fr; }
                }
            `}</style>

            <div className="bs-wrap">
                {/* Đặt khách sạn → gợi ý vé */}
                {!isTransport && (
                    <>
                        <div className="bs-title">
                            ✈️ Bạn có thể cần phương tiện di chuyển
                        </div>
                        <div className="bs-transport-grid">
                            <Link
                                href={`/flights${checkIn ? `?date=${checkIn}` : ""}`}
                                className="bs-transport-card"
                            >
                                <span className="bs-transport-icon">✈️</span>
                                <div className="bs-transport-label">Vé máy bay</div>
                                <div className="bs-transport-sub">Nhiều hãng, giá tốt nhất</div>
                                <span className="bs-transport-btn">Tìm vé ngay →</span>
                            </Link>
                            <Link
                                href={`/buses${checkIn ? `?date=${checkIn}` : ""}`}
                                className="bs-transport-card"
                            >
                                <span className="bs-transport-icon">🚌</span>
                                <div className="bs-transport-label">Xe khách</div>
                                <div className="bs-transport-sub">Tiết kiệm, đa tuyến</div>
                                <span className="bs-transport-btn">Tìm xe ngay →</span>
                            </Link>
                        </div>
                    </>
                )}

                {/* Đặt vé → gợi ý khách sạn */}
                {isTransport && city && (
                    <>
                        <div className="bs-title">
                            🏨 Khách sạn tại {city} bạn có thể thích
                        </div>
                        <div className="bs-hotel-list">
                            {loading ? (
                                <>
                                    <div className="bs-skeleton" />
                                    <div className="bs-skeleton" />
                                    <div className="bs-skeleton" />
                                </>
                            ) : hotels.length > 0 ? hotels.map(h => (
                                <Link
                                    key={h.hotel_id}
                                    href={`/hotels/${h.hotel_id}`}
                                    className="bs-hotel-card"
                                >
                                    <div className="bs-hotel-img">
                                        {h.image_url ? (
                                            <Image
                                                src={h.image_url}
                                                alt={h.name}
                                                fill
                                                style={{ objectFit: "cover" }}
                                                sizes="90px"
                                            />
                                        ) : "🏨"}
                                    </div>
                                    <div className="bs-hotel-body">
                                        <div className="bs-hotel-name">{h.name}</div>
                                        <div className="bs-hotel-addr">📍 {h.address || h.destination_city || city}</div>
                                        <div className="bs-hotel-footer">
                                            {(h.avg_rating ?? 0) > 0 && (
                                                <span className="bs-hotel-rating">★ {Number(h.avg_rating).toFixed(1)}</span>
                                            )}
                                            {h.min_price && (
                                                <span className="bs-hotel-price">
                                                    Từ {Number(h.min_price).toLocaleString("vi-VN")}₫/đêm
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            )) : (
                                <div style={{ textAlign: "center", padding: "1rem", color: "#6b8cbf", fontSize: "0.85rem" }}>
                                    Chưa có khách sạn tại {city}
                                </div>
                            )}

                            {hotels.length > 0 && (
                                <Link
                                    href={`/hotels?search=${encodeURIComponent(city)}`}
                                    style={{
                                        display: "block", textAlign: "center",
                                        padding: "0.7rem", background: "#f0f4ff",
                                        border: "1.5px solid #c8d8ff", borderRadius: 10,
                                        color: "#0052cc", fontWeight: 600, fontSize: "0.85rem",
                                        textDecoration: "none",
                                    }}
                                >
                                    Xem thêm khách sạn tại {city} →
                                </Link>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
