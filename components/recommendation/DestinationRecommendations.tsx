"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

interface Destination {
    destination_id: number;
    name: string;
    city: string;
    country?: string;
    description?: string;
    min_price?: number;
    best_rating?: number;
    booking_count?: number;
    image_url?: string;
    score?: number;
    boosted?: boolean;   // true = được boost từ search gần đây
}

const GRAD_COLORS = [
    "from-blue-400 to-emerald-400",
    "from-orange-400 to-pink-500",
    "from-purple-500 to-indigo-500",
    "from-cyan-500 to-blue-500",
    "from-rose-400 to-orange-400",
    "from-teal-400 to-cyan-500",
    "from-violet-500 to-purple-500",
    "from-amber-400 to-yellow-500",
];

export default function DestinationRecommendations() {
    const { user } = useAuthStore();
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPersonalized, setIsPersonalized] = useState(false);

    useEffect(() => {
        const fetchRecs = async () => {
            setLoading(true);
            try {
                if (user) {
                    const res = await api.get("/api/recommendations/", { params: { limit: 8 } });
                    setDestinations(res.data);
                    setIsPersonalized(true);
                } else {
                    const res = await api.get("/api/recommendations/guest", { params: { limit: 8 } });
                    setDestinations(res.data);
                    setIsPersonalized(false);
                }
            } catch {
                // fallback to popular
                try {
                    const res = await api.get("/api/recommendations/popular", { params: { limit: 8 } });
                    setDestinations(res.data);
                } catch {
                    setDestinations([]);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchRecs();
    }, [user]);

    if (loading) {
        return (
            <section>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                    <div>
                        <div style={{ height: 32, width: 280, background: "#e8f0fe", borderRadius: 8, marginBottom: 8 }} />
                        <div style={{ height: 18, width: 200, background: "#f0f4ff", borderRadius: 6 }} />
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} style={{ height: 200, borderRadius: 20, background: "linear-gradient(135deg,#e8f0fe,#f0f4ff)", animation: "pulse 1.5s ease-in-out infinite" }} />
                    ))}
                </div>
            </section>
        );
    }

    if (destinations.length === 0) return null;

    return (
        <section>
            <style>{`
                .rec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
                @media (min-width: 768px) { .rec-grid { grid-template-columns: repeat(4, 1fr); } }
                .rec-card { position: relative; border-radius: 20px; overflow: hidden; height: 200px; cursor: pointer; box-shadow: 0 2px 12px rgba(0,0,0,0.10); transition: transform 0.25s, box-shadow 0.25s; }
                .rec-card:hover { transform: translateY(-4px); box-shadow: 0 8px 28px rgba(0,0,0,0.18); }
                .rec-card-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.75) 40%, transparent 100%); }
                .rec-card-body { position: absolute; bottom: 0; left: 0; padding: 1rem; color: #fff; }
                .rec-card-city { font-size: 1.05rem; font-weight: 800; margin-bottom: 0.15rem; line-height: 1.2; }
                .rec-card-meta { font-size: 0.72rem; color: rgba(255,255,255,0.82); display: flex; gap: 0.5rem; align-items: center; }
                .rec-score-badge { position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.18); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.3); color: #fff; font-size: 0.68rem; font-weight: 700; padding: 0.18rem 0.5rem; border-radius: 99px; }
                @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
            `}</style>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <div>
                    <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#111827", marginBottom: "0.25rem" }}>
                        {isPersonalized ? "✨ Gợi ý dành riêng cho bạn" : "🔥 Điểm đến nổi bật"}
                    </h2>
                    <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
                        {isPersonalized
                            ? "Dựa trên lịch sử và sở thích của bạn"
                            : "Những địa điểm được yêu thích nhất"}
                    </p>
                </div>
                <Link href="/hotels" style={{ color: "#2563eb", fontWeight: 600, fontSize: "0.95rem", textDecoration: "none" }}>
                    Xem tất cả →
                </Link>
            </div>

            <div className="rec-grid">
                {destinations.map((dest, idx) => (
                    <Link
                        key={dest.destination_id}
                        href={`/hotels?destination_id=${dest.destination_id}&search=${encodeURIComponent(dest.city)}`}
                        style={{ textDecoration: "none" }}
                    >
                        <div className="rec-card">
                            {/* Background: real image or gradient fallback */}
                            {dest.image_url ? (
                                <Image
                                    src={dest.image_url}
                                    alt={dest.name}
                                    fill
                                    style={{ objectFit: "cover" }}
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                />
                            ) : (
                                <div style={{
                                    position: "absolute", inset: 0,
                                    background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                                }} className={`bg-linear-to-br ${GRAD_COLORS[idx % GRAD_COLORS.length]}`} />
                            )}

                            <div className="rec-card-overlay" />

                            {/* Badge: boosted từ search hoặc NCF score */}
                            {isPersonalized && (
                                dest.boosted
                                    ? <div className="rec-score-badge">🔍 Tìm kiếm gần đây</div>
                                    : dest.score !== undefined && (
                                        <div className="rec-score-badge">
                                            ⚡ {Math.round(dest.score * 100)}% phù hợp
                                        </div>
                                    )
                            )}

                            <div className="rec-card-body">
                                <div className="rec-card-city">{dest.city || dest.name}</div>
                                <div className="rec-card-meta">
                                    {dest.best_rating && dest.best_rating > 0 && (
                                        <span>⭐ {Number(dest.best_rating).toFixed(1)}</span>
                                    )}
                                    {dest.min_price && (
                                        <span>Từ {Number(dest.min_price).toLocaleString("vi-VN")}₫</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
