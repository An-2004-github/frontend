"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Train } from "@/types/train";
import { trainService } from "@/services/trainService";
import TrainCard from "@/components/train/TrainCard";
import DestinationInput from "@/components/ui/DestinationInput";

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

    const [trains, setTrains] = useState<Train[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const handleSearch = useCallback(async () => {
        const errs: Record<string, string> = {};
        if (!fromCity.trim()) errs.fromCity = "Vui lòng nhập điểm khởi hành";
        if (!toCity.trim())   errs.toCity   = "Vui lòng nhập điểm đến";
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setErrors({});
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
            });
            setTrains(data);
        } catch {
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
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
                * { box-sizing: border-box; }
                .tp-root { min-height: 100vh; background: #f0f4ff; font-family: 'DM Sans', sans-serif; }

                /* HERO */
                .tp-hero {
                    background: linear-gradient(135deg, #0052cc 0%, #00418a 55%, #005299 100%);
                    padding: 2.5rem 1.5rem 5rem;
                    position: relative; overflow: hidden; text-align: center;
                }
                .tp-hero-bg {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
                    background-size: 24px 24px;
                }
                .tp-hero h1 {
                    font-family: 'Nunito', sans-serif;
                    font-size: 2rem; font-weight: 800; color: #fff;
                    margin: 0 0 0.4rem; position: relative;
                }
                .tp-hero p { color: rgba(255,255,255,0.7); font-size: 0.95rem; position: relative; margin-bottom: 1.75rem; }

                /* SEARCH BOX */
                .tp-search-box {
                    position: relative; z-index: 10;
                    max-width: 900px; margin: 0 auto;
                    background: #fff; border-radius: 16px;
                    padding: 1.25rem 1.5rem;
                    box-shadow: 0 8px 40px rgba(0,0,0,0.18);
                }
                .tp-search-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
                .tp-search-field { display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 130px; position: relative; }
                .tp-search-label { font-size: 0.72rem; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.4px; }
                .tp-search-input {
                    border: 1.5px solid #dde3f0; border-radius: 10px;
                    padding: 0.7rem 0.9rem; font-size: 0.9rem;
                    font-family: 'DM Sans', sans-serif; color: #1a3c6b;
                    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
                }
                .tp-search-input:focus { border-color: #0052cc; box-shadow: 0 0 0 3px rgba(0,53,128,0.1); }
                .tp-search-input::placeholder { color: #b0bcd8; font-weight: 300; }
                .tp-swap-btn {
                    width: 38px; height: 38px; border-radius: 50%;
                    border: 1.5px solid #dde3f0; background: #f0f4ff;
                    cursor: pointer; font-size: 1.1rem; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    transition: background 0.18s, border-color 0.18s; align-self: flex-end; margin-bottom: 1px;
                }
                .tp-swap-btn:hover { background: #dde9ff; border-color: #0052cc; }
                .tp-search-btn {
                    padding: 0.75rem 1.75rem; flex-shrink: 0;
                    background: linear-gradient(135deg, #0052cc, #0052cc);
                    color: #fff; border: none; border-radius: 10px;
                    font-family: 'Nunito', sans-serif; font-size: 0.95rem; font-weight: 700;
                    cursor: pointer; transition: opacity 0.15s, transform 0.15s; align-self: flex-end;
                }
                .tp-search-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                .tp-search-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

                /* Popular routes */
                .tp-popular {
                    display: flex; gap: 0.5rem; flex-wrap: wrap;
                    padding: 0.75rem 0 0; border-top: 1px solid #eef2fb; margin-top: 0.75rem;
                }
                .tp-popular-label { font-size: 0.78rem; color: #6b778c; align-self: center; white-space: nowrap; }
                .tp-popular-chip {
                    padding: 0.3rem 0.75rem; border-radius: 99px;
                    background: #f0f4ff; border: 1px solid #c8d8ff;
                    font-size: 0.78rem; color: #0052cc; cursor: pointer;
                    transition: background 0.15s; white-space: nowrap;
                }
                .tp-popular-chip:hover { background: #dde9ff; }

                /* CONTENT */
                .tp-content { max-width: 1200px; margin: -2.5rem auto 0; padding: 0 1.5rem 4rem; position: relative; z-index: 5; }
                .tp-layout { display: flex; gap: 1.5rem; align-items: flex-start; margin-top: 1.5rem; }

                /* SIDEBAR */
                .tp-sidebar {
                    width: 240px; flex-shrink: 0;
                    background: #fff; border-radius: 14px;
                    border: 1px solid #e8f0fe; padding: 1.25rem;
                    position: sticky; top: 72px;
                }
                .tp-sidebar h3 {
                    font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700; color: #1a3c6b;
                    margin: 0 0 1.1rem; padding-bottom: 0.75rem; border-bottom: 2px solid #e8f0fe;
                }
                .tp-filter-group { margin-bottom: 1.1rem; }
                .tp-filter-group-label { font-size: 0.75rem; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 0.5rem; }
                .tp-filter-option {
                    display: flex; align-items: center; gap: 0.5rem;
                    padding: 0.45rem 0.6rem; border-radius: 8px;
                    font-size: 0.85rem; color: #3a5f9a; cursor: pointer;
                    border: 1.5px solid transparent; transition: background 0.15s, border-color 0.15s;
                    margin-bottom: 0.3rem;
                }
                .tp-filter-option:hover { background: #f0f4ff; }
                .tp-filter-option.active { background: #e8f0fe; border-color: rgba(0,53,128,0.3); color: #0052cc; font-weight: 500; }
                .tp-filter-dot { width: 8px; height: 8px; border-radius: 50%; border: 2px solid #0052cc; flex-shrink: 0; }
                .tp-filter-option.active .tp-filter-dot { background: #0052cc; }
                .tp-sort-select {
                    width: 100%; padding: 0.6rem 0.75rem;
                    border: 1.5px solid #dde3f0; border-radius: 8px;
                    font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #1a3c6b;
                    background: #fff; outline: none; transition: border-color 0.2s;
                }
                .tp-sort-select:focus { border-color: #0052cc; }

                /* MAIN */
                .tp-main { flex: 1; min-width: 0; }
                .tp-result-meta {
                    font-size: 0.88rem; color: #3a5f9a; margin-bottom: 1rem;
                    background: #fff; border: 1px solid #e8f0fe; border-radius: 10px;
                    padding: 0.65rem 1rem;
                    display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;
                    box-shadow: 0 2px 8px rgba(0,82,204,0.07);
                }
                .tp-result-meta strong { color: #1a3c6b; }

                /* TRAIN CARD */
                .tcard {
                    background: #fff; border-radius: 14px;
                    border: 1px solid #e8f0fe; padding: 1.25rem 1.5rem;
                    margin-bottom: 1rem; transition: transform 0.2s, box-shadow 0.2s;
                }
                .tcard:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,53,128,0.1); }
                .tcard-header {
                    display: flex; align-items: center; gap: 0.75rem;
                    margin-bottom: 1rem; padding-bottom: 0.75rem;
                    border-bottom: 1px solid #eef2fb; flex-wrap: wrap;
                }
                .tcard-code {
                    background: #0052cc; color: #fff;
                    padding: 0.25rem 0.85rem; border-radius: 99px;
                    font-size: 0.85rem; font-weight: 700; flex-shrink: 0;
                }
                .tcard-class-badges { display: flex; gap: 0.4rem; flex-wrap: wrap; }
                .tcard-class-badge {
                    background: #f0f4ff; border: 1px solid #c8d8ff;
                    color: #0052cc; border-radius: 99px;
                    padding: 0.2rem 0.6rem; font-size: 0.72rem; font-weight: 600;
                }
                .tcard-low-seat {
                    margin-left: auto; font-size: 0.72rem; font-weight: 600;
                    background: #fff0ee; color: #c0392b; padding: 0.2rem 0.6rem; border-radius: 99px;
                }
                .tcard-route { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
                .tcard-city { min-width: 90px; }
                .tcard-time { font-family: 'Nunito', sans-serif; font-size: 1.5rem; font-weight: 800; color: #1a3c6b; }
                .tcard-city-name { font-size: 0.82rem; color: #6b8cbf; margin-top: 0.15rem; }
                .tcard-station { font-size: 0.72rem; color: #b0bcd8; margin-top: 0.1rem; }
                .tcard-middle { flex: 1; text-align: center; }
                .tcard-duration { font-size: 0.78rem; color: #6b8cbf; margin-bottom: 0.35rem; }
                .tcard-line { display: flex; align-items: center; gap: 4px; justify-content: center; margin-bottom: 0.25rem; }
                .tcard-dot { width: 6px; height: 6px; border-radius: 50%; background: #0052cc; flex-shrink: 0; }
                .tcard-dashes { flex: 1; height: 1.5px; background: repeating-linear-gradient(90deg, #0052cc 0, #0052cc 4px, transparent 4px, transparent 8px); }
                .tcard-icon { font-size: 1rem; color: #0052cc; }
                .tcard-direct { font-size: 0.72rem; color: #00875a; font-weight: 500; }
                .tcard-footer {
                    display: flex; align-items: center; justify-content: space-between;
                    border-top: 1px solid #eef2fb; padding-top: 0.9rem;
                }
                .tcard-price-wrap { display: flex; flex-direction: column; }
                .tcard-price-per { font-size: 0.75rem; color: #6b8cbf; }
                .tcard-price { display: flex; align-items: baseline; gap: 0.3rem; }
                .tcard-price-from { font-size: 0.78rem; color: #6b8cbf; }
                .tcard-price-value { font-family: 'Nunito', sans-serif; font-size: 1.3rem; font-weight: 800; color: #0052cc; }
                .tcard-price-total { font-size: 0.72rem; color: #6b8cbf; }
                .tcard-btn {
                    padding: 0.55rem 1.4rem;
                    background: linear-gradient(135deg, #0052cc, #0052cc);
                    color: #fff; border: none; border-radius: 10px;
                    font-size: 0.88rem; font-weight: 600; cursor: pointer;
                    transition: opacity 0.15s, transform 0.15s;
                }
                .tcard-btn:hover { opacity: 0.88; transform: translateY(-1px); }

                /* LOADING */
                .tp-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem; gap: 1rem; color: #6b8cbf; }
                .tp-spinner { width: 34px; height: 34px; border: 3px solid #e8f0fe; border-top-color: #0052cc; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* EMPTY */
                .tp-hint { text-align: center; padding: 4rem 2rem; background: #fff; border-radius: 14px; border: 1px solid #e8f0fe; color: #6b8cbf; }
                .tp-empty { text-align: center; padding: 3.5rem; background: #fff; border-radius: 14px; border: 1px dashed #c8d8ff; color: #6b8cbf; }

                @media (max-width: 768px) {
                    .tp-search-row { flex-direction: column; }
                    .tp-layout { flex-direction: column; }
                    .tp-sidebar { width: 100%; position: static; }
                    .tp-swap-btn { align-self: center; }
                }
            `}</style>

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
