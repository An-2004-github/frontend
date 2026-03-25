"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FlightList from "@/components/flight/FlightList";
import { Flight } from "@/types/flight";
import { flightService } from "@/services/flightService";

const SORT_OPTIONS = [
    { label: "Giá thấp nhất", value: "price_asc" },
    { label: "Giá cao nhất", value: "price_desc" },
    { label: "Giờ bay sớm nhất", value: "depart_asc" },
    { label: "Thời gian ngắn nhất", value: "duration" },
];

const PRICE_OPTIONS = [
    { label: "Tất cả", min: undefined, max: undefined },
    { label: "Dưới 1 triệu", min: undefined, max: 1_000_000 },
    { label: "1 – 3 triệu", min: 1_000_000, max: 3_000_000 },
    { label: "Trên 3 triệu", min: 3_000_000, max: undefined },
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
    { from: "Hồ Chí Minh", to: "Đà Nẵng" },
    { from: "Hà Nội", to: "Đà Nẵng" },
    { from: "Hồ Chí Minh", to: "Phú Quốc" },
    { from: "Hà Nội", to: "Nha Trang" },
    { from: "Hồ Chí Minh", to: "Nha Trang" },
];

const TODAY = new Date().toISOString().split("T")[0];

function FlightsContent() {
    const searchParams = useSearchParams();

    // Search form
    const [tripType, setTripType] = useState<"one_way" | "round_trip">("one_way");
    const [fromCity, setFromCity] = useState(searchParams.get("from") || "");
    const [toCity, setToCity] = useState(searchParams.get("to") || "");
    const [departDate, setDepartDate] = useState(searchParams.get("date") || TODAY);
    const [returnDate, setReturnDate] = useState("");
    const [passengers, setPassengers] = useState(1);

    // Filter
    const [airlines, setAirlines] = useState<string[]>([]);
    const [selectedAirline, setSelectedAirline] = useState("");
    const [priceIdx, setPriceIdx] = useState(0);
    const [timeIdx, setTimeIdx] = useState(0);
    const [sortVal, setSortVal] = useState("price_asc");

    // Results
    const [flights, setFlights] = useState<Flight[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load airlines for filter
    useEffect(() => {
        flightService.getAirlines().then(setAirlines).catch(() => { });
    }, []);

    const handleSearch = useCallback(async () => {
        if (!fromCity || !toCity) return;
        try {
            setLoading(true); setSearched(true); setError(null);
            const price = PRICE_OPTIONS[priceIdx];
            const data = await flightService.searchFlights({
                from_city: fromCity,
                to_city: toCity,
                depart_date: departDate,
                airline: selectedAirline || undefined,
                min_price: price.min,
                max_price: price.max,
                sort: sortVal as "price_asc" | "price_desc" | "depart_asc" | "duration",
            });

            // Filter theo giờ bay client-side
            const time = TIME_OPTIONS[timeIdx];
            const filtered = timeIdx === 0 ? data : data.filter(f => {
                const hour = new Date(f.depart_time).toTimeString().slice(0, 5);
                return hour >= time.start && hour <= time.end;
            });

            setFlights(filtered);
        } catch {
            setError("Không thể tải dữ liệu. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, [fromCity, toCity, departDate, selectedAirline, priceIdx, timeIdx, sortVal]);

    // Re-search when filters change (only if already searched)
    useEffect(() => {
        if (searched) handleSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAirline, priceIdx, timeIdx, sortVal]);

    const handleSwap = () => {
        setFromCity(toCity);
        setToCity(fromCity);
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
                * { box-sizing: border-box; }

                .fp-root { min-height: 100vh; background: #f0f4ff; font-family: 'DM Sans', sans-serif; }

                /* ── HERO ── */
                .fp-hero {
                    background: linear-gradient(135deg, #003580 0%, #0052cc 55%, #0065ff 100%);
                    padding: 2.5rem 1.5rem 5rem;
                    position: relative; overflow: hidden; text-align: center;
                }
                .fp-hero-bg {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
                    background-size: 24px 24px;
                }
                .fp-hero-circle { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.05); }
                .fp-hero h1 {
                    font-family: 'Nunito', sans-serif;
                    font-size: 2rem; font-weight: 800; color: #fff;
                    margin: 0 0 0.4rem; position: relative;
                }
                .fp-hero p { color: rgba(255,255,255,0.7); font-size: 0.95rem; font-weight: 300; position: relative; margin-bottom: 1.75rem; }

                /* ── TRIP TYPE TOGGLE ── */
                .fp-trip-toggle {
                    display: inline-flex; gap: 0.3rem;
                    background: rgba(255,255,255,0.15); border-radius: 10px;
                    padding: 4px; margin-bottom: 1.25rem; position: relative;
                }
                .fp-trip-btn {
                    padding: 0.4rem 1.25rem; border: none; border-radius: 7px;
                    font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 500;
                    cursor: pointer; color: rgba(255,255,255,0.75); background: transparent;
                    transition: background 0.18s, color 0.18s;
                }
                .fp-trip-btn.active { background: #fff; color: #0052cc; font-weight: 600; }

                /* ── SEARCH BOX ── */
                .fp-search-box {
                    position: relative; z-index: 10;
                    max-width: 900px; margin: 0 auto;
                    background: #fff; border-radius: 16px;
                    padding: 1.25rem 1.5rem;
                    box-shadow: 0 8px 40px rgba(0,0,0,0.18);
                }
                .fp-search-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
                .fp-search-field { display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 130px; }
                .fp-search-label { font-size: 0.72rem; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.4px; }
                .fp-search-input {
                    border: 1.5px solid #dde3f0; border-radius: 10px;
                    padding: 0.7rem 0.9rem; font-size: 0.9rem;
                    font-family: 'DM Sans', sans-serif; color: #1a3c6b;
                    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
                }
                .fp-search-input:focus { border-color: #0052cc; box-shadow: 0 0 0 3px rgba(0,82,204,0.1); }
                .fp-search-input::placeholder { color: #b0bcd8; font-weight: 300; }

                .fp-swap-btn {
                    width: 38px; height: 38px; border-radius: 50%;
                    border: 1.5px solid #dde3f0; background: #f0f4ff;
                    cursor: pointer; font-size: 1.1rem; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    transition: background 0.18s, border-color 0.18s; align-self: flex-end;
                    margin-bottom: 1px;
                }
                .fp-swap-btn:hover { background: #e0ecff; border-color: #0052cc; }

                .fp-search-btn {
                    padding: 0.75rem 1.75rem; flex-shrink: 0;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; border: none; border-radius: 10px;
                    font-family: 'Nunito', sans-serif; font-size: 0.95rem; font-weight: 700;
                    cursor: pointer; transition: opacity 0.15s, transform 0.15s; align-self: flex-end;
                }
                .fp-search-btn:hover { opacity: 0.9; transform: translateY(-1px); }

                /* Popular routes */
                .fp-popular {
                    display: flex; gap: 0.5rem; flex-wrap: wrap;
                    padding: 0.75rem 0 0; border-top: 1px solid #eef2fb; margin-top: 0.75rem;
                }
                .fp-popular-label { font-size: 0.78rem; color: #6b778c; align-self: center; white-space: nowrap; }
                .fp-popular-chip {
                    padding: 0.3rem 0.75rem; border-radius: 99px;
                    background: #f0f4ff; border: 1px solid #c8d8ff;
                    font-size: 0.78rem; color: #0052cc; cursor: pointer;
                    transition: background 0.15s; white-space: nowrap;
                }
                .fp-popular-chip:hover { background: #dde9ff; }

                /* ── CONTENT ── */
                .fp-content { max-width: 1200px; margin: -2.5rem auto 0; padding: 0 1.5rem 4rem; position: relative; z-index: 5; }

                /* ── LAYOUT ── */
                .fp-layout { display: flex; gap: 1.5rem; align-items: flex-start; margin-top: 1.5rem; }

                /* ── SIDEBAR ── */
                .fp-sidebar {
                    width: 240px; flex-shrink: 0;
                    background: #fff; border-radius: 14px;
                    border: 1px solid #e8f0fe; padding: 1.25rem;
                    position: sticky; top: 72px;
                }
                .fp-sidebar h3 {
                    font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700; color: #1a3c6b;
                    margin: 0 0 1.1rem; padding-bottom: 0.75rem; border-bottom: 2px solid #e8f0fe;
                }
                .fp-filter-group { margin-bottom: 1.1rem; }
                .fp-filter-group-label { font-size: 0.75rem; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 0.5rem; }
                .fp-filter-option {
                    display: flex; align-items: center; gap: 0.5rem;
                    padding: 0.45rem 0.6rem; border-radius: 8px;
                    font-size: 0.85rem; color: #3a5f9a; cursor: pointer;
                    border: 1.5px solid transparent; transition: background 0.15s, border-color 0.15s;
                    margin-bottom: 0.3rem;
                }
                .fp-filter-option:hover { background: #f0f4ff; }
                .fp-filter-option.active { background: #e8f0fe; border-color: rgba(0,82,204,0.3); color: #0052cc; font-weight: 500; }
                .fp-filter-dot { width: 8px; height: 8px; border-radius: 50%; border: 2px solid #0052cc; flex-shrink: 0; }
                .fp-filter-option.active .fp-filter-dot { background: #0052cc; }
                .fp-sort-select {
                    width: 100%; padding: 0.6rem 0.75rem;
                    border: 1.5px solid #dde3f0; border-radius: 8px;
                    font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #1a3c6b;
                    background: #fff; outline: none; transition: border-color 0.2s;
                }
                .fp-sort-select:focus { border-color: #0052cc; }

                /* ── MAIN ── */
                .fp-main { flex: 1; min-width: 0; }
                .fp-result-meta { font-size: 0.88rem; color: #6b8cbf; margin-bottom: 1rem; }
                .fp-result-meta strong { color: #1a3c6b; }

                /* ── FLIGHT CARD ── */
                .fcard {
                    background: #fff; border-radius: 14px;
                    border: 1px solid #e8f0fe; padding: 1.25rem 1.5rem;
                    margin-bottom: 1rem;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .fcard:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,82,204,0.1); }

                .fcard-airline {
                    display: flex; align-items: center; gap: 0.75rem;
                    margin-bottom: 1rem; padding-bottom: 0.75rem;
                    border-bottom: 1px solid #eef2fb;
                }
                .fcard-airline-logo { font-size: 1.5rem; }
                .fcard-airline-name { font-size: 0.9rem; font-weight: 600; color: #1a3c6b; }
                .fcard-airline-code { font-size: 0.75rem; color: #6b8cbf; margin-top: 0.1rem; }
                .fcard-low-seat {
                    margin-left: auto; font-size: 0.72rem; font-weight: 600;
                    background: #fff0ee; color: #c0392b; padding: 0.2rem 0.6rem; border-radius: 99px;
                }

                .fcard-route { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
                .fcard-city { min-width: 80px; }
                .fcard-time { font-family: 'Nunito', sans-serif; font-size: 1.5rem; font-weight: 800; color: #1a3c6b; }
                .fcard-city-name { font-size: 0.82rem; color: #6b8cbf; margin-top: 0.15rem; }
                .fcard-middle { flex: 1; text-align: center; }
                .fcard-duration { font-size: 0.78rem; color: #6b8cbf; margin-bottom: 0.35rem; }
                .fcard-line { display: flex; align-items: center; gap: 4px; justify-content: center; margin-bottom: 0.25rem; }
                .fcard-dot { width: 6px; height: 6px; border-radius: 50%; background: #0052cc; flex-shrink: 0; }
                .fcard-dashes { flex: 1; height: 1.5px; background: repeating-linear-gradient(90deg, #0052cc 0, #0052cc 4px, transparent 4px, transparent 8px); }
                .fcard-plane { font-size: 1rem; color: #0052cc; }
                .fcard-direct { font-size: 0.72rem; color: #00875a; font-weight: 500; }

                .fcard-footer {
                    display: flex; align-items: center; justify-content: space-between;
                    border-top: 1px solid #eef2fb; padding-top: 0.9rem;
                }
                .fcard-price-wrap { display: flex; flex-direction: column; }
                .fcard-price-per { font-size: 0.75rem; color: #6b8cbf; }
                .fcard-price { display: flex; align-items: baseline; gap: 0.3rem; }
                .fcard-price-from { font-size: 0.78rem; color: #6b8cbf; }
                .fcard-price-value { font-family: 'Nunito', sans-serif; font-size: 1.3rem; font-weight: 800; color: #0052cc; }
                .fcard-price-total { font-size: 0.72rem; color: #6b8cbf; }
                .fcard-btn {
                    padding: 0.55rem 1.4rem;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; border-radius: 10px;
                    font-size: 0.88rem; font-weight: 600; text-decoration: none;
                    transition: opacity 0.15s, transform 0.15s;
                }
                .fcard-btn:hover { opacity: 0.88; transform: translateY(-1px); }

                /* ── FLIGHT LIST ── */
                .fl-list { display: flex; flex-direction: column; }
                .fl-empty {
                    text-align: center; padding: 3.5rem;
                    background: #fff; border-radius: 14px;
                    border: 1px dashed #c8d8ff; color: #6b8cbf;
                }

                /* ── LOADING ── */
                .fp-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem; gap: 1rem; color: #6b8cbf; }
                .fp-spinner { width: 34px; height: 34px; border: 3px solid #e8f0fe; border-top-color: #0052cc; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* ── EMPTY STATE (before search) ── */
                .fp-hint {
                    text-align: center; padding: 4rem 2rem;
                    background: #fff; border-radius: 14px;
                    border: 1px solid #e8f0fe; color: #6b8cbf;
                }

                @media (max-width: 768px) {
                    .fp-search-row { flex-direction: column; }
                    .fp-layout { flex-direction: column; }
                    .fp-sidebar { width: 100%; position: static; }
                    .fp-swap-btn { align-self: center; }
                }
            `}</style>

            <div className="fp-root">
                {/* ── HERO ── */}
                <div className="fp-hero">
                    <div className="fp-hero-bg" />
                    <div className="fp-hero-circle" style={{ width: 220, height: 220, right: -60, top: -60 }} />
                    <div className="fp-hero-circle" style={{ width: 140, height: 140, left: -40, bottom: -40 }} />
                    <h1>✈️ Tìm vé máy bay giá rẻ</h1>
                    <p>So sánh hàng trăm chuyến bay, đặt vé nhanh chóng</p>

                    {/* Trip type toggle */}
                    <div className="fp-trip-toggle">
                        <button
                            className={`fp-trip-btn${tripType === "one_way" ? " active" : ""}`}
                            onClick={() => setTripType("one_way")}
                        >
                            Một chiều
                        </button>
                        <button
                            className={`fp-trip-btn${tripType === "round_trip" ? " active" : ""}`}
                            onClick={() => setTripType("round_trip")}
                        >
                            Khứ hồi
                        </button>
                    </div>

                    {/* Search box */}
                    <div className="fp-search-box">
                        <div className="fp-search-row">
                            <div className="fp-search-field" style={{ flex: 2 }}>
                                <label className="fp-search-label">✈ Điểm khởi hành</label>
                                <input
                                    className="fp-search-input"
                                    placeholder="Hà Nội, Hồ Chí Minh..."
                                    value={fromCity}
                                    onChange={(e) => setFromCity(e.target.value)}
                                />
                            </div>

                            <button className="fp-swap-btn" onClick={handleSwap} title="Đổi chiều">⇄</button>

                            <div className="fp-search-field" style={{ flex: 2 }}>
                                <label className="fp-search-label">🛬 Điểm đến</label>
                                <input
                                    className="fp-search-input"
                                    placeholder="Đà Nẵng, Phú Quốc..."
                                    value={toCity}
                                    onChange={(e) => setToCity(e.target.value)}
                                />
                            </div>

                            <div className="fp-search-field">
                                <label className="fp-search-label">📅 Ngày đi</label>
                                <input
                                    className="fp-search-input"
                                    type="date"
                                    value={departDate}
                                    min={TODAY}
                                    onChange={(e) => setDepartDate(e.target.value)}
                                />
                            </div>

                            {tripType === "round_trip" && (
                                <div className="fp-search-field">
                                    <label className="fp-search-label">📅 Ngày về</label>
                                    <input
                                        className="fp-search-input"
                                        type="date"
                                        value={returnDate}
                                        min={departDate}
                                        onChange={(e) => setReturnDate(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="fp-search-field" style={{ minWidth: 90 }}>
                                <label className="fp-search-label">👤 Hành khách</label>
                                <input
                                    className="fp-search-input"
                                    type="number" min={1} max={9}
                                    value={passengers}
                                    onChange={(e) => setPassengers(Number(e.target.value))}
                                />
                            </div>

                            <button
                                className="fp-search-btn"
                                onClick={handleSearch}
                                disabled={!fromCity || !toCity}
                            >
                                Tìm chuyến
                            </button>
                        </div>

                        {/* Popular routes */}
                        <div className="fp-popular">
                            <span className="fp-popular-label">Phổ biến:</span>
                            {POPULAR_ROUTES.map((r, i) => (
                                <div
                                    key={i}
                                    className="fp-popular-chip"
                                    onClick={() => { setFromCity(r.from); setToCity(r.to); }}
                                >
                                    {r.from} → {r.to}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── CONTENT ── */}
                <div className="fp-content">
                    {!searched ? (
                        <div className="fp-hint" style={{ marginTop: "1.5rem" }}>
                            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✈️</div>
                            <p style={{ fontWeight: 600, color: "#1a3c6b", fontSize: "1.1rem" }}>
                                Nhập điểm đi & điểm đến để tìm chuyến bay
                            </p>
                            <p style={{ color: "#6b8cbf", marginTop: "0.5rem", fontSize: "0.9rem" }}>
                                Hàng trăm chuyến bay mỗi ngày với giá tốt nhất
                            </p>
                        </div>
                    ) : (
                        <div className="fp-layout">
                            {/* Sidebar filter */}
                            <aside className="fp-sidebar">
                                <h3>Bộ lọc</h3>

                                {/* Hãng bay */}
                                {airlines.length > 0 && (
                                    <div className="fp-filter-group">
                                        <div className="fp-filter-group-label">Hãng bay</div>
                                        <div
                                            className={`fp-filter-option${!selectedAirline ? " active" : ""}`}
                                            onClick={() => setSelectedAirline("")}
                                        >
                                            <div className="fp-filter-dot" />Tất cả hãng
                                        </div>
                                        {airlines.map((a) => (
                                            <div
                                                key={a}
                                                className={`fp-filter-option${selectedAirline === a ? " active" : ""}`}
                                                onClick={() => setSelectedAirline(a)}
                                            >
                                                <div className="fp-filter-dot" />{a}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Giờ bay */}
                                <div className="fp-filter-group">
                                    <div className="fp-filter-group-label">Giờ khởi hành</div>
                                    {TIME_OPTIONS.map((opt, i) => (
                                        <div
                                            key={i}
                                            className={`fp-filter-option${timeIdx === i ? " active" : ""}`}
                                            onClick={() => setTimeIdx(i)}
                                        >
                                            <div className="fp-filter-dot" />{opt.label}
                                        </div>
                                    ))}
                                </div>

                                {/* Giá */}
                                <div className="fp-filter-group">
                                    <div className="fp-filter-group-label">Mức giá</div>
                                    {PRICE_OPTIONS.map((opt, i) => (
                                        <div
                                            key={i}
                                            className={`fp-filter-option${priceIdx === i ? " active" : ""}`}
                                            onClick={() => setPriceIdx(i)}
                                        >
                                            <div className="fp-filter-dot" />{opt.label}
                                        </div>
                                    ))}
                                </div>

                                {/* Sắp xếp */}
                                <div className="fp-filter-group">
                                    <div className="fp-filter-group-label">Sắp xếp theo</div>
                                    <select
                                        className="fp-sort-select"
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
                            <div className="fp-main">
                                {!loading && (
                                    <div className="fp-result-meta">
                                        <strong>{fromCity}</strong> → <strong>{toCity}</strong>
                                        {" · "}{departDate}
                                        {" · "}Tìm thấy <strong>{flights.length}</strong> chuyến bay
                                        {passengers > 1 && <> · <strong>{passengers}</strong> hành khách</>}
                                    </div>
                                )}

                                {loading ? (
                                    <div className="fp-loading">
                                        <div className="fp-spinner" />
                                        <span>Đang tìm chuyến bay...</span>
                                    </div>
                                ) : error ? (
                                    <div style={{ background: "#fff0ee", border: "1px solid #ffbdad", color: "#bf2600", padding: "1.5rem", borderRadius: "12px", textAlign: "center" }}>
                                        ⚠ {error}
                                    </div>
                                ) : (
                                    <FlightList flights={flights} passengers={passengers} />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default function FlightsPage() {
    return (
        <Suspense>
            <FlightsContent />
        </Suspense>
    );
}