"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Banner {
    banner_id: number;
    title: string;
    subtitle: string | null;
    image_url: string;
    link_url: string | null;
    display_order: number;
}

export default function BannerSlider() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [current, setCurrent] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/banners`)
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setBanners(data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Auto slide every 5s
    useEffect(() => {
        if (banners.length <= 1) return;
        const t = setInterval(() => setCurrent(c => (c + 1) % banners.length), 5000);
        return () => clearInterval(t);
    }, [banners.length]);

    if (loading || banners.length === 0) return null;

    const banner = banners[current];

    const inner = (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <Image
                src={banner.image_url}
                alt={banner.title}
                fill
                className="object-cover"
                unoptimized
                priority
            />
            {/* Overlay */}
            <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
            }} />
            {/* Text */}
            <div style={{
                position: "absolute", left: "5%", bottom: "20%",
                color: "#fff", maxWidth: 480,
            }}>
                <div style={{
                    fontSize: "clamp(1.2rem, 3vw, 1.75rem)", fontWeight: 800,
                    lineHeight: 1.3, marginBottom: "0.5rem",
                    textShadow: "0 2px 8px rgba(0,0,0,0.4)",
                }}>
                    {banner.title}
                </div>
                {banner.subtitle && (
                    <div style={{
                        fontSize: "clamp(0.85rem, 1.5vw, 1rem)", fontWeight: 400,
                        opacity: 0.9, textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                    }}>
                        {banner.subtitle}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <section style={{ width: "100%", position: "relative" }}>
            <style>{`
                .bn-root {
                    width: 100%; height: clamp(160px, 28vw, 340px);
                    border-radius: 20px; overflow: hidden;
                    position: relative; cursor: pointer;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
                }
                .bn-root:hover img { transform: scale(1.03); transition: transform 0.6s ease; }
                .bn-dots {
                    display: flex; justify-content: center; gap: 6px;
                    margin-top: 12px;
                }
                .bn-dot {
                    width: 8px; height: 8px; border-radius: 99px;
                    background: #c8d8ff; border: none; cursor: pointer; padding: 0;
                    transition: all 0.25s;
                }
                .bn-dot.active { background: #0052cc; width: 22px; }
                .bn-arrows {
                    position: absolute; top: 50%; transform: translateY(-50%);
                    width: 100%; display: flex; justify-content: space-between;
                    padding: 0 12px; pointer-events: none; box-sizing: border-box;
                }
                .bn-arrow {
                    width: 34px; height: 34px; border-radius: 50%;
                    background: rgba(255,255,255,0.8); border: none;
                    font-size: 1rem; cursor: pointer; pointer-events: all;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    transition: background 0.15s;
                }
                .bn-arrow:hover { background: #fff; }
            `}</style>

            <div className="bn-root">
                {banner.link_url ? (
                    <Link href={banner.link_url} style={{ display: "block", width: "100%", height: "100%" }}>
                        {inner}
                    </Link>
                ) : inner}

                {banners.length > 1 && (
                    <div className="bn-arrows">
                        <button className="bn-arrow" onClick={e => { e.preventDefault(); setCurrent(c => (c - 1 + banners.length) % banners.length); }}>‹</button>
                        <button className="bn-arrow" onClick={e => { e.preventDefault(); setCurrent(c => (c + 1) % banners.length); }}>›</button>
                    </div>
                )}
            </div>

            {banners.length > 1 && (
                <div className="bn-dots">
                    {banners.map((_, i) => (
                        <button key={i} className={`bn-dot${i === current ? " active" : ""}`} onClick={() => setCurrent(i)} />
                    ))}
                </div>
            )}
        </section>
    );
}
