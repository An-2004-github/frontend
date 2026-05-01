"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Destination {
    destination_id: number;
    city: string;
    name: string;
    description?: string;
    image_url?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DestinationRecommendations() {
    const router = useRouter();
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [hovered, setHovered] = useState<number | null>(null);

    useEffect(() => {
        fetch(`${API}/api/destinations`)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Lấy tối đa 8 địa điểm có ảnh
                    const withImg = data.filter(d => d.image_url);
                    setDestinations(withImg.slice(0, 8));
                }
            })
            .catch(() => { });
    }, []);

    if (destinations.length === 0) return null;

    const handleClick = (city: string) => {
        router.push(`/hotels?search=${encodeURIComponent(city)}`);
    };

    return (
        <section>
            <style>{`
                .pop-header {
                    display: flex; justify-content: space-between; align-items: flex-end;
                    margin-bottom: 1.75rem;
                }
                .pop-title { font-size: 1.75rem; font-weight: 800; color: #111827; margin-bottom: 0.3rem; }
                .pop-subtitle { color: #6b7280; font-size: 0.9rem; }
                .pop-see-all {
                    color: #2563eb; font-weight: 600; font-size: 0.88rem;
                    text-decoration: none; padding: 0.4rem 1rem;
                    border: 1.5px solid #bfdbfe; border-radius: 8px;
                    transition: all 0.15s; white-space: nowrap;
                }
                .pop-see-all:hover { background: #eff6ff; border-color: #93c5fd; }

                .pop-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                }
                @media (min-width: 640px)  { .pop-grid { grid-template-columns: repeat(3, 1fr); } }
                @media (min-width: 1024px) { .pop-grid { grid-template-columns: repeat(4, 1fr); } }

                .pop-card {
                    position: relative; border-radius: 18px; overflow: hidden;
                    height: 200px; cursor: pointer;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.10);
                    transition: transform 0.28s cubic-bezier(.34,1.4,.64,1), box-shadow 0.25s;
                }
                .pop-card:hover { transform: translateY(-6px) scale(1.025); box-shadow: 0 18px 40px rgba(0,0,0,0.22); }
                .pop-card:active { transform: scale(0.98); }

                .pop-overlay {
                    position: absolute; inset: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 55%, transparent 100%);
                    transition: opacity 0.25s;
                }
                .pop-card:hover .pop-overlay { opacity: 1.15; }

                .pop-hint {
                    position: absolute; inset: 0; display: flex;
                    align-items: center; justify-content: center;
                    opacity: 0; transition: opacity 0.2s;
                    background: rgba(0,53,128,0.22); backdrop-filter: blur(1px);
                }
                .pop-card:hover .pop-hint { opacity: 1; }
                .pop-hint span {
                    background: #fff; color: #003580;
                    font-size: 0.78rem; font-weight: 700;
                    padding: 0.45rem 1.1rem; border-radius: 99px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                }

                .pop-body {
                    position: absolute; bottom: 0; left: 0; right: 0;
                    padding: 0.85rem 1rem 0.9rem;
                }
                .pop-city {
                    font-size: 1.1rem; font-weight: 800; color: #fff;
                    text-shadow: 0 1px 4px rgba(0,0,0,0.5);
                    margin-bottom: 0.15rem;
                }
                .pop-label {
                    font-size: 0.7rem; color: rgba(255,255,255,0.82);
                    font-weight: 400;
                }
            `}</style>

            <div className="pop-header">
                <div>
                    <h2 className="pop-title">🌏 Điểm đến phổ biến</h2>
                    <p className="pop-subtitle">Những thành phố được yêu thích nhất Việt Nam</p>
                </div>
                <Link href="/hotels" className="pop-see-all">Xem tất cả →</Link>
            </div>
            <div className="pop-grid">
                {destinations.map((dest) => (
                    <div
                        key={dest.destination_id}
                        className="pop-card"
                        onClick={() => handleClick(dest.city)}
                        onMouseEnter={() => setHovered(dest.destination_id)}
                        onMouseLeave={() => setHovered(null)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === "Enter" && handleClick(dest.city)}
                        aria-label={`Tìm khách sạn tại ${dest.city}`}
                    >
                        <Image
                            src={dest.image_url!}
                            alt={dest.city}
                            fill
                            style={{
                                objectFit: "cover",
                                transform: hovered === dest.destination_id ? "scale(1.08)" : "scale(1)",
                                transition: "transform 0.45s ease",
                            }}
                            sizes="(max-width: 640px) 50vw, 25vw"
                            unoptimized
                        />
                        <div className="pop-overlay" />
                        <div className="pop-hint">
                            <span>🔍 Tìm khách sạn</span>
                        </div>
                        <div className="pop-body">
                            <div className="pop-city">{dest.city}</div>
                            <div className="pop-label">{dest.name}</div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
