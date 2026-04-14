"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Promotion } from "@/types/promotion";
import { promotionService } from "@/services/promotionService";
import PromotionList from "@/components/promotion/promotionList";
import api from "@/lib/axios";

interface Banner {
    banner_id: number;
    title: string;
    subtitle?: string;
    image_url: string;
    link_url?: string;
    display_order: number;
}

const CATEGORIES = [
    { key: "hotel", label: "Khách sạn", icon: "🏨" },
    { key: "flight", label: "Máy bay", icon: "✈️" },
    { key: "bus", label: "Xe khách", icon: "🚌" },
    { key: "train", label: "Tàu hỏa", icon: "🚆" },
];

export default function PromotionsPage() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState("hotel");
    const [copiedWelcome, setCopiedWelcome] = useState(false);
    const [banners, setBanners] = useState<Banner[]>([]);

    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const tabsRef = useRef<HTMLDivElement>(null);

    // Fetch promotions & banners
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [data, bannerData] = await Promise.all([
                    promotionService.getPromotions(),
                    api.get("/api/banners?page=promotion").then(r => r.data).catch(() => []),
                ]);
                setPromotions(data);
                setBanners(bannerData);
            } catch (err) {
                console.error(err);
                setError("Không thể tải dữ liệu. Vui lòng thử lại.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Highlight active tab on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveCategory(
                            entry.target.getAttribute("data-category") || "all"
                        );
                    }
                });
            },
            { rootMargin: "-40% 0px -55% 0px" }
        );
        Object.values(sectionRefs.current).forEach((el) => {
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [loading]);

    const handleTabClick = (key: string) => {
        setActiveCategory(key);
        const el = sectionRefs.current[key];
        if (el) {
            const top = el.getBoundingClientRect().top + window.scrollY - 72;
            window.scrollTo({ top, behavior: "smooth" });
        }
    };

    // Group promotions by category
    const grouped = CATEGORIES.reduce((acc, cat) => {
        acc[cat.key] = promotions.filter(
            (p) => p.applies_to === cat.key || p.applies_to === "all"
        );
        return acc;
    }, {} as Record<string, Promotion[]>);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

                * { box-sizing: border-box; }

                /* ===== CARD STYLES (dùng trong PromotionCard) ===== */
                .pcard {
                    background: #fff;
                    border-radius: 12px;
                    border: 1px solid #e8f0fe;
                    overflow: hidden;
                    transition: transform 0.2s, box-shadow 0.2s;
                    display: flex;
                    flex-direction: column;
                }
                .pcard:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 28px rgba(0,82,204,0.1);
                }
                .pcard--inactive { opacity: 0.55; filter: grayscale(40%); }

                .pcard-top {
                    background: linear-gradient(135deg, #003580, #0052cc, #0065ff);
                    padding: 1.25rem 1.25rem 1rem;
                    position: relative;
                    overflow: hidden;
                }
                .pcard-top-pattern {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px);
                    background-size: 18px 18px;
                }
                .pcard-top-corner {
                    position: absolute; right: -30px; top: -30px;
                    width: 100px; height: 100px;
                    border-radius: 50%; background: rgba(255,255,255,0.06);
                }
                .pcard-discount {
                    position: relative;
                    display: flex; align-items: flex-end; gap: 0.4rem;
                }
                .pcard-discount-value {
                    font-family: 'Nunito', sans-serif;
                    font-size: 2rem; font-weight: 800; color: #fff; line-height: 1;
                }
                .pcard-discount-max {
                    font-size: 0.75rem; color: rgba(255,255,255,0.75);
                    font-weight: 400; padding-bottom: 0.2rem;
                }
                .pcard-badges {
                    position: absolute; top: 0; right: 0;
                    display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem;
                }
                .pcard-badge {
                    font-size: 0.68rem; font-weight: 600;
                    padding: 0.2rem 0.55rem; border-radius: 99px; white-space: nowrap;
                }
                .pcard-badge--hot      { background: #ff5630; color: #fff; }
                .pcard-badge--expiring { background: #ff991f; color: #fff; }
                .pcard-badge--inactive { background: rgba(255,255,255,0.2); color: #fff; }

                .pcard-notch {
                    height: 0; position: relative;
                    display: flex; align-items: center;
                }
                .pcard-notch::before, .pcard-notch::after {
                    content: ''; position: absolute;
                    width: 16px; height: 16px;
                    background: #f0f4ff; border-radius: 50%;
                    border: 1px solid #e8f0fe; top: -8px; z-index: 2;
                }
                .pcard-notch::before { left: -8px; }
                .pcard-notch::after  { right: -8px; }
                .pcard-notch-line { width: 100%; border-top: 2px dashed #c8d8ff; }

                .pcard-body {
                    padding: 1rem 1.25rem 1.25rem;
                    flex: 1; display: flex; flex-direction: column; gap: 0.75rem;
                }
                .pcard-code-row {
                    display: flex; align-items: center; gap: 0.6rem;
                    background: #f0f4ff; border: 1.5px dashed #c8d8ff;
                    border-radius: 8px; padding: 0.5rem 0.75rem;
                }
                .pcard-code {
                    font-family: 'Courier New', monospace;
                    font-size: 0.95rem; font-weight: 700;
                    color: #0052cc; letter-spacing: 1.5px; flex: 1;
                }
                .pcard-copy-btn {
                    font-size: 0.75rem; font-weight: 600;
                    padding: 0.3rem 0.75rem;
                    background: #0052cc; color: #fff;
                    border: none; border-radius: 6px; cursor: pointer;
                    transition: background 0.15s; white-space: nowrap; flex-shrink: 0;
                }
                .pcard-copy-btn:hover:not(:disabled) { background: #0041a8; }
                .pcard-copy-btn:disabled { opacity: 0.45; cursor: not-allowed; }
                .pcard-copy-btn--copied { background: #00875a; }

                .pcard-meta {
                    display: flex; align-items: center; gap: 0.4rem;
                    font-size: 0.78rem; color: #6b778c; flex-wrap: wrap;
                }
                .pcard-meta-dot { color: #c1c7d0; }

                .pcard-limits {
                    display: flex; flex-direction: column; gap: 0.3rem;
                    background: #f8faff; border: 1px solid #e8f0fe;
                    border-radius: 8px; padding: 0.5rem 0.75rem;
                }
                .pcard-limit-item {
                    display: flex; justify-content: space-between; align-items: center;
                }
                .pcard-limit-label {
                    font-size: 0.75rem; color: #6b778c;
                }
                .pcard-limit-value {
                    font-size: 0.75rem; font-weight: 600; color: #172b4d;
                }
                .pcard-limit-value:has(+ *) { color: #00875a; }

                .pcard-usage { display: flex; flex-direction: column; gap: 0.3rem; }
                .pcard-usage-bar {
                    height: 5px; background: #ebecf0;
                    border-radius: 99px; overflow: hidden;
                }
                .pcard-usage-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #0052cc, #0065ff);
                    border-radius: 99px; transition: width 0.5s ease;
                }
                .pcard-usage-fill--hot { background: linear-gradient(90deg, #ff5630, #ff7452); }
                .pcard-usage-text { font-size: 0.72rem; color: #97a0af; }

                /* ===== LIST STYLES (dùng trong PromotionList) ===== */
                .pp-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
                    gap: 1.25rem;
                }
                .pp-empty {
                    text-align: center; padding: 3rem;
                    background: #fff; border-radius: 12px;
                    border: 1px dashed #c8d8ff; color: #6b778c;
                }

                /* ===== PAGE STYLES ===== */
                .pp-root {
                    min-height: 100vh; background: #f0f4ff;
                    font-family: 'DM Sans', sans-serif;
                }

                .pp-hero {
                    background: linear-gradient(135deg, #003580 0%, #0052cc 50%, #0065ff 100%);
                    padding: 3rem 2rem 4rem;
                    text-align: center; position: relative; overflow: hidden;
                }
                .pp-hero-bg {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
                    background-size: 24px 24px;
                }
                .pp-hero-circle {
                    position: absolute; border-radius: 50%;
                    background: rgba(255,255,255,0.05);
                }
                .pp-hero h1 {
                    font-family: 'Nunito', sans-serif;
                    font-size: 2.2rem; font-weight: 800; color: #fff;
                    margin: 0 0 0.5rem; position: relative;
                }
                .pp-hero p {
                    color: rgba(255,255,255,0.75);
                    font-size: 1rem; font-weight: 300; position: relative;
                }
                .pp-hero-stats {
                    display: flex; justify-content: center; gap: 2rem;
                    margin-top: 1.75rem; position: relative;
                }
                .pp-hero-stat {
                    background: rgba(255,255,255,0.12);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 12px; padding: 0.75rem 1.5rem;
                    color: #fff; backdrop-filter: blur(4px);
                }
                .pp-hero-stat-value {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1.5rem; font-weight: 800; display: block;
                }
                .pp-hero-stat-label { font-size: 0.78rem; opacity: 0.75; font-weight: 300; }

                .pp-tabs-wrap {
                    position: sticky; top: 0; z-index: 50;
                    background: #fff;
                    box-shadow: 0 2px 8px rgba(0,82,204,0.08);
                    border-bottom: 1px solid #e8f0fe;
                }
                .pp-tabs {
                    max-width: 1100px; margin: 0 auto; padding: 0 1.5rem;
                    display: flex; justify-content: center; overflow-x: auto; scrollbar-width: none;
                }
                .pp-tabs::-webkit-scrollbar { display: none; }
                .pp-tab {
                    display: flex; align-items: center; gap: 0.4rem;
                    padding: 1rem 1.25rem;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.88rem; font-weight: 400; color: #6b778c;
                    background: none; border: none;
                    border-bottom: 2.5px solid transparent;
                    cursor: pointer; white-space: nowrap;
                    transition: color 0.2s, border-color 0.2s;
                }
                .pp-tab:hover { color: #0052cc; }
                .pp-tab.active { color: #0052cc; font-weight: 600; border-bottom-color: #0052cc; }

                .pp-content {
                    max-width: 1100px; margin: 0 auto;
                    padding: 2rem 1.5rem 4rem;
                }
                .pp-section {
                    margin-bottom: 3rem; scroll-margin-top: 72px;
                }
                .pp-section-header {
                    display: flex; align-items: center; gap: 0.75rem;
                    margin-bottom: 1.25rem; padding-bottom: 0.75rem;
                    border-bottom: 2px solid #e8f0fe;
                }
                .pp-section-icon {
                    width: 36px; height: 36px;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1rem; flex-shrink: 0;
                }
                .pp-section-title {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1.15rem; font-weight: 700; color: #172b4d;
                }
                .pp-section-count {
                    margin-left: auto; font-size: 0.8rem; color: #0052cc;
                    background: #e8f0fe; padding: 0.2rem 0.65rem;
                    border-radius: 99px; font-weight: 500;
                }

                .pp-loading {
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    padding: 5rem; gap: 1rem; color: #6b778c;
                }
                .pp-spinner {
                    width: 36px; height: 36px;
                    border: 3px solid #e8f0fe; border-top-color: #0052cc;
                    border-radius: 50%; animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                .pp-error {
                    background: #fff0ee; border: 1px solid #ffbdad;
                    color: #bf2600; padding: 1.5rem; border-radius: 12px;
                    text-align: center; margin: 2rem 1.5rem;
                }

                /* ===== BANNERS ===== */
                .pp-banners {
                    max-width: 1100px; margin: 2rem auto 0;
                    padding: 0 1.5rem;
                    display: flex; flex-direction: column; gap: 0.85rem;
                }
                .pp-banner-img {
                    width: 100% !important;
                    height: auto !important;
                    border-radius: 14px; display: block;
                    box-shadow: 0 4px 18px rgba(0,82,204,0.13);
                    transition: transform 0.22s, box-shadow 0.22s;
                }
                .pp-banner-img:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 32px rgba(0,82,204,0.18);
                }

                /* ===== WELCOME30 HIGHLIGHT ===== */
                .pp-welcome-wrap {
                    max-width: 1100px; margin: 1.5rem auto 0;
                    padding: 0 1.5rem;
                }
                .pp-welcome {
                    background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ffcd3c 100%);
                    border-radius: 16px;
                    padding: 1.5rem 2rem;
                    display: flex; align-items: center; gap: 1.5rem;
                    box-shadow: 0 6px 24px rgba(247,147,30,0.3);
                    position: relative; overflow: hidden;
                }
                .pp-welcome::before {
                    content: '';
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
                    background-size: 20px 20px;
                }
                .pp-welcome-badge {
                    background: rgba(255,255,255,0.25);
                    border: 2px solid rgba(255,255,255,0.5);
                    border-radius: 12px;
                    padding: 0.5rem 1rem;
                    font-size: 2rem; font-weight: 800;
                    color: #fff; letter-spacing: 2px;
                    font-family: 'Courier New', monospace;
                    flex-shrink: 0; position: relative;
                    text-shadow: 0 2px 6px rgba(0,0,0,0.2);
                }
                .pp-welcome-info { flex: 1; position: relative; }
                .pp-welcome-title {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1.1rem; font-weight: 800;
                    color: #fff; margin: 0 0 0.2rem;
                    text-shadow: 0 1px 4px rgba(0,0,0,0.15);
                }
                .pp-welcome-desc {
                    font-size: 0.85rem; color: rgba(255,255,255,0.9);
                    margin: 0;
                }
                .pp-welcome-copy {
                    position: relative;
                    background: #fff;
                    color: #f7931e;
                    font-weight: 700; font-size: 0.88rem;
                    padding: 0.6rem 1.4rem;
                    border-radius: 99px; border: none;
                    cursor: pointer; white-space: nowrap; flex-shrink: 0;
                    box-shadow: 0 3px 12px rgba(0,0,0,0.15);
                    transition: transform 0.15s, box-shadow 0.15s;
                }
                .pp-welcome-copy:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.2); }
                .pp-welcome-copy.copied { background: #00875a; color: #fff; }

                @media (max-width: 640px) {
                    .pp-hero h1 { font-size: 1.6rem; }
                    .pp-hero-stats { gap: 1rem; }
                    .pp-grid { grid-template-columns: 1fr; }
                    .pp-banners { grid-template-columns: 1fr; }
                    .pp-welcome { flex-direction: column; text-align: center; }
                }
            `}</style>

            <div className="pp-root">
                {/* Hero */}
                <div className="pp-hero">
                    <div className="pp-hero-bg" />
                    <div className="pp-hero-circle" style={{ width: 200, height: 200, right: -60, top: -60 }} />
                    <div className="pp-hero-circle" style={{ width: 140, height: 140, left: -40, bottom: -40 }} />
                    <h1>🎁 Ưu đãi & Khuyến mãi</h1>
                    <p>Săn ngay mã giảm giá độc quyền cho chuyến đi của bạn</p>
                    {!loading && !error && (
                        <div className="pp-hero-stats">
                            <div className="pp-hero-stat">
                                <span className="pp-hero-stat-value">{promotions.length}</span>
                                <span className="pp-hero-stat-label">Mã đang có</span>
                            </div>
                            <div className="pp-hero-stat">
                                <span className="pp-hero-stat-value">
                                    {promotions.filter((p) => p.status === "active").length}
                                </span>
                                <span className="pp-hero-stat-label">Còn hiệu lực</span>
                            </div>
                            <div className="pp-hero-stat">
                                <span className="pp-hero-stat-value">
                                    {Math.max(...promotions.map((p) => p.discount_percent), 0)}%
                                </span>
                                <span className="pp-hero-stat-label">Giảm cao nhất</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky Tabs */}
                <div className="pp-tabs-wrap" ref={tabsRef}>
                    <div className="pp-tabs">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.key}
                                className={`pp-tab${activeCategory === cat.key ? " active" : ""}`}
                                onClick={() => handleTabClick(cat.key)}
                            >
                                {cat.icon} {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Banners */}
                {banners.length > 0 && (
                    <div className="pp-banners">
                        {banners.map(b => (
                            b.link_url ? (
                                <a key={b.banner_id} href={b.link_url} target="_blank" rel="noopener noreferrer">
                                    <Image src={b.image_url} alt={b.title ?? ""} className="pp-banner-img" width={1100} height={580} style={{ width: "100%", height: "auto" }} />
                                </a>
                            ) : (
                                <Image key={b.banner_id} src={b.image_url} alt={b.title ?? ""} className="pp-banner-img" width={1100} height={580} style={{ width: "100%", height: "auto" }} />
                            )
                        ))}
                    </div>
                )}

                {/* WELCOME30 highlight */}
                <div className="pp-welcome-wrap">
                    <div className="pp-welcome">
                        <div className="pp-welcome-badge">WELCOME30</div>
                        <div className="pp-welcome-info">
                            <p className="pp-welcome-title">🎉 Ưu đãi đặc biệt dành cho thành viên mới!</p>
                            <p className="pp-welcome-desc">Giảm ngay 30% đơn hàng đầu tiên — áp dụng tất cả dịch vụ</p>
                        </div>
                        <button
                            className={`pp-welcome-copy${copiedWelcome ? " copied" : ""}`}
                            onClick={() => {
                                navigator.clipboard.writeText("WELCOME30");
                                setCopiedWelcome(true);
                                setTimeout(() => setCopiedWelcome(false), 2000);
                            }}
                        >
                            {copiedWelcome ? "✓ Đã sao chép!" : "Sao chép mã"}
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="pp-loading">
                        <div className="pp-spinner" />
                        <span>Đang tải ưu đãi...</span>
                    </div>
                ) : error ? (
                    <div className="pp-error">⚠ {error}</div>
                ) : (
                    <div className="pp-content">
                        {CATEGORIES.map((cat) => (
                            <div
                                key={cat.key}
                                className="pp-section"
                                data-category={cat.key}
                                ref={(el) => { sectionRefs.current[cat.key] = el; }}
                            >
                                <div className="pp-section-header">
                                    <div className="pp-section-icon">{cat.icon}</div>
                                    <span className="pp-section-title">{cat.label}</span>
                                    <span className="pp-section-count">
                                        {(grouped[cat.key] || []).length} ưu đãi
                                    </span>
                                </div>
                                <PromotionList promotions={grouped[cat.key] || []} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}