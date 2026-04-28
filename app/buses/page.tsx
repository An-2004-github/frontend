"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import BusList from "@/components/bus/BusList";
import { Bus } from "@/types/bus";
import { busService } from "@/services/busService";
import DestinationInput from "@/components/ui/DestinationInput";

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

    // Results
    const [buses, setBuses] = useState<Bus[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        busService.getCompanies().then(setCompanies).catch(() => { });
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

    const handleSearch = useCallback(async () => {
        const errs: Record<string, string> = {};
        if (!fromCity.trim()) errs.fromCity = "Vui lòng nhập điểm đi";
        if (!toCity.trim())   errs.toCity   = "Vui lòng nhập điểm đến";
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setErrors({});
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
            });

            // Filter theo giờ đi client-side
            const time = TIME_OPTIONS[timeIdx];
            const filtered = timeIdx === 0 ? data : data.filter(b => {
                const hour = new Date(b.depart_time).toTimeString().slice(0, 5);
                return hour >= time.start && hour <= time.end;
            });

            setBuses(filtered);
        } catch {
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
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
                * { box-sizing: border-box; }

                .bp-root { min-height: 100vh; background: #f0f4ff; font-family: 'DM Sans', sans-serif; }

                /* ── HERO ── */
                .bp-hero {
                    background: linear-gradient(135deg, #003580 0%, #0052cc 55%, #0065ff 100%);
                    padding: 2.5rem 1.5rem 5rem;
                    position: relative; overflow: hidden; text-align: center;
                }
                .bp-hero-bg {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
                    background-size: 24px 24px;
                }
                .bp-hero-circle { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.05); }
                .bp-hero h1 {
                    font-family: 'Nunito', sans-serif;
                    font-size: 2rem; font-weight: 800; color: #fff;
                    margin: 0 0 0.4rem; position: relative;
                }
                .bp-hero p { color: rgba(255,255,255,0.7); font-size: 0.95rem; font-weight: 300; position: relative; margin-bottom: 1.75rem; }

                /* ── SEARCH BOX ── */
                .bp-search-box {
                    position: relative; z-index: 10;
                    max-width: 860px; margin: 0 auto;
                    background: #fff; border-radius: 16px;
                    padding: 1.25rem 1.5rem;
                    box-shadow: 0 8px 40px rgba(0,0,0,0.18);
                }
                .bp-search-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
                .bp-search-field { display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 130px; position: relative; }
                .bp-search-label { font-size: 0.72rem; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.4px; }
                .bp-search-input {
                    border: 1.5px solid #dde3f0; border-radius: 10px;
                    padding: 0.7rem 0.9rem; font-size: 0.9rem;
                    font-family: 'DM Sans', sans-serif; color: #1a3c6b;
                    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
                }
                .bp-search-input:focus { border-color: #0052cc; box-shadow: 0 0 0 3px rgba(0,82,204,0.1); }
                .bp-search-input::placeholder { color: #b0bcd8; font-weight: 300; }

                .bp-swap-btn {
                    width: 38px; height: 38px; border-radius: 50%;
                    border: 1.5px solid #dde3f0; background: #f0f4ff;
                    cursor: pointer; font-size: 1.1rem; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    transition: background 0.18s; align-self: flex-end; margin-bottom: 1px;
                }
                .bp-swap-btn:hover { background: #e0ecff; border-color: #0052cc; }

                .bp-search-btn {
                    padding: 0.75rem 1.75rem; flex-shrink: 0;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; border: none; border-radius: 10px;
                    font-family: 'Nunito', sans-serif; font-size: 0.95rem; font-weight: 700;
                    cursor: pointer; transition: opacity 0.15s, transform 0.15s; align-self: flex-end;
                }
                .bp-search-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
                .bp-search-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                /* Popular routes */
                .bp-popular {
                    display: flex; gap: 0.5rem; flex-wrap: wrap;
                    padding: 0.75rem 0 0; border-top: 1px solid #eef2fb; margin-top: 0.75rem;
                }
                .bp-popular-label { font-size: 0.78rem; color: #6b778c; align-self: center; white-space: nowrap; }
                .bp-popular-chip {
                    padding: 0.3rem 0.75rem; border-radius: 99px;
                    background: #f0f4ff; border: 1px solid #c8d8ff;
                    font-size: 0.78rem; color: #0052cc; cursor: pointer;
                    transition: background 0.15s; white-space: nowrap;
                }
                .bp-popular-chip:hover { background: #dde9ff; }

                /* ── CONTENT ── */
                .bp-content { max-width: 1200px; margin: -2.5rem auto 0; padding: 0 1.5rem 4rem; position: relative; z-index: 5; }

                /* ── LAYOUT ── */
                .bp-layout { display: flex; gap: 1.5rem; align-items: flex-start; margin-top: 1.5rem; }

                /* ── SIDEBAR ── */
                .bp-sidebar {
                    width: 240px; flex-shrink: 0;
                    background: #fff; border-radius: 14px;
                    border: 1px solid #e8f0fe; padding: 1.25rem;
                    position: sticky; top: 72px;
                }
                .bp-sidebar h3 {
                    font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700; color: #1a3c6b;
                    margin: 0 0 1.1rem; padding-bottom: 0.75rem; border-bottom: 2px solid #e8f0fe;
                }
                .bp-filter-group { margin-bottom: 1.1rem; }
                .bp-filter-group-label { font-size: 0.75rem; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 0.5rem; }
                .bp-filter-option {
                    display: flex; align-items: center; gap: 0.5rem;
                    padding: 0.45rem 0.6rem; border-radius: 8px;
                    font-size: 0.85rem; color: #3a5f9a; cursor: pointer;
                    border: 1.5px solid transparent; transition: background 0.15s;
                    margin-bottom: 0.3rem;
                }
                .bp-filter-option:hover { background: #f0f4ff; }
                .bp-filter-option.active { background: #e8f0fe; border-color: rgba(0,82,204,0.3); color: #0052cc; font-weight: 500; }
                .bp-filter-dot { width: 8px; height: 8px; border-radius: 50%; border: 2px solid #0052cc; flex-shrink: 0; }
                .bp-filter-option.active .bp-filter-dot { background: #0052cc; }
                .bp-sort-select {
                    width: 100%; padding: 0.6rem 0.75rem;
                    border: 1.5px solid #dde3f0; border-radius: 8px;
                    font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #1a3c6b;
                    background: #fff; outline: none;
                }
                .bp-sort-select:focus { border-color: #0052cc; }

                /* ── MAIN ── */
                .bp-main { flex: 1; min-width: 0; }
                .bp-result-meta {
                    font-size: 0.88rem; color: #3a5f9a; margin-bottom: 1rem;
                    background: #fff; border: 1px solid #e8f0fe; border-radius: 10px;
                    padding: 0.65rem 1rem;
                    display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;
                    box-shadow: 0 2px 8px rgba(0,82,204,0.07);
                }
                .bp-result-meta strong { color: #1a3c6b; }

                /* ── BUS CARD ── */
                .bcard {
                    background: #fff; border-radius: 14px;
                    border: 1px solid #e8f0fe; padding: 1.25rem 1.5rem;
                    margin-bottom: 1rem;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .bcard:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,82,204,0.1); }

                .bcard-company {
                    display: flex; align-items: center; gap: 0.75rem;
                    margin-bottom: 1rem; padding-bottom: 0.75rem;
                    border-bottom: 1px solid #eef2fb;
                }
                .bcard-company-logo { font-size: 1.5rem; }
                .bcard-company-name { font-size: 0.9rem; font-weight: 600; color: #1a3c6b; }
                .bcard-company-sub { font-size: 0.75rem; color: #6b8cbf; margin-top: 0.1rem; }
                .bcard-low-seat {
                    margin-left: auto; font-size: 0.72rem; font-weight: 600;
                    background: #fff0ee; color: #c0392b; padding: 0.2rem 0.6rem; border-radius: 99px;
                }

                .bcard-route { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
                .bcard-city { min-width: 90px; }
                .bcard-time { font-family: 'Nunito', sans-serif; font-size: 1.5rem; font-weight: 800; color: #1a3c6b; }
                .bcard-date { font-size: 0.72rem; color: #6b8cbf; margin-top: 0.1rem; }
                .bcard-city-name { font-size: 0.82rem; color: #6b8cbf; margin-top: 0.1rem; }
                .bcard-middle { flex: 1; text-align: center; }
                .bcard-duration { font-size: 0.78rem; color: #6b8cbf; margin-bottom: 0.35rem; }
                .bcard-line { display: flex; align-items: center; gap: 4px; justify-content: center; margin-bottom: 0.25rem; }
                .bcard-dot { width: 6px; height: 6px; border-radius: 50%; background: #0052cc; flex-shrink: 0; }
                .bcard-dashes { flex: 1; height: 1.5px; background: repeating-linear-gradient(90deg, #0052cc 0, #0052cc 4px, transparent 4px, transparent 8px); }
                .bcard-bus-icon { font-size: 1rem; }
                .bcard-overnight { font-size: 0.72rem; color: #6b5bb0; font-weight: 500; }
                .bcard-direct { font-size: 0.72rem; color: #00875a; font-weight: 500; }

                .bcard-footer {
                    display: flex; align-items: center; justify-content: space-between;
                    border-top: 1px solid #eef2fb; padding-top: 0.9rem;
                }
                .bcard-price-wrap { display: flex; flex-direction: column; }
                .bcard-price-per { font-size: 0.75rem; color: #6b8cbf; }
                .bcard-price { display: flex; align-items: baseline; gap: 0.3rem; }
                .bcard-price-from { font-size: 0.78rem; color: #6b8cbf; }
                .bcard-price-value { font-family: 'Nunito', sans-serif; font-size: 1.3rem; font-weight: 800; color: #0052cc; }
                .bcard-price-total { font-size: 0.72rem; color: #6b8cbf; }
                .bcard-btn {
                    padding: 0.55rem 1.4rem;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; border-radius: 10px;
                    font-size: 0.88rem; font-weight: 600; text-decoration: none;
                    transition: opacity 0.15s, transform 0.15s;
                }
                .bcard-btn:hover { opacity: 0.88; transform: translateY(-1px); }

                /* ── BUS LIST ── */
                .bl-list { display: flex; flex-direction: column; }
                .bl-empty {
                    text-align: center; padding: 3.5rem;
                    background: #fff; border-radius: 14px;
                    border: 1px dashed #c8d8ff; color: #6b8cbf;
                }

                /* ── LOADING / HINT ── */
                .bp-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem; gap: 1rem; color: #6b8cbf; }
                .bp-spinner { width: 34px; height: 34px; border: 3px solid #e8f0fe; border-top-color: #0052cc; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                .bp-hint {
                    text-align: center; padding: 4rem 2rem; margin-top: 1.5rem;
                    background: #fff; border-radius: 14px; border: 1px solid #e8f0fe; color: #6b8cbf;
                }

                @media (max-width: 768px) {
                    .bp-search-row { flex-direction: column; }
                    .bp-layout { flex-direction: column; }
                    .bp-sidebar { width: 100%; position: static; }
                }
            `}</style>

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