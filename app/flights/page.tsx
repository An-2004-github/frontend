"use client";

import "@/styles/flights.css";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import FlightList from "@/components/flight/FlightList";
import { Flight } from "@/types/flight";
import { flightService } from "@/services/flightService";
import DestinationInput from "@/components/ui/DestinationInput";

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

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

export default function FlightsPage() {
    const searchParams = useSearchParams();

    // Search form
    const [tripType, setTripType] = useState<"one_way" | "round_trip">(
        (searchParams.get("trip_type") as "one_way" | "round_trip") || "one_way"
    );
    const [fromCity, setFromCity] = useState(searchParams.get("from") || "");
    const [toCity, setToCity] = useState(searchParams.get("to") || "");
    const [departDate, setDepartDate] = useState(searchParams.get("date") || TODAY);
    const [returnDate, setReturnDate] = useState(searchParams.get("return_date") || "");

    // Passenger picker
    const [adults, setAdults] = useState(1);
    const [childrenCount, setChildrenCount] = useState(0);
    const [infants, setInfants] = useState(0);
    const [passengerOpen, setPassengerOpen] = useState(false);
    const passengerRef = useRef<HTMLDivElement>(null);
    const passengers = adults + childrenCount + infants;

    // Destination cities filtered by fromCity
    const [destinationCities, setDestinationCities] = useState<string[]>([]);

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
    const [errors, setErrors] = useState<Record<string, string>>({});
    const searchAbortRef = useRef<AbortController | null>(null);

    // Close passenger picker on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (passengerRef.current && !passengerRef.current.contains(e.target as Node)) {
                setPassengerOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Load airlines for filter
    useEffect(() => {
        flightService.getAirlines().then(setAirlines).catch(() => { });
    }, []);

    // Load destination cities when fromCity or departDate changes
    const isFirstFromCity = useRef(true);
    const isSwapping = useRef(false);
    useEffect(() => {
        if (!fromCity.trim()) { setDestinationCities([]); return; }
        flightService.getDestinationCities(fromCity, departDate)
            .then(cities => {
                setDestinationCities(cities);
                // Nếu điểm đến hiện tại không còn trong danh sách mới → reset (trừ khi đang swap)
                if (!isFirstFromCity.current && !isSwapping.current && toCity && !cities.includes(toCity)) {
                    setToCity("");
                }
                isSwapping.current = false;
            })
            .catch(() => { setDestinationCities([]); isSwapping.current = false; });
        if (isFirstFromCity.current) { isFirstFromCity.current = false; return; }
        if (!isSwapping.current) setToCity("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromCity, departDate]);

    const handleSearch = useCallback(async () => {
        const errs: Record<string, string> = {};
        if (!fromCity.trim()) errs.fromCity = "Vui lòng nhập điểm khởi hành";
        if (!toCity.trim())   errs.toCity   = "Vui lòng nhập điểm đến";
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setErrors({});
        searchAbortRef.current?.abort();
        const controller = new AbortController();
        searchAbortRef.current = controller;
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
            }, controller.signal);

            // Filter theo giờ bay client-side
            const time = TIME_OPTIONS[timeIdx];
            const filtered = timeIdx === 0 ? data : data.filter(f => {
                const hour = new Date(f.depart_time).toTimeString().slice(0, 5);
                return hour >= time.start && hour <= time.end;
            });

            setFlights(filtered);
        } catch (err) {
            if ((err as { name?: string })?.name === "CanceledError" || (err as { name?: string })?.name === "AbortError") return;
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
        isSwapping.current = true;
        setFromCity(toCity);
        setToCity(fromCity);
    };

    return (
        <>

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
                            onClick={() => {
                                setTripType("round_trip");
                                if (!returnDate) setReturnDate(addDays(departDate || TODAY, 2));
                            }}
                        >
                            Khứ hồi
                        </button>
                    </div>

                    {/* Search box */}
                    <div className="fp-search-box">
                        <div className="fp-search-row">
                            <div className="fp-search-field" style={{ flex: 2 }}>
                                <label className="fp-search-label">✈ Điểm khởi hành</label>
                                <DestinationInput
                                    value={fromCity}
                                    onChange={v => { setFromCity(v); if (v.trim()) setErrors(e => ({ ...e, fromCity: "" })); }}
                                    placeholder="Hà Nội, Hồ Chí Minh..."
                                    cityMode
                                    inputStyle={errors.fromCity ? { borderColor: "#e74c3c", boxShadow: "0 0 0 3px rgba(231,76,60,0.12)" } : {}}
                                />
                                {errors.fromCity && <span className="fp-field-error">⚠ {errors.fromCity}</span>}
                            </div>

                            <button className="fp-swap-btn" onClick={handleSwap} title="Đổi chiều">⇄</button>

                            <div className="fp-search-field" style={{ flex: 2 }}>
                                <label className="fp-search-label">🛬 Điểm đến</label>
                                <DestinationInput
                                    value={toCity}
                                    onChange={v => { setToCity(v); if (v.trim()) setErrors(e => ({ ...e, toCity: "" })); }}
                                    placeholder={fromCity ? "Chọn điểm đến..." : "Đà Nẵng, Phú Quốc..."}
                                    cityMode
                                    cities={destinationCities.length > 0 ? destinationCities : undefined}
                                    inputStyle={errors.toCity ? { borderColor: "#e74c3c", boxShadow: "0 0 0 3px rgba(231,76,60,0.12)" } : {}}
                                />
                                {errors.toCity && <span className="fp-field-error">⚠ {errors.toCity}</span>}
                            </div>

                            <div className="fp-search-field">
                                <label className="fp-search-label">📅 Ngày đi</label>
                                <input
                                    className="fp-search-input"
                                    type="date"
                                    value={departDate}
                                    min={TODAY}
                                    onChange={(e) => {
                                        setDepartDate(e.target.value);
                                        if (returnDate && returnDate <= e.target.value)
                                            setReturnDate(addDays(e.target.value, 2));
                                    }}
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

                            <div className="fp-search-field" style={{ minWidth: 200 }} ref={passengerRef}>
                                <label className="fp-search-label">👤 Hành khách</label>
                                <div className="fp-passenger-wrap">
                                    <button
                                        className={`fp-passenger-btn${passengerOpen ? " open" : ""}`}
                                        onClick={() => setPassengerOpen(o => !o)}
                                        type="button"
                                    >
                                        <span>
                                            {passengers} hành khách
                                            {adults > 0 && ` · ${adults} NL`}
                                            {childrenCount > 0 && ` · ${childrenCount} TE`}
                                            {infants > 0 && ` · ${infants} EB`}
                                        </span>
                                        <span className="fp-passenger-btn-arrow">{passengerOpen ? "▲" : "▼"}</span>
                                    </button>
                                    {passengerOpen && (
                                        <div className="fp-passenger-dropdown">
                                            {/* Adults */}
                                            <div className="fp-passenger-row">
                                                <div>
                                                    <div className="fp-passenger-label">Người lớn</div>
                                                    <div className="fp-passenger-sub">Từ 12 tuổi</div>
                                                </div>
                                                <div className="fp-passenger-counter">
                                                    <button className="fp-passenger-count-btn" disabled={adults <= 1} onClick={() => setAdults(a => Math.max(1, a - 1))}>−</button>
                                                    <span className="fp-passenger-count-val">{adults}</span>
                                                    <button className="fp-passenger-count-btn" disabled={passengers >= 9} onClick={() => setAdults(a => a + 1)}>+</button>
                                                </div>
                                            </div>
                                            {/* Children */}
                                            <div className="fp-passenger-row">
                                                <div>
                                                    <div className="fp-passenger-label">Trẻ em</div>
                                                    <div className="fp-passenger-sub">2 – 11 tuổi</div>
                                                </div>
                                                <div className="fp-passenger-counter">
                                                    <button className="fp-passenger-count-btn" disabled={childrenCount <= 0} onClick={() => setChildrenCount(c => Math.max(0, c - 1))}>−</button>
                                                    <span className="fp-passenger-count-val">{childrenCount}</span>
                                                    <button className="fp-passenger-count-btn" disabled={passengers >= 9} onClick={() => setChildrenCount(c => c + 1)}>+</button>
                                                </div>
                                            </div>
                                            {/* Infants */}
                                            <div className="fp-passenger-row">
                                                <div>
                                                    <div className="fp-passenger-label">Em bé</div>
                                                    <div className="fp-passenger-sub">Dưới 2 tuổi</div>
                                                </div>
                                                <div className="fp-passenger-counter">
                                                    <button className="fp-passenger-count-btn" disabled={infants <= 0} onClick={() => setInfants(i => Math.max(0, i - 1))}>−</button>
                                                    <span className="fp-passenger-count-val">{infants}</span>
                                                    <button className="fp-passenger-count-btn" disabled={infants >= adults || passengers >= 9} onClick={() => setInfants(i => i + 1)}>+</button>
                                                </div>
                                            </div>
                                            <div className="fp-passenger-note">* Mỗi em bé cần 1 người lớn đi kèm. Tối đa 9 hành khách.</div>
                                            <button className="fp-passenger-done" onClick={() => setPassengerOpen(false)}>Xong</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                className="fp-search-btn"
                                onClick={handleSearch}
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
                                    <FlightList
                                        flights={flights}
                                        passengers={passengers}
                                        adults={adults}
                                        childrenCount={childrenCount}
                                        infants={infants}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}