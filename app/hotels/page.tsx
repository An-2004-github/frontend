"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import HotelList from "@/components/hotel/HotelList";
import { Hotel } from "@/types/hotel";
import { hotelService } from "@/services/hotelService";
import { destinationService, Destination } from "@/services/detinationService";
import { promotionService } from "@/services/promotionService";
import { Promotion } from "@/types/promotion";

const PRICE_OPTIONS = [
    { label: "Tất cả", min: undefined, max: undefined },
    { label: "Dưới 1 triệu", min: undefined, max: 1_000_000 },
    { label: "1 – 3 triệu", min: 1_000_000, max: 3_000_000 },
    { label: "Trên 3 triệu", min: 3_000_000, max: undefined },
];

const RATING_OPTIONS = [
    { label: "Tất cả", min: 0 },
    { label: "4.5+  ⭐ Xuất sắc", min: 4.5 },
    { label: "4.0+  ⭐ Rất tốt", min: 4.0 },
    { label: "3.5+  ⭐ Tốt", min: 3.5 },
];

const SORT_OPTIONS = [
    { label: "Đánh giá cao nhất", value: "rating" },
    { label: "Giá thấp nhất", value: "price_asc" },
    { label: "Giá cao nhất", value: "price_desc" },
];

const DEST_EMOJIS = ["🏖️", "🌆", "🏔️", "🌴", "🏯", "🌊"];

