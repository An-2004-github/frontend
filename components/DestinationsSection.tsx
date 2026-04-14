"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Destination {
    destination_id: number;
    city: string;
    name: string;
    description?: string;
    image_url?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DestinationsSection() {
    const [destinations, setDestinations] = useState<Destination[]>([]);

    useEffect(() => {
        fetch(`${API}/api/destinations`)
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setDestinations(data.filter(d => d.image_url).slice(0, 6)); })
            .catch(() => {});
    }, []);

    if (destinations.length === 0) return null;

    return (
        <section>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#1a3c6b", margin: 0 }}>
                    📍 Điểm đến nổi bật
                </h2>
                <p style={{ color: "#6b8cbf", marginTop: "0.5rem", fontSize: "0.95rem" }}>
                    Khám phá những địa điểm du lịch hấp dẫn nhất Việt Nam
                </p>
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "1rem",
            }}>
                {destinations.map(dest => (
                    <Link
                        key={dest.destination_id}
                        href={`/hotels?search=${encodeURIComponent(dest.city)}`}
                        style={{ textDecoration: "none", display: "block", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,82,204,0.08)", transition: "transform 0.2s, box-shadow 0.2s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(0,82,204,0.16)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,82,204,0.08)"; }}
                    >
                        <div style={{ position: "relative", height: 180 }}>
                            <Image
                                src={dest.image_url!}
                                alt={dest.name}
                                fill
                                style={{ objectFit: "cover" }}
                                unoptimized
                            />
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
                            <div style={{ position: "absolute", bottom: "0.75rem", left: "0.85rem", color: "#fff" }}>
                                <div style={{ fontWeight: 800, fontSize: "1.05rem", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{dest.city}</div>
                                <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>{dest.name}</div>
                            </div>
                        </div>
                        {dest.description && (
                            <div style={{ padding: "0.65rem 0.9rem", background: "#fff", fontSize: "0.8rem", color: "#4a5568", lineHeight: 1.5 }}>
                                {dest.description.slice(0, 80)}{dest.description.length > 80 ? "…" : ""}
                            </div>
                        )}
                    </Link>
                ))}
            </div>
        </section>
    );
}
