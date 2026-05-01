"use client";

import "@/styles/buses.css";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import BusList from "@/components/bus/BusList";
import { Bus } from "@/types/bus";
import { busService } from "@/services/busService";
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
    { label: "Giá thấp nhất", value: "price_asc" },
    { label: "Giá cao nhất", value: "price_desc" },
    { label: "Giờ đi sớm nhất", value: "depart_asc" },
    { label: "Thời gian ngắn nhất", value: "duration" },
];

const PRICE_OPTIONS = [
    { label: "Tất cả", min: undefined, max: undefined },
    { label: "Dưới 100k", min: undefined, max: 100_000 },
    { label: "100k – 300k", min: 100_000, max: 300_000 },
    { label: "Trên 300k", min: 300_000, max: undefined },
];

const TIME_OPTIONS = [
    { label: "Tất cả", start: "00:00", end: "23:59" },
    { label: "Sáng sớm (0–6h)", start: "00:00", end: "05:59" },
    { label: "Buổi sáng (6–12h)", start: "06:00", end: "11:59" },
    { label: "Buổi chiều (12–18h)", start: "12:00", end: "17:59" },
    { label: "Buổi tối (18–24h)", start: "18:00", end: "23:59" },
];

const POPULAR_ROUTES = [
    { from: "Hà Nội", to: "Hồ Chí Minh" },
    { from: "Hồ Chí Minh", to: "Đà Lạt" },
    { from: "Hồ Chí Minh", to: "Nha Trang" },
    { from: "Hà Nội", to: "Đà Nẵng" },
    { from: "Hồ Chí Minh", to: "Đà Nẵng" },
    { from: "Hà Nội", to: "Hải Phòng" },
];

const TODAY = new Date().toISOString().split("T")[0];