export default function HotelsPage() {
    // Data
    const [topHotels, setTopHotels] = useState<Hotel[]>([]);
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [promos, setPromos] = useState<Promotion[]>([]);

    // Loading states
    const [loadingTop, setLoadingTop] = useState(true);
    const [loadingHotels, setLoadingHotels] = useState(false);
    const [loadingDest, setLoadingDest] = useState(true);

    // Filter state
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [priceIdx, setPriceIdx] = useState(0);
    const [ratingIdx, setRatingIdx] = useState(0);
    const [sortVal, setSortVal] = useState("rating");
    const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
    const [showFilter, setShowFilter] = useState(false);
    const [destTab, setDestTab] = useState<"domestic" | "international">("domestic");

    const listRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();

    // ── Init from URL parameters ──────────────────────────────────
    useEffect(() => {
        const qSearch = searchParams?.get("search");
        const qDestId = searchParams?.get("destination_id");

        if (qSearch) {
            setSearchInput(qSearch);
            setSearch(qSearch);
        }
        if (qDestId) {
            setSelectedDest({ 
                destination_id: Number(qDestId), 
                name: qSearch || "", 
                city: qSearch || "" 
            } as Destination);
        }
    }, [searchParams]);

    // ── Fetch top rated on mount ──────────────────────────────────
    useEffect(() => {
        hotelService.getHotels({ sort: "rating", limit: 6 })
            .then(setTopHotels).finally(() => setLoadingTop(false));

        promotionService.getPromotions("hotel")
            .then(setPromos).catch(() => { });
    }, []);

    // ── Fetch destinations when tab changes ──────────────────────
    useEffect(() => {
        setLoadingDest(true);
        setSelectedDest(null);
        destinationService.getDestinations({
            limit: 6,
            country: destTab === "domestic" ? "Vietnam" : undefined,
        })
            .then((data) => {
                if (destTab === "international") {
                    setDestinations(data.filter(d => d.country !== "Vietnam"));
                } else {
                    setDestinations(data);
                }
            })
            .finally(() => setLoadingDest(false));
    }, [destTab]);

    // ── Fetch filtered hotels ─────────────────────────────────────
    const fetchHotels = useCallback(async () => {
        setLoadingHotels(true);
        try {
            const price = PRICE_OPTIONS[priceIdx];
            const data = await hotelService.getHotels({
                search: search || undefined,
                destination_id: selectedDest?.destination_id,
                min_price: price.min,
                max_price: price.max,
                sort: sortVal as "rating" | "price_asc" | "price_desc",
            });
            const minRating = RATING_OPTIONS[ratingIdx].min;
            setHotels(minRating > 0 ? data.filter(h => (h.avg_rating ?? 0) >= minRating) : data);
        } finally {
            setLoadingHotels(false);
        }
    }, [search, priceIdx, ratingIdx, sortVal, selectedDest]);

    // Trigger fetch when filter changes
    const hasFilter = !!(search || priceIdx || ratingIdx || selectedDest);
    useEffect(() => {
        if (hasFilter) {
            fetchHotels();
            setShowFilter(true);
            setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        } else {
            setShowFilter(false);
            setHotels([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, priceIdx, ratingIdx, sortVal, selectedDest]);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const handleDestClick = (dest: Destination) => {
        if (selectedDest?.destination_id === dest.destination_id) {
            setSelectedDest(null);
        } else {
            setSelectedDest(dest);
        }
    };

    const handleReset = () => {
        setSearchInput(""); setSearch("");
        setPriceIdx(0); setRatingIdx(0);
        setSortVal("rating"); setSelectedDest(null);
        setShowFilter(false);
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
                * { box-sizing: border-box; }

                .hp-root {
                    min-height: 100vh;
                    background: #f0f4ff;
                    font-family: 'DM Sans', sans-serif;
                }

                /* ── HERO ── */
                .hp-hero {
                    background: linear-gradient(135deg, #003580 0%, #0052cc 55%, #0065ff 100%);
                    padding: 3rem 1.5rem 5rem;
                    position: relative; overflow: hidden; text-align: center;
                }
                .hp-hero-bg {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
                    background-size: 24px 24px;
                }
                .hp-hero-circle {
                    position: absolute; border-radius: 50%;
                    background: rgba(255,255,255,0.05);
                }
                .hp-hero h1 {
                    font-family: 'Nunito', sans-serif;
                    font-size: 2.2rem; font-weight: 800; color: #fff;
                    margin: 0 0 0.4rem; position: relative;
                }
                .hp-hero p {
                    color: rgba(255,255,255,0.7); font-weight: 300;
                    font-size: 1rem; position: relative; margin-bottom: 2rem;
                }

                /* ── SEARCH BOX ── */
                .hp-search-box {
                    position: relative; z-index: 10;
                    max-width: 860px; margin: 0 auto;
                    background: #fff; border-radius: 16px;
                    padding: 1.25rem 1.5rem;
                    box-shadow: 0 8px 40px rgba(0,0,0,0.18);
                    display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;
                }
                .hp-search-field {
                    display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 160px;
                }
                .hp-search-label {
                    font-size: 0.72rem; font-weight: 600; color: #6b778c;
                    text-transform: uppercase; letter-spacing: 0.4px;
                }
                .hp-search-input {
                    border: 1.5px solid #dde3f0; border-radius: 10px;
                    padding: 0.7rem 1rem; font-size: 0.92rem;
                    font-family: 'DM Sans', sans-serif; color: #1a3c6b;
                    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
                }
                .hp-search-input:focus {
                    border-color: #0052cc;
                    box-shadow: 0 0 0 3px rgba(0,82,204,0.1);
                }
                .hp-search-input::placeholder { color: #b0bcd8; font-weight: 300; }
                .hp-search-btn {
                    padding: 0.75rem 1.75rem;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; border: none; border-radius: 10px;
                    font-family: 'Nunito', sans-serif; font-size: 0.95rem; font-weight: 700;
                    cursor: pointer; white-space: nowrap;
                    transition: opacity 0.15s, transform 0.15s;
                }
                .hp-search-btn:hover { opacity: 0.9; transform: translateY(-1px); }

                /* ── CONTENT ── */
                .hp-content {
                    max-width: 1200px; margin: -2.5rem auto 0;
                    padding: 0 1.5rem 4rem; position: relative; z-index: 5;
                }

                /* ── SECTION HEADER ── */
                .hp-section-header {
                    display: flex; align-items: center; justify-content: space-between;
                    margin-bottom: 1.25rem; margin-top: 2.5rem;
                }
                .hp-section-title {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1.2rem; font-weight: 800; color: #1a3c6b;
                    display: flex; align-items: center; gap: 0.5rem;
                }
                .hp-section-link {
                    font-size: 0.85rem; color: #0052cc; font-weight: 500;
                    text-decoration: none;
                }
                .hp-section-link:hover { text-decoration: underline; }

                /* ── PROMO STRIP ── */
                .hp-promo-strip {
                    display: flex; gap: 1rem; overflow-x: auto;
                    padding-bottom: 0.5rem; scrollbar-width: none;
                }
                .hp-promo-strip::-webkit-scrollbar { display: none; }

                .hp-promo-card {
                    background: #fff;
                    border: 1px solid #e8f0fe; border-radius: 12px;
                    padding: 0.9rem 1.1rem;
                    display: flex; align-items: center; gap: 0.75rem;
                    min-width: 220px; flex-shrink: 0;
                    cursor: pointer;
                    transition: transform 0.15s, box-shadow 0.15s;
                }
                .hp-promo-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0,82,204,0.1);
                }
                .hp-promo-card-icon {
                    width: 40px; height: 40px; border-radius: 10px;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.1rem; flex-shrink: 0;
                }
                .hp-promo-card-info { min-width: 0; }
                .hp-promo-card-discount {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1rem; font-weight: 800; color: #0052cc;
                }
                .hp-promo-card-code {
                    font-family: 'Courier New', monospace;
                    font-size: 0.8rem; color: #6b8cbf; letter-spacing: 1px;
                    margin-top: 0.1rem;
                }

                /* ── DESTINATIONS ── */
                .hp-dest-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                    gap: 1rem;
                }
                .hp-dest-card {
                    background: #fff; border-radius: 14px;
                    border: 2px solid transparent;
                    overflow: hidden; cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
                }
                .hp-dest-card:hover, .hp-dest-card.active {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 24px rgba(0,82,204,0.14);
                    border-color: #0052cc;
                }
                .hp-dest-card-img {
                    height: 100px;
                    background: linear-gradient(135deg, #003580, #0052cc);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 2.5rem; position: relative; overflow: hidden;
                }
                .hp-dest-card-img img {
                    width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;
                }
                .hp-dest-card-body { padding: 0.75rem; }
                .hp-dest-card-name {
                    font-family: 'Nunito', sans-serif;
                    font-size: 0.9rem; font-weight: 700; color: #1a3c6b;
                }
                .hp-dest-card-count {
                    font-size: 0.75rem; color: #6b8cbf; margin-top: 0.15rem;
                }

                /* ── FILTER + LIST layout ── */
                .hp-filter-layout {
                    display: flex; gap: 1.5rem; align-items: flex-start;
                }

                /* ── SIDEBAR ── */
                .hp-sidebar {
                    width: 240px; flex-shrink: 0;
                    background: #fff; border-radius: 14px;
                    border: 1px solid #e8f0fe; padding: 1.25rem;
                    position: sticky; top: 72px;
                }
                .hp-sidebar h3 {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1rem; font-weight: 700; color: #1a3c6b;
                    margin: 0 0 1.1rem; padding-bottom: 0.75rem;
                    border-bottom: 2px solid #e8f0fe;
                }
                .hp-filter-group { margin-bottom: 1.1rem; }
                .hp-filter-group-label {
                    font-size: 0.75rem; font-weight: 600; color: #6b778c;
                    text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 0.5rem;
                }
                .hp-filter-option {
                    display: flex; align-items: center; gap: 0.5rem;
                    padding: 0.45rem 0.6rem; border-radius: 8px;
                    font-size: 0.85rem; color: #3a5f9a; cursor: pointer;
                    border: 1.5px solid transparent;
                    transition: background 0.15s, border-color 0.15s;
                    margin-bottom: 0.3rem;
                }
                .hp-filter-option:hover { background: #f0f4ff; }
                .hp-filter-option.active {
                    background: #e8f0fe; border-color: rgba(0,82,204,0.3);
                    color: #0052cc; font-weight: 500;
                }
                .hp-filter-dot {
                    width: 8px; height: 8px; border-radius: 50%;
                    border: 2px solid #0052cc; flex-shrink: 0;
                }
                .hp-filter-option.active .hp-filter-dot { background: #0052cc; }

                .hp-dest-toggle {
                    display: flex; gap: 0.3rem;
                    background: #e8f0fe; border-radius: 8px; padding: 3px;
                }
                .hp-dest-toggle-btn {
                    padding: 0.3rem 0.9rem;
                    border: none; border-radius: 6px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem; font-weight: 500;
                    cursor: pointer; transition: background 0.15s, color 0.15s;
                    background: transparent; color: #6b8cbf;
                }
                .hp-dest-toggle-btn.active {
                    background: #0052cc; color: #fff;
                    box-shadow: 0 2px 6px rgba(0,82,204,0.25);
                }
                    width: 100%; padding: 0.6rem 0.75rem;
                    border: 1.5px solid #dde3f0; border-radius: 8px;
                    font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #1a3c6b;
                    background: #fff; outline: none;
                    transition: border-color 0.2s;
                }
                .hp-sort-select:focus { border-color: #0052cc; }

                .hp-reset-btn {
                    width: 100%; padding: 0.6rem;
                    background: #f0f4ff; color: #0052cc;
                    border: 1.5px solid #c8d8ff; border-radius: 8px;
                    font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500;
                    cursor: pointer; transition: background 0.15s; margin-top: 0.5rem;
                }
                .hp-reset-btn:hover { background: #dde9ff; }

                /* ── MAIN ── */
                .hp-main { flex: 1; min-width: 0; }
                .hp-result-meta {
                    font-size: 0.88rem; color: #6b8cbf; margin-bottom: 1rem;
                }
                .hp-result-meta strong { color: #1a3c6b; }

                /* ── HOTEL CARD ── */
                .hcard {
                    background: #fff; border-radius: 14px;
                    border: 1px solid #e8f0fe; overflow: hidden;
                    transition: transform 0.2s, box-shadow 0.2s;
                    display: flex; flex-direction: column;
                }
                .hcard:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 32px rgba(0,82,204,0.12);
                }
                .hcard-img {
                    height: 170px; position: relative; overflow: hidden;
                    background: linear-gradient(135deg, #003580, #0052cc);
                    flex-shrink: 0;
                }
                .hcard-img-pattern {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px);
                    background-size: 18px 18px;
                }
                .hcard-img-real {
                    width: 100%; height: 100%; object-fit: cover;
                }
                .hcard-img-icon {
                    position: absolute; inset: 0; display: flex;
                    align-items: center; justify-content: center; font-size: 3rem; opacity: 0.5;
                }
                .hcard-star-badge {
                    position: absolute; top: 10px; right: 10px;
                    background: rgba(255,184,0,0.9); color: #1a1208;
                    font-size: 0.7rem; font-weight: 600;
                    padding: 0.2rem 0.55rem; border-radius: 99px;
                }
                .hcard-body {
                    padding: 1rem 1.1rem 1.1rem;
                    display: flex; flex-direction: column; flex: 1;
                }
                .hcard-stars { display: flex; gap: 2px; margin-bottom: 0.4rem; }
                .hcard-name {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1rem; font-weight: 700; color: #1a3c6b;
                    margin-bottom: 0.3rem; line-height: 1.3;
                    display: -webkit-box; -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical; overflow: hidden;
                }
                .hcard-location {
                    display: flex; align-items: flex-start; gap: 0.3rem;
                    font-size: 0.78rem; color: #6b8cbf; font-weight: 300;
                    margin-bottom: 0.6rem; flex: 1;
                }
                .hcard-rating {
                    display: flex; align-items: center; gap: 0.4rem;
                    margin-bottom: 0.75rem;
                }
                .hcard-rating-badge {
                    background: #0052cc; color: #fff;
                    font-size: 0.78rem; font-weight: 700;
                    padding: 0.2rem 0.5rem; border-radius: 6px;
                }
                .hcard-rating-label { font-size: 0.8rem; font-weight: 500; color: #1a3c6b; }
                .hcard-rating-count { font-size: 0.75rem; color: #6b8cbf; }
                .hcard-footer {
                    display: flex; align-items: center; justify-content: space-between;
                    border-top: 1px solid #eef2fb; padding-top: 0.75rem; margin-top: auto;
                }
                .hcard-price { display: flex; align-items: baseline; gap: 0.25rem; }
                .hcard-price-from { font-size: 0.72rem; color: #6b8cbf; }
                .hcard-price-value {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1.05rem; font-weight: 800; color: #0052cc;
                }
                .hcard-price-night { font-size: 0.72rem; color: #6b8cbf; }
                .hcard-price-contact { font-size: 0.8rem; color: #6b8cbf; }
                .hcard-btn {
                    padding: 0.45rem 1rem;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; border-radius: 8px;
                    font-size: 0.8rem; font-weight: 600; text-decoration: none;
                    font-family: 'DM Sans', sans-serif;
                    transition: opacity 0.15s;
                }
                .hcard-btn:hover { opacity: 0.88; }

                /* ── HOTEL GRID ── */
                .h-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                    gap: 1.25rem;
                }
                .h-empty {
                    text-align: center; padding: 3.5rem;
                    background: #fff; border-radius: 14px;
                    border: 1px dashed #c8d8ff; color: #6b8cbf;
                }

                /* ── LOADING ── */
                .hp-loading {
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    padding: 4rem; gap: 1rem; color: #6b8cbf;
                }
                .hp-spinner {
                    width: 34px; height: 34px;
                    border: 3px solid #e8f0fe; border-top-color: #0052cc;
                    border-radius: 50%; animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                @media (max-width: 768px) {
                    .hp-search-box { flex-direction: column; }
                    .hp-filter-layout { flex-direction: column; }
                    .hp-sidebar { width: 100%; position: static; }
                    .hp-dest-grid { grid-template-columns: repeat(3, 1fr); }
                    .hp-hero h1 { font-size: 1.6rem; }
                }
            `}</style>

            <div className="hp-root">
                {/* ── HERO ── */}
                <div className="hp-hero">
                    <div className="hp-hero-bg" />
                    <div className="hp-hero-circle" style={{ width: 220, height: 220, right: -60, top: -60 }} />
                    <div className="hp-hero-circle" style={{ width: 140, height: 140, left: -40, bottom: -40 }} />
                    <h1>🏨 Tìm khách sạn lý tưởng</h1>
                    <p>Hàng trăm lựa chọn khách sạn trên toàn Việt Nam với giá tốt nhất</p>

                    {/* Search Box */}
                    <div className="hp-search-box">
                        <div className="hp-search-field" style={{ flex: 2 }}>
                            <label className="hp-search-label">🔍 Tìm kiếm</label>
                            <input
                                className="hp-search-input"
                                placeholder="Nhập tên khách sạn hoặc địa điểm..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                        </div>
                        <div className="hp-search-field">
                            <label className="hp-search-label">📅 Nhận phòng</label>
                            <input className="hp-search-input" type="date" />
                        </div>
                        <div className="hp-search-field">
                            <label className="hp-search-label">📅 Trả phòng</label>
                            <input className="hp-search-input" type="date" />
                        </div>
                        <div className="hp-search-field" style={{ minWidth: 100 }}>
                            <label className="hp-search-label">👤 Khách</label>
                            <input className="hp-search-input" type="number" defaultValue={2} min={1} max={10} />
                        </div>
                        <button className="hp-search-btn">Tìm ngay</button>
                    </div>
                </div>

                {/* ── CONTENT ── */}
                <div className="hp-content">

                    {/* ── PROMO STRIP ── */}
                    {promos.length > 0 && (
                        <>
                            <div className="hp-section-header">
                                <div className="hp-section-title">🎁 Ưu đãi dành cho khách sạn</div>
                                <Link href="/promotions" className="hp-section-link">Xem tất cả →</Link>
                            </div>
                            <div className="hp-promo-strip">
                                {promos.slice(0, 6).map((p) => (
                                    <div key={p.promo_id} className="hp-promo-card">
                                        <div className="hp-promo-card-icon">🏷️</div>
                                        <div className="hp-promo-card-info">
                                            <div className="hp-promo-card-discount">
                                                Giảm {p.discount_percent}% · Tối đa {(p.max_discount / 1000).toFixed(0)}K
                                            </div>
                                            <div className="hp-promo-card-code">{p.code}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── POPULAR DESTINATIONS ── */}
                    <div className="hp-section-header">
                        <div className="hp-section-title">📍 Điểm đến phổ biến</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            {/* Toggle Trong nước / Quốc tế */}
                            <div className="hp-dest-toggle">
                                <button
                                    className={`hp-dest-toggle-btn${destTab === "domestic" ? " active" : ""}`}
                                    onClick={() => { setDestTab("domestic"); setSelectedDest(null); }}
                                >
                                    Trong nước
                                </button>
                                <button
                                    className={`hp-dest-toggle-btn${destTab === "international" ? " active" : ""}`}
                                    onClick={() => { setDestTab("international"); setSelectedDest(null); }}
                                >
                                    Quốc tế
                                </button>
                            </div>
                            {selectedDest && (
                                <button
                                    onClick={() => setSelectedDest(null)}
                                    style={{ fontSize: "0.82rem", color: "#0052cc", background: "none", border: "none", cursor: "pointer" }}
                                >
                                    ✕ Bỏ chọn {selectedDest.name}
                                </button>
                            )}
                        </div>
                    </div>
                    {loadingDest ? (
                        <div className="hp-loading"><div className="hp-spinner" /></div>
                    ) : (
                        <div className="hp-dest-grid">
                            {destinations.map((dest, i) => (
                                <div
                                    key={dest.destination_id}
                                    className={`hp-dest-card${selectedDest?.destination_id === dest.destination_id ? " active" : ""}`}
                                    onClick={() => handleDestClick(dest)}
                                >
                                    <div className="hp-dest-card-img">
                                        {dest.image_url
                                            ? <Image src={dest.image_url} alt={dest.name} fill style={{ objectFit: "cover" }} />
                                            : DEST_EMOJIS[i % DEST_EMOJIS.length]
                                        }
                                    </div>
                                    <div className="hp-dest-card-body">
                                        <div className="hp-dest-card-name">{dest.city || dest.name}</div>
                                        <div className="hp-dest-card-count">{dest.hotel_count} khách sạn</div>
                                    </div>
                                </div>
                            ))}
                            {destinations.length === 0 && (
                                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "2rem", color: "#6b8cbf" }}>
                                    Chưa có điểm đến {destTab === "international" ? "quốc tế" : "trong nước"} nào.
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TOP RATED (khi chưa filter) ── */}
                    {!showFilter && (
                        <>
                            <div className="hp-section-header">
                                <div className="hp-section-title">⭐ Khách sạn được đánh giá cao nhất</div>
                                <Link href="#all" className="hp-section-link">Xem tất cả →</Link>
                            </div>
                            {loadingTop ? (
                                <div className="hp-loading">
                                    <div className="hp-spinner" />
                                    <span>Đang tải...</span>
                                </div>
                            ) : (
                                <HotelList hotels={topHotels} />
                            )}
                        </>
                    )}

                    {/* ── FILTER + RESULTS ── */}
                    {showFilter && (
                        <div ref={listRef} style={{ marginTop: "2rem" }}>
                            <div className="hp-section-header">
                                <div className="hp-section-title">
                                    🔍 Kết quả tìm kiếm
                                    {selectedDest && <span style={{ color: "#0052cc" }}> · {selectedDest.city || selectedDest.name}</span>}
                                </div>
                            </div>

                            <div className="hp-filter-layout">
                                {/* Sidebar */}
                                <aside className="hp-sidebar">
                                    <h3>Bộ lọc</h3>

                                    {/* Price */}
                                    <div className="hp-filter-group">
                                        <div className="hp-filter-group-label">Mức giá / đêm</div>
                                        {PRICE_OPTIONS.map((opt, i) => (
                                            <div
                                                key={i}
                                                className={`hp-filter-option${priceIdx === i ? " active" : ""}`}
                                                onClick={() => setPriceIdx(i)}
                                            >
                                                <div className="hp-filter-dot" />
                                                {opt.label}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Rating */}
                                    <div className="hp-filter-group">
                                        <div className="hp-filter-group-label">Đánh giá</div>
                                        {RATING_OPTIONS.map((opt, i) => (
                                            <div
                                                key={i}
                                                className={`hp-filter-option${ratingIdx === i ? " active" : ""}`}
                                                onClick={() => setRatingIdx(i)}
                                            >
                                                <div className="hp-filter-dot" />
                                                {opt.label}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Sort */}
                                    <div className="hp-filter-group">
                                        <div className="hp-filter-group-label">Sắp xếp theo</div>
                                        <select
                                            className="hp-sort-select"
                                            value={sortVal}
                                            onChange={(e) => setSortVal(e.target.value)}
                                        >
                                            {SORT_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <button className="hp-reset-btn" onClick={handleReset}>
                                        ↺ Xóa bộ lọc
                                    </button>
                                </aside>

                                {/* Results */}
                                <div className="hp-main">
                                    {!loadingHotels && (
                                        <div className="hp-result-meta">
                                            Tìm thấy <strong>{hotels.length}</strong> khách sạn
                                            {search && <> cho &ldquo;<strong>{search}</strong>&rdquo;</>}
                                        </div>
                                    )}
                                    {loadingHotels ? (
                                        <div className="hp-loading">
                                            <div className="hp-spinner" />
                                            <span>Đang tìm kiếm...</span>
                                        </div>
                                    ) : (
                                        <HotelList hotels={hotels} />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}