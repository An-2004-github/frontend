"use client";

import "@/styles/trains.css";
import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Train } from "@/types/train";
import { trainService } from "@/services/trainService";
import TrainCard from "@/components/train/TrainCard";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import DestinationInput from "@/components/ui/DestinationInput";
import { promotionService } from "@/services/promotionService";
import { Promotion } from "@/types/promotion";
import api from "@/lib/axios";
import { logSearch } from "@/lib/logInteraction";
import { hotelService } from "@/services/hotelService";
import { Hotel } from "@/types/hotel";

interface Destination {
    destination_id: number;
    city: string;
    hotel_count: number;
    image_url: string | null;
}

const SORT_OPTIONS = [
    { label: "Giờ khởi hành sớm nhất", value: "depart_asc" },
    { label: "Giá thấp nhất", value: "price_asc" },
    { label: "Giá cao nhất", value: "price_desc" },
    { label: "Thời gian ngắn nhất", value: "duration" },
];

const PRICE_OPTIONS = [
    { label: "Tất cả", min: undefined, max: undefined },
    { label: "Dưới 200k", min: undefined, max: 200_000 },
    { label: "200k – 500k", min: 200_000, max: 500_000 },
    { label: "500k – 1 triệu", min: 500_000, max: 1_000_000 },
    { label: "Trên 1 triệu", min: 1_000_000, max: undefined },
];

const SEAT_CLASS_OPTIONS = [
    { label: "Tất cả hạng ghế", value: "" },
    { label: "💺 Ngồi cứng", value: "hard_seat" },
    { label: "🪑 Ngồi mềm", value: "soft_seat" },
    { label: "🛏 Nằm cứng", value: "hard_sleeper" },
    { label: "🛌 Nằm mềm", value: "soft_sleeper" },
];

const POPULAR_ROUTES = [
    { from: "Hà Nội", to: "Hồ Chí Minh" },
    { from: "Hà Nội", to: "Đà Nẵng" },
    { from: "Hà Nội", to: "Huế" },
    { from: "Hồ Chí Minh", to: "Nha Trang" },
    { from: "Hà Nội", to: "Hải Phòng" },
];

const TODAY = new Date().toISOString().split("T")[0];

export default function TrainsPage() {
    const searchParams = useSearchParams();

    const [fromCity, setFromCity] = useState(searchParams.get("from") || "");
    const [toCity, setToCity] = useState(searchParams.get("to") || "");
    const [departDate, setDepartDate] = useState(searchParams.get("date") || TODAY);
    const [passengers, setPassengers] = useState(1);

    const [destinationCities, setDestinationCities] = useState<string[]>([]);
    const isFirstFromCity = useRef(true);

    const [seatClassFilter, setSeatClassFilter] = useState("");
    const [priceIdx, setPriceIdx] = useState(0);
    const [sortVal, setSortVal] = useState("depart_asc");

    const router = useRouter();
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [activeDestTab, setActiveDestTab] = useState<Destination | null>(null);
    const [featuredHotels, setFeaturedHotels] = useState<Hotel[]>([]);
    const [loadingHotels, setLoadingHotels] = useState(false);

    const [trains, setTrains] = useState<Train[]>([]);
    const [promos, setPromos] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get("/api/destinations?country=Vietnam&limit=5")
            .then(r => setDestinations(r.data)).catch(() => { });
        Promise.all([promotionService.getPromotions("train"), promotionService.getPromotions("all")])
            .then(([specific, all]) => {
                const seen = new Set<number>();
                const merged = [...specific, ...all].filter(p => {
                    if (seen.has(p.promo_id) || p.status !== "active") return false;
                    seen.add(p.promo_id); return true;
                });
                setPromos(merged.slice(0, 6));
            }).catch(() => { });
    }, []);

    useEffect(() => {
        if (destinations.length > 0 && !activeDestTab) setActiveDestTab(destinations[0]);
    }, [destinations, activeDestTab]);

    useEffect(() => {
        if (!activeDestTab) return;
        setLoadingHotels(true);
        hotelService.getHotels({ destination_id: activeDestTab.destination_id, sort: "rating", limit: 4 })
            .then(setFeaturedHotels).catch(() => setFeaturedHotels([]))
            .finally(() => setLoadingHotels(false));
    }, [activeDestTab]);

    const isSwapping = useRef(false);
    useEffect(() => {
        if (!fromCity.trim()) { setDestinationCities([]); return; }
        trainService.getDestinationCities(fromCity)
            .then(cities => { setDestinationCities(cities); isSwapping.current = false; })
            .catch(() => { setDestinationCities([]); isSwapping.current = false; });
        if (isFirstFromCity.current) { isFirstFromCity.current = false; return; }
        if (!isSwapping.current) setToCity("");
    }, [fromCity]);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const searchAbortRef = useRef<AbortController | null>(null);

    const handleSearch = useCallback(async () => {
        const errs: Record<string, string> = {};
        if (!fromCity.trim()) errs.fromCity = "Vui lòng nhập điểm khởi hành";
        if (!toCity.trim())   errs.toCity   = "Vui lòng nhập điểm đến";
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setErrors({});
        logSearch(`${fromCity.trim()} → ${toCity.trim()}`);
        searchAbortRef.current?.abort();
        const controller = new AbortController();
        searchAbortRef.current = controller;
        try {
            setLoading(true); setSearched(true); setError(null);
            const price = PRICE_OPTIONS[priceIdx];
            const data = await trainService.searchTrains({
                from_city: fromCity,
                to_city: toCity,
                depart_date: departDate,
                seat_class: seatClassFilter as "hard_seat" | "soft_seat" | "hard_sleeper" | "soft_sleeper" | undefined || undefined,
                min_price: price.min,
                max_price: price.max,
                sort: sortVal as "price_asc" | "price_desc" | "depart_asc" | "duration",
            }, controller.signal);
            setTrains(data);
        } catch (err) {
            if ((err as { name?: string })?.name === "CanceledError" || (err as { name?: string })?.name === "AbortError") return;
            setError("Không thể tải dữ liệu. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, [fromCity, toCity, departDate, seatClassFilter, priceIdx, sortVal]);

    useEffect(() => {
        if (searched) handleSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seatClassFilter, priceIdx, sortVal]);

    const handleSwap = () => { isSwapping.current = true; setFromCity(toCity); setToCity(fromCity); };

    return (
        <>

            <div className="tp-root">
                {/* HERO */}
                <div className="tp-hero">
                    <div className="tp-hero-bg" />
                    <h1>🚆 Tìm vé tàu hỏa</h1>
                    <p>Đặt vé tàu nhanh chóng, nhiều hạng ghế lựa chọn</p>

                    <div className="tp-search-box">
                        <div className="tp-search-row">
                            <div className="tp-search-field" style={{ flex: 2 }}>
                                <label className="tp-search-label">🚉 Điểm khởi hành</label>
                                <DestinationInput
                                    value={fromCity}
                                    onChange={v => { setFromCity(v); if (v.trim()) setErrors(p => ({ ...p, fromCity: "" })); }}
                                    placeholder="Hà Nội, Huế..."
                                    cityMode
                                    inputStyle={errors.fromCity ? { borderColor: "#e74c3c", boxShadow: "0 0 0 3px rgba(231,76,60,0.12)" } : {}}
                                />
                                {errors.fromCity && <span style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, fontSize: "0.7rem", color: "#fff", background: "#e74c3c", borderRadius: "6px", padding: "0.2rem 0.55rem", display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap", zIndex: 10, boxShadow: "0 2px 8px rgba(231,76,60,0.3)" }}>⚠ {errors.fromCity}</span>}
                            </div>

                            <button className="tp-swap-btn" onClick={handleSwap} title="Đổi chiều">⇄</button>

                            <div className="tp-search-field" style={{ flex: 2 }}>
                                <label className="tp-search-label">🏁 Điểm đến</label>
                                <DestinationInput
                                    value={toCity}
                                    onChange={v => { setToCity(v); if (v.trim()) setErrors(p => ({ ...p, toCity: "" })); }}
                                    placeholder={fromCity ? "Chọn điểm đến..." : "Đà Nẵng, Nha Trang..."}
                                    cityMode
                                    cities={destinationCities.length > 0 ? destinationCities : undefined}
                                    inputStyle={errors.toCity ? { borderColor: "#e74c3c", boxShadow: "0 0 0 3px rgba(231,76,60,0.12)" } : {}}
                                />
                                {errors.toCity && <span style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, fontSize: "0.7rem", color: "#fff", background: "#e74c3c", borderRadius: "6px", padding: "0.2rem 0.55rem", display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap", zIndex: 10, boxShadow: "0 2px 8px rgba(231,76,60,0.3)" }}>⚠ {errors.toCity}</span>}
                            </div>

                            <div className="tp-search-field">
                                <label className="tp-search-label">📅 Ngày đi</label>
                                <input
                                    className="tp-search-input"
                                    type="date"
                                    value={departDate}
                                    min={TODAY}
                                    onChange={(e) => setDepartDate(e.target.value)}
                                />
                            </div>

                            <div className="tp-search-field" style={{ minWidth: 90 }}>
                                <label className="tp-search-label">👤 Hành khách</label>
                                <input
                                    className="tp-search-input"
                                    type="number" min={1} max={9}
                                    value={passengers}
                                    onChange={(e) => setPassengers(Number(e.target.value))}
                                />
                            </div>

                            <button
                                className="tp-search-btn"
                                onClick={handleSearch}
                            >
                                Tìm chuyến
                            </button>
                        </div>

                        <div className="tp-popular">
                            <span className="tp-popular-label">Phổ biến:</span>
                            {POPULAR_ROUTES.map((r, i) => (
                                <div
                                    key={i}
                                    className="tp-popular-chip"
                                    onClick={() => { setFromCity(r.from); setToCity(r.to); }}
                                >
                                    {r.from} → {r.to}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="tp-content">
                    {promos.length > 0 && (
                        <>
                            <div className="tp-section-header">
                                <div className="tp-section-title">🎁 Ưu đãi vé tàu hỏa</div>
                                <Link href="/promotion" className="tp-section-link">Xem tất cả →</Link>
                            </div>
                            <div className="tp-promo-strip">
                                {promos.map((p) => (
                                    <div key={p.promo_id} className="tp-promo-card">
                                        <div className="tp-promo-card-icon">🚆</div>
                                        <div className="tp-promo-card-info">
                                            <div className="tp-promo-card-discount">
                                                {p.discount_type === "percent"
                                                    ? `Giảm ${p.discount_percent}% · Tối đa ${(p.max_discount / 1000).toFixed(0)}K`
                                                    : `Giảm ${(p.max_discount / 1000).toFixed(0)}K`}
                                            </div>
                                            <div className="tp-promo-card-code">{p.code}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    {!searched && destinations.length > 0 && (
                        <>
                            <div className="tp-section-header">
                                <div className="tp-section-title">📍 Điểm đến thu hút</div>
                            </div>
                            <div className="tp-dest-grid">
                                {destinations.map((item) => (
                                    <div
                                        key={item.destination_id}
                                        className="tp-dest-card"
                                        onClick={() => router.push(`/hotels?search=${encodeURIComponent(item.city)}&destination_id=${item.destination_id}`)}
                                    >
                                        <div className="tp-dest-card-img">
                                            {item.image_url
                                                ? <Image src={item.image_url} alt={item.city} fill style={{ objectFit: "cover" }} />
                                                : "🏙️"}
                                        </div>
                                        <div className="tp-dest-card-body">
                                            <div className="tp-dest-card-name">{item.city}</div>
                                            <div className="tp-dest-card-count">{item.hotel_count} khách sạn</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    {!searched && destinations.length > 0 && (
                        <>
                            <div className="tp-section-header" style={{ marginTop: "2.5rem" }}>
                                <div className="tp-section-title">🏨 Khách sạn nổi bật</div>
                                {activeDestTab && (
                                    <Link href={`/hotels?search=${encodeURIComponent(activeDestTab.city)}&destination_id=${activeDestTab.destination_id}`} className="tp-section-link">
                                        Xem thêm các chỗ nghỉ ({activeDestTab.city}) →
                                    </Link>
                                )}
                            </div>
                            <div className="tp-hotel-tabs">
                                {destinations.map(d => (
                                    <button
                                        key={d.destination_id}
                                        className={`tp-hotel-tab${activeDestTab?.destination_id === d.destination_id ? " active" : ""}`}
                                        onClick={() => setActiveDestTab(d)}
                                    >{d.city}</button>
                                ))}
                            </div>
                            {loadingHotels ? (
                                <div className="tp-loading"><div className="tp-spinner" /><span>Đang tải...</span></div>
                            ) : (
                                <div className="tp-hotel-grid">
                                    {featuredHotels.map(h => (
                                        <div key={h.hotel_id} className="tp-hotel-card" onClick={() => router.push(`/hotels/${h.hotel_id}`)}>
                                            <div className="tp-hotel-card-img">
                                                {h.avg_rating && <span className="tp-hotel-rating">{h.avg_rating.toFixed(1)}</span>}
                                                {h.image_url
                                                    ? <Image src={h.image_url} alt={h.name} fill style={{ objectFit: "cover" }} />
                                                    : <span style={{ fontSize: "2.5rem" }}>🏨</span>}
                                            </div>
                                            <div className="tp-hotel-card-body">
                                                <div className="tp-hotel-card-name">{h.name}</div>
                                                <div className="tp-hotel-card-addr">📍 {h.destination_city || h.address}</div>
                                                <div className="tp-hotel-card-price">
                                                    {h.min_price ? `VND ${h.min_price.toLocaleString("vi-VN")}` : "Liên hệ"}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                    {!searched ? (
                        <div className="tp-hint" style={{ marginTop: "1.5rem" }}>
                            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚆</div>
                            <p style={{ fontWeight: 600, color: "#1a3c6b", fontSize: "1.1rem" }}>
                                Nhập điểm đi &amp; điểm đến để tìm chuyến tàu
                            </p>
                            <p style={{ color: "#6b8cbf", marginTop: "0.5rem", fontSize: "0.9rem" }}>
                                Nhiều hạng ghế: ngồi cứng, ngồi mềm, nằm cứng, nằm mềm
                            </p>
                        </div>
                    ) : (
                        <div className="tp-layout">
                            {/* Sidebar */}
                            <aside className="tp-sidebar">
                                <h3>Bộ lọc</h3>

                                {/* Hạng ghế */}
                                <div className="tp-filter-group">
                                    <div className="tp-filter-group-label">Hạng ghế</div>
                                    {SEAT_CLASS_OPTIONS.map((opt) => (
                                        <div
                                            key={opt.value}
                                            className={`tp-filter-option${seatClassFilter === opt.value ? " active" : ""}`}
                                            onClick={() => setSeatClassFilter(opt.value)}
                                        >
                                            <div className="tp-filter-dot" />{opt.label}
                                        </div>
                                    ))}
                                </div>

                                {/* Mức giá */}
                                <div className="tp-filter-group">
                                    <div className="tp-filter-group-label">Mức giá</div>
                                    {PRICE_OPTIONS.map((opt, i) => (
                                        <div
                                            key={i}
                                            className={`tp-filter-option${priceIdx === i ? " active" : ""}`}
                                            onClick={() => setPriceIdx(i)}
                                        >
                                            <div className="tp-filter-dot" />{opt.label}
                                        </div>
                                    ))}
                                </div>

                                {/* Sắp xếp */}
                                <div className="tp-filter-group">
                                    <div className="tp-filter-group-label">Sắp xếp theo</div>
                                    <select
                                        className="tp-sort-select"
                                        value={sortVal}
                                        onChange={(e) => setSortVal(e.target.value)}
                                    >
                                        {SORT_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </aside>

                            {/* Results */}
                            <div className="tp-main">
                                {!loading && (
                                    <div className="tp-result-meta">
                                        <strong>{fromCity}</strong> → <strong>{toCity}</strong>
                                        {" · "}{departDate}
                                        {" · "}Tìm thấy <strong>{trains.length}</strong> chuyến tàu
                                        {passengers > 1 && <> · <strong>{passengers}</strong> hành khách</>}
                                    </div>
                                )}

                                {loading ? (
                                    <div className="tp-loading">
                                        <div className="tp-spinner" />
                                        <span>Đang tìm chuyến tàu...</span>
                                    </div>
                                ) : error ? (
                                    <div style={{ background: "#fff0ee", border: "1px solid #ffbdad", color: "#bf2600", padding: "1.5rem", borderRadius: "12px", textAlign: "center" }}>
                                        ⚠ {error}
                                    </div>
                                ) : trains.length === 0 ? (
                                    <div className="tp-empty">
                                        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🚆</div>
                                        <p style={{ fontWeight: 600, color: "#1a3c6b" }}>Không tìm thấy chuyến tàu phù hợp</p>
                                        <p style={{ fontSize: "0.88rem", marginTop: "0.4rem" }}>Thử thay đổi ngày đi hoặc hạng ghế</p>
                                    </div>
                                ) : (
                                    <div>
                                        {trains.map((train) => (
                                            <TrainCard
                                                key={train.train_id}
                                                train={train}
                                                passengers={passengers}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