export default function BusesPage() {
    const searchParams = useSearchParams();

    // Search form
    const [fromCity, setFromCity] = useState(searchParams.get("from") || "");
    const [toCity, setToCity] = useState(searchParams.get("to") || "");
    const [departDate, setDepartDate] = useState(searchParams.get("date") || TODAY);
    const [passengers, setPassengers] = useState(1);

    const [destinationCities, setDestinationCities] = useState<string[]>([]);
    const isFirstFromCity = useRef(true);

    // Filter
    const [companies, setCompanies] = useState<string[]>([]);
    const [selectedCompany, setSelectedCompany] = useState("");
    const [priceIdx, setPriceIdx] = useState(0);
    const [timeIdx, setTimeIdx] = useState(0);
    const [sortVal, setSortVal] = useState("price_asc");

    const router = useRouter();
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [activeDestTab, setActiveDestTab] = useState<Destination | null>(null);
    const [featuredHotels, setFeaturedHotels] = useState<Hotel[]>([]);
    const [loadingHotels, setLoadingHotels] = useState(false);

    // Results
    const [buses, setBuses] = useState<Bus[]>([]);
    const [promos, setPromos] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    useEffect(() => {
        api.get("/api/destinations?country=Vietnam&limit=5")
            .then(r => setDestinations(r.data)).catch(() => { });
        busService.getCompanies().then(setCompanies).catch(() => { });
        Promise.all([promotionService.getPromotions("bus"), promotionService.getPromotions("all")])
            .then(([specific, all]) => {
                const seen = new Set<number>();
                const merged = [...specific, ...all].filter(p => {
                    if (seen.has(p.promo_id) || p.status !== "active") return false;
                    seen.add(p.promo_id); return true;
                });
                setPromos(merged.slice(0, 6));
            }).catch(() => { });
    }, []);

    const isSwapping = useRef(false);
    useEffect(() => {
        if (!fromCity.trim()) { setDestinationCities([]); return; }
        busService.getDestinationCities(fromCity)
            .then(cities => { setDestinationCities(cities); isSwapping.current = false; })
            .catch(() => { setDestinationCities([]); isSwapping.current = false; });
        if (isFirstFromCity.current) { isFirstFromCity.current = false; return; }
        if (!isSwapping.current) setToCity("");
    }, [fromCity]);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const searchAbortRef = useRef<AbortController | null>(null);

    const handleSearch = useCallback(async () => {
        const errs: Record<string, string> = {};
        if (!fromCity.trim()) errs.fromCity = "Vui lòng nhập điểm đi";
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
            const data = await busService.searchBuses({
                from_city: fromCity,
                to_city: toCity,
                depart_date: departDate,
                company: selectedCompany || undefined,
                min_price: price.min,
                max_price: price.max,
                sort: sortVal as "price_asc" | "price_desc" | "depart_asc" | "duration",
            }, controller.signal);

            // Filter theo giờ đi client-side
            const time = TIME_OPTIONS[timeIdx];
            const filtered = timeIdx === 0 ? data : data.filter(b => {
                const hour = new Date(b.depart_time).toTimeString().slice(0, 5);
                return hour >= time.start && hour <= time.end;
            });

            setBuses(filtered);
        } catch (err) {
            if ((err as { name?: string })?.name === "CanceledError" || (err as { name?: string })?.name === "AbortError") return;
            setError("Không thể tải dữ liệu. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, [fromCity, toCity, departDate, selectedCompany, priceIdx, timeIdx, sortVal]);

    useEffect(() => {
        if (searched) handleSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCompany, priceIdx, timeIdx, sortVal]);

    const handleSwap = () => {
        isSwapping.current = true;
        setFromCity(toCity);
        setToCity(fromCity);
    };

    return (
        <>

            <div className="bp-root">
                {/* ── HERO ── */}
                <div className="bp-hero">
                    <div className="bp-hero-bg" />
                    <div className="bp-hero-circle" style={{ width: 220, height: 220, right: -60, top: -60 }} />
                    <div className="bp-hero-circle" style={{ width: 140, height: 140, left: -40, bottom: -40 }} />
                    <h1>🚌 Tìm vé xe khách giá rẻ</h1>
                    <p>Đặt vé xe khách nhanh chóng, nhiều lựa chọn nhà xe uy tín</p>

                    {/* Search box */}
                    <div className="bp-search-box">
                        <div className="bp-search-row">
                            <div className="bp-search-field" style={{ flex: 2 }}>
                                <label className="bp-search-label">📍 Điểm đi</label>
                                <DestinationInput
                                    value={fromCity}
                                    onChange={v => { setFromCity(v); if (v.trim()) setErrors(p => ({ ...p, fromCity: "" })); }}
                                    placeholder="Hà Nội, Hồ Chí Minh..."
                                    cityMode
                                    inputStyle={errors.fromCity ? { borderColor: "#e74c3c", boxShadow: "0 0 0 3px rgba(231,76,60,0.12)" } : {}}
                                />
                                {errors.fromCity && <span style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, fontSize: "0.7rem", color: "#fff", background: "#e74c3c", borderRadius: "6px", padding: "0.2rem 0.55rem", display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap", zIndex: 10, boxShadow: "0 2px 8px rgba(231,76,60,0.3)" }}>⚠ {errors.fromCity}</span>}
                            </div>

                            <button className="bp-swap-btn" onClick={handleSwap} title="Đổi chiều">⇄</button>

                            <div className="bp-search-field" style={{ flex: 2 }}>
                                <label className="bp-search-label">🏁 Điểm đến</label>
                                <DestinationInput
                                    value={toCity}
                                    onChange={v => { setToCity(v); if (v.trim()) setErrors(p => ({ ...p, toCity: "" })); }}
                                    placeholder={fromCity ? "Chọn điểm đến..." : "Đà Lạt, Nha Trang..."}
                                    cityMode
                                    cities={destinationCities.length > 0 ? destinationCities : undefined}
                                    inputStyle={errors.toCity ? { borderColor: "#e74c3c", boxShadow: "0 0 0 3px rgba(231,76,60,0.12)" } : {}}
                                />
                                {errors.toCity && <span style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, fontSize: "0.7rem", color: "#fff", background: "#e74c3c", borderRadius: "6px", padding: "0.2rem 0.55rem", display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap", zIndex: 10, boxShadow: "0 2px 8px rgba(231,76,60,0.3)" }}>⚠ {errors.toCity}</span>}
                            </div>

                            <div className="bp-search-field">
                                <label className="bp-search-label">📅 Ngày đi</label>
                                <input
                                    className="bp-search-input"
                                    type="date"
                                    value={departDate}
                                    min={TODAY}
                                    onChange={(e) => setDepartDate(e.target.value)}
                                />
                            </div>

                            <div className="bp-search-field" style={{ minWidth: 90 }}>
                                <label className="bp-search-label">👤 Hành khách</label>
                                <input
                                    className="bp-search-input"
                                    type="number" min={1} max={9}
                                    value={passengers}
                                    onChange={(e) => setPassengers(Number(e.target.value))}
                                />
                            </div>

                            <button
                                className="bp-search-btn"
                                onClick={handleSearch}
                            >
                                Tìm chuyến
                            </button>
                        </div>

                        {/* Popular routes */}
                        <div className="bp-popular">
                            <span className="bp-popular-label">Phổ biến:</span>
                            {POPULAR_ROUTES.map((r, i) => (
                                <div
                                    key={i}
                                    className="bp-popular-chip"
                                    onClick={() => { setFromCity(r.from); setToCity(r.to); }}
                                >
                                    {r.from} → {r.to}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── CONTENT ── */}
                <div className="bp-content">
                    {promos.length > 0 && (
                        <>
                            <div className="bp-section-header">
                                <div className="bp-section-title">🎁 Ưu đãi vé xe khách</div>
                                <Link href="/promotion" className="bp-section-link">Xem tất cả →</Link>
                            </div>
                            <div className="bp-promo-strip">
                                {promos.map((p) => (
                                    <div key={p.promo_id} className="bp-promo-card">
                                        <div className="bp-promo-card-icon">🚌</div>
                                        <div className="bp-promo-card-info">
                                            <div className="bp-promo-card-discount">
                                                {p.discount_type === "percent"
                                                    ? `Giảm ${p.discount_percent}% · Tối đa ${(p.max_discount / 1000).toFixed(0)}K`
                                                    : `Giảm ${(p.max_discount / 1000).toFixed(0)}K`}
                                            </div>
                                            <div className="bp-promo-card-code">{p.code}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    {!searched && destinations.length > 0 && (
                        <>
                            <div className="bp-section-header">
                                <div className="bp-section-title">📍 Điểm đến thu hút</div>
                            </div>
                            <div className="bp-dest-grid">
                                {destinations.map((item) => (
                                    <div
                                        key={item.destination_id}
                                        className="bp-dest-card"
                                        onClick={() => router.push(`/hotels?search=${encodeURIComponent(item.city)}&destination_id=${item.destination_id}`)}
                                    >
                                        <div className="bp-dest-card-img">
                                            {item.image_url
                                                ? <Image src={item.image_url} alt={item.city} fill style={{ objectFit: "cover" }} />
                                                : "🏙️"}
                                        </div>
                                        <div className="bp-dest-card-body">
                                            <div className="bp-dest-card-name">{item.city}</div>
                                            <div className="bp-dest-card-count">{item.hotel_count} khách sạn</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    {!searched && destinations.length > 0 && (
                        <>
                            <div className="bp-section-header" style={{ marginTop: "2.5rem" }}>
                                <div className="bp-section-title">🏨 Khách sạn nổi bật</div>
                                {activeDestTab && (
                                    <Link href={`/hotels?search=${encodeURIComponent(activeDestTab.city)}&destination_id=${activeDestTab.destination_id}`} className="bp-section-link">
                                        Xem thêm các chỗ nghỉ ({activeDestTab.city}) →
                                    </Link>
                                )}
                            </div>
                            <div className="bp-hotel-tabs">
                                {destinations.map(d => (
                                    <button
                                        key={d.destination_id}
                                        className={`bp-hotel-tab${activeDestTab?.destination_id === d.destination_id ? " active" : ""}`}
                                        onClick={() => setActiveDestTab(d)}
                                    >{d.city}</button>
                                ))}
                            </div>
                            {loadingHotels ? (
                                <div className="bp-loading"><div className="bp-spinner" /><span>Đang tải...</span></div>
                            ) : (
                                <div className="bp-hotel-grid">
                                    {featuredHotels.map(h => (
                                        <div key={h.hotel_id} className="bp-hotel-card" onClick={() => router.push(`/hotels/${h.hotel_id}`)}>
                                            <div className="bp-hotel-card-img">
                                                {h.avg_rating && <span className="bp-hotel-rating">{h.avg_rating.toFixed(1)}</span>}
                                                {h.image_url
                                                    ? <Image src={h.image_url} alt={h.name} fill style={{ objectFit: "cover" }} />
                                                    : <span style={{ fontSize: "2.5rem" }}>🏨</span>}
                                            </div>
                                            <div className="bp-hotel-card-body">
                                                <div className="bp-hotel-card-name">{h.name}</div>
                                                <div className="bp-hotel-card-addr">📍 {h.destination_city || h.address}</div>
                                                <div className="bp-hotel-card-price">
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
                        <div className="bp-hint">
                            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚌</div>
                            <p style={{ fontWeight: 600, color: "#1a3c6b", fontSize: "1.1rem" }}>
                                Nhập điểm đi & điểm đến để tìm chuyến xe
                            </p>
                            <p style={{ color: "#6b8cbf", marginTop: "0.5rem", fontSize: "0.9rem" }}>
                                Nhiều nhà xe uy tín, giá tốt nhất
                            </p>
                        </div>
                    ) : (
                        <div className="bp-layout">
                            {/* Sidebar */}
                            <aside className="bp-sidebar">
                                <h3>Bộ lọc</h3>

                                {/* Nhà xe */}
                                {companies.length > 0 && (
                                    <div className="bp-filter-group">
                                        <div className="bp-filter-group-label">Nhà xe</div>
                                        <div
                                            className={`bp-filter-option${!selectedCompany ? " active" : ""}`}
                                            onClick={() => setSelectedCompany("")}
                                        >
                                            <div className="bp-filter-dot" />Tất cả nhà xe
                                        </div>
                                        {companies.map((c) => (
                                            <div
                                                key={c}
                                                className={`bp-filter-option${selectedCompany === c ? " active" : ""}`}
                                                onClick={() => setSelectedCompany(c)}
                                            >
                                                <div className="bp-filter-dot" />{c}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Giờ đi */}
                                <div className="bp-filter-group">
                                    <div className="bp-filter-group-label">Giờ khởi hành</div>
                                    {TIME_OPTIONS.map((opt, i) => (
                                        <div
                                            key={i}
                                            className={`bp-filter-option${timeIdx === i ? " active" : ""}`}
                                            onClick={() => setTimeIdx(i)}
                                        >
                                            <div className="bp-filter-dot" />{opt.label}
                                        </div>
                                    ))}
                                </div>

                                {/* Giá */}
                                <div className="bp-filter-group">
                                    <div className="bp-filter-group-label">Mức giá</div>
                                    {PRICE_OPTIONS.map((opt, i) => (
                                        <div
                                            key={i}
                                            className={`bp-filter-option${priceIdx === i ? " active" : ""}`}
                                            onClick={() => setPriceIdx(i)}
                                        >
                                            <div className="bp-filter-dot" />{opt.label}
                                        </div>
                                    ))}
                                </div>

                                {/* Sắp xếp */}
                                <div className="bp-filter-group">
                                    <div className="bp-filter-group-label">Sắp xếp theo</div>
                                    <select
                                        className="bp-sort-select"
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
                            <div className="bp-main">
                                {!loading && (
                                    <div className="bp-result-meta">
                                        <strong>{fromCity}</strong> → <strong>{toCity}</strong>
                                        {" · "}{departDate}
                                        {" · "}Tìm thấy <strong>{buses.length}</strong> chuyến xe
                                        {passengers > 1 && <> · <strong>{passengers}</strong> hành khách</>}
                                    </div>
                                )}

                                {loading ? (
                                    <div className="bp-loading">
                                        <div className="bp-spinner" />
                                        <span>Đang tìm chuyến xe...</span>
                                    </div>
                                ) : error ? (
                                    <div style={{ background: "#fff0ee", border: "1px solid #ffbdad", color: "#bf2600", padding: "1.5rem", borderRadius: "12px", textAlign: "center" }}>
                                        ⚠ {error}
                                    </div>
                                ) : (
                                    <BusList buses={buses} passengers={passengers} />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}