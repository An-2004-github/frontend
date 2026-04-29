"use client";

import "@/styles/search-bar.css";
import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import DestinationInput from "@/components/ui/DestinationInput";
import { logSearch } from "@/lib/logInteraction";

type ServiceType = "hotel" | "flight" | "train" | "bus";

// Tính ngày theo local timezone của trình duyệt
function localDateStr(offsetDays = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
    ].join("-");
}

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

// Server trả "" (không có timezone), client trả ngày thực — không gây hydration mismatch
const useClientDate = (offsetDays = 0) =>
    useSyncExternalStore(() => () => {}, () => localDateStr(offsetDays), () => "");

export default function SearchBar() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<ServiceType>("hotel");

    // Ngày client-only (server snapshot = "", client snapshot = ngày thực)
    const clientToday    = useClientDate(0);
    const clientTomorrow = useClientDate(1);

    // ── Hotel state ──────────────────────────────────────────────
    const [hotelQuery, setHotelQuery] = useState("");
    const [checkIn, setCheckIn]       = useState("");
    const [checkOut, setCheckOut]     = useState("");
    const [adults, setAdults]         = useState(1);
    const [children, setChildren]     = useState(0);
    const [rooms, setRooms]           = useState(1);
    const [guestOpen, setGuestOpen]   = useState(false);
    const guestRef = useRef<HTMLDivElement>(null);

    // ── Flight / Bus / Train state ───────────────────────────────
    const [fromCity, setFromCity]       = useState("");
    const [toCity, setToCity]           = useState("");
    const [departDate, setDepartDate]   = useState("");
    const [returnDate, setReturnDate]   = useState("");
    const [tripType, setTripType]       = useState<"one_way" | "round_trip">("one_way");
    const [paxAdults, setPaxAdults]     = useState(1);
    const [paxChildren, setPaxChildren] = useState(0);
    const [paxOpen, setPaxOpen]         = useState(false);
    const paxRef = useRef<HTMLDivElement>(null);

    // ── Validation errors ────────────────────────────────────────
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [searching, setSearching] = useState(false);

    // Giá trị hiệu dụng: dùng state nếu user đã chọn, không thì fallback về ngày client
    const effectiveCheckIn    = checkIn    || clientToday;
    const effectiveCheckOut   = checkOut   || (effectiveCheckIn ? addDays(effectiveCheckIn, 1) : clientTomorrow);
    const effectiveDepartDate = departDate || clientToday;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (guestRef.current && !guestRef.current.contains(e.target as Node)) setGuestOpen(false);
            if (paxRef.current   && !paxRef.current.contains(e.target as Node))   setPaxOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const maxRooms     = adults;
    const guestSummary = [
        `${adults} người lớn`,
        ...(children > 0 ? [`${children} trẻ em`] : []),
        `${rooms} phòng`,
    ].join(", ");

    const paxTotal   = paxAdults + paxChildren;
    const paxSummary = [
        `${paxAdults} người lớn`,
        ...(paxChildren > 0 ? [`${paxChildren} trẻ em`] : []),
    ].join(", ");

    const handleSetAdults = (n: number) => {
        setAdults(n);
        if (rooms > n) setRooms(n);
    };

    const handleSearch = () => {
        if (activeTab === "hotel") {
            const errs: Record<string, string> = {};
            if (!hotelQuery.trim()) errs.hotelQuery = "Vui lòng nhập điểm đến";
            if (Object.keys(errs).length > 0) { setErrors(errs); return; }
            setErrors({});
            setSearching(true);
            logSearch(hotelQuery);
            const p = new URLSearchParams();
            if (hotelQuery)       p.set("search", hotelQuery);
            if (effectiveCheckIn)  p.set("check_in", effectiveCheckIn);
            if (effectiveCheckOut) p.set("check_out", effectiveCheckOut);
            p.set("adults", String(adults));
            p.set("children", String(children));
            p.set("rooms", String(rooms));
            router.push(`/hotels?${p.toString()}`);
        } else {
            const errs: Record<string, string> = {};
            if (!fromCity.trim()) errs.fromCity = "Vui lòng nhập điểm đi";
            if (!toCity.trim())   errs.toCity   = "Vui lòng nhập điểm đến";
            if (Object.keys(errs).length > 0) { setErrors(errs); return; }
            setErrors({});
            setSearching(true);
            logSearch(`${fromCity} → ${toCity}`);
            const p = new URLSearchParams();
            if (fromCity)   p.set("from", fromCity);
            if (toCity)     p.set("to", toCity);
            if (departDate) p.set("date", departDate);
            p.set("adults", String(paxAdults));
            p.set("children", String(paxChildren));
            if (activeTab === "flight") {
                p.set("trip_type", tripType);
                if (tripType === "round_trip" && returnDate) p.set("return_date", returnDate);
            }
            router.push(`/${activeTab}s?${p.toString()}`);
        }
    };

    const TABS = [
        { id: "hotel",  label: "🏨 Khách sạn" },
        { id: "flight", label: "✈️ Máy bay"   },
        { id: "train",  label: "🚆 Tàu hỏa"   },
        { id: "bus",    label: "🚌 Xe khách"   },
    ] as const;

    return (
        <>

            <div className="sb-wrap">
                {/* Tabs */}
                <div className="sb-tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`sb-tab${activeTab === tab.id ? " active" : ""}`}
                            onClick={() => { setActiveTab(tab.id); setErrors({}); }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Fields */}
                <div className="sb-fields">
                    {activeTab === "hotel" ? (
                        <>
                            {/* Điểm đến */}
                            <div className="sb-field" style={{ flex: 2, minWidth: 180 }}>
                                <label className="sb-field-label">🔍 Điểm đến</label>
                                <DestinationInput
                                    value={hotelQuery}
                                    onChange={v => { setHotelQuery(v); if (v.trim()) setErrors(p => ({ ...p, hotelQuery: "" })); }}
                                    placeholder="Tên khách sạn hoặc thành phố..."
                                    cityMode
                                    inputStyle={{ height: "2.9rem", fontSize: "0.9rem", ...(errors.hotelQuery ? { borderColor: "#e74c3c", boxShadow: "0 0 0 3px rgba(231,76,60,0.12)" } : {}) }}
                                />
                                {errors.hotelQuery && <span className="sb-field-error">⚠ {errors.hotelQuery}</span>}
                            </div>
                            {/* Nhận phòng */}
                            <div className="sb-field">
                                <label className="sb-field-label">📅 Nhận phòng</label>
                                <input
                                    className="sb-input"
                                    type="date"
                                    value={effectiveCheckIn}
                                    min={clientToday}
                                    onChange={e => {
                                        const v = e.target.value;
                                        setCheckIn(v);
                                        if (!checkOut || checkOut <= v) {
                                            setCheckOut(addDays(v, 1));
                                        }
                                    }}
                                />
                            </div>
                            {/* Trả phòng */}
                            <div className="sb-field">
                                <label className="sb-field-label">📅 Trả phòng</label>
                                <input
                                    className="sb-input"
                                    type="date"
                                    value={effectiveCheckOut}
                                    min={effectiveCheckIn ? addDays(effectiveCheckIn, 1) : clientTomorrow}
                                    onChange={e => setCheckOut(e.target.value)}
                                />
                            </div>
                            {/* Khách & phòng */}
                            <div className="sb-field" style={{ minWidth: 220, position: "relative" }} ref={guestRef}>
                                <label className="sb-field-label">👥 Khách & Phòng</label>
                                <button className="sb-picker-btn" onClick={() => setGuestOpen(o => !o)}>
                                    <span>🛏 {guestSummary}</span>
                                    <span className="arrow">{guestOpen ? "▲" : "▼"}</span>
                                </button>
                                {guestOpen && (
                                    <div className="sb-dropdown">
                                        <div className="sb-drow">
                                            <div className="sb-drow-info">
                                                <span className="sb-drow-icon">🧑‍🤝‍🧑</span>
                                                <div><div className="sb-drow-label">Người lớn</div></div>
                                            </div>
                                            <div className="sb-counter">
                                                <button className="sb-cnt-btn" disabled={adults <= 1} onClick={() => handleSetAdults(Math.max(1, adults - 1))}>−</button>
                                                <span className="sb-cnt-val">{adults}</span>
                                                <button className="sb-cnt-btn" onClick={() => handleSetAdults(adults + 1)}>+</button>
                                            </div>
                                        </div>
                                        <div className="sb-drow">
                                            <div className="sb-drow-info">
                                                <span className="sb-drow-icon">🧒</span>
                                                <div>
                                                    <div className="sb-drow-label">Trẻ em</div>
                                                    <div className="sb-drow-sub">Dưới 18 tuổi</div>
                                                </div>
                                            </div>
                                            <div className="sb-counter">
                                                <button className="sb-cnt-btn" disabled={children <= 0} onClick={() => setChildren(c => Math.max(0, c - 1))}>−</button>
                                                <span className="sb-cnt-val">{children}</span>
                                                <button className="sb-cnt-btn" disabled={children >= 6} onClick={() => setChildren(c => Math.min(6, c + 1))}>+</button>
                                            </div>
                                        </div>
                                        <div className="sb-drow">
                                            <div className="sb-drow-info">
                                                <span className="sb-drow-icon">🛏</span>
                                                <div>
                                                    <div className="sb-drow-label">Phòng</div>
                                                    <div className="sb-drow-sub">Tối đa {maxRooms} phòng</div>
                                                </div>
                                            </div>
                                            <div className="sb-counter">
                                                <button className="sb-cnt-btn" disabled={rooms <= 1} onClick={() => setRooms(r => Math.max(1, r - 1))}>−</button>
                                                <span className="sb-cnt-val">{rooms}</span>
                                                <button className="sb-cnt-btn" disabled={rooms >= maxRooms} onClick={() => setRooms(r => Math.min(maxRooms, r + 1))}>+</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Trip type toggle — chỉ hiện cho tab máy bay */}
                            {activeTab === "flight" && (
                                <div style={{ width: "100%", marginBottom: "0.1rem" }}>
                                    <div style={{ display: "inline-flex", gap: "0.25rem", background: "#f0f4ff", borderRadius: "8px", padding: "3px" }}>
                                        <button
                                            style={{
                                                padding: "0.3rem 1rem", border: "none", borderRadius: "6px",
                                                fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", fontWeight: 500,
                                                cursor: "pointer", transition: "background 0.15s, color 0.15s",
                                                background: tripType === "one_way" ? "#0052cc" : "transparent",
                                                color: tripType === "one_way" ? "#fff" : "#6b8cbf",
                                            }}
                                            onClick={() => setTripType("one_way")}
                                        >
                                            Một chiều
                                        </button>
                                        <button
                                            style={{
                                                padding: "0.3rem 1rem", border: "none", borderRadius: "6px",
                                                fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", fontWeight: 500,
                                                cursor: "pointer", transition: "background 0.15s, color 0.15s",
                                                background: tripType === "round_trip" ? "#0052cc" : "transparent",
                                                color: tripType === "round_trip" ? "#fff" : "#6b8cbf",
                                            }}
                                            onClick={() => {
                                                setTripType("round_trip");
                                                if (!returnDate) setReturnDate(addDays(effectiveDepartDate, 2));
                                            }}
                                        >
                                            Khứ hồi
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/* Điểm đi */}
                            <div className="sb-field" style={{ flex: 1.2, minWidth: 160 }}>
                                <label className="sb-field-label">🛫 Điểm đi</label>
                                <DestinationInput
                                    value={fromCity}
                                    onChange={v => { setFromCity(v); if (v.trim()) setErrors(p => ({ ...p, fromCity: "" })); }}
                                    placeholder="Thành phố khởi hành..."
                                    cityMode
                                    inputStyle={{ height: "2.9rem", fontSize: "0.9rem", ...(errors.fromCity ? { borderColor: "#e74c3c", boxShadow: "0 0 0 3px rgba(231,76,60,0.12)" } : {}) }}
                                />
                                {errors.fromCity && <span className="sb-field-error">⚠ {errors.fromCity}</span>}
                            </div>
                            {/* Điểm đến */}
                            <div className="sb-field" style={{ flex: 1.2, minWidth: 160 }}>
                                <label className="sb-field-label">🛬 Điểm đến</label>
                                <DestinationInput
                                    value={toCity}
                                    onChange={v => { setToCity(v); if (v.trim()) setErrors(p => ({ ...p, toCity: "" })); }}
                                    placeholder="Thành phố đến..."
                                    cityMode
                                    inputStyle={{ height: "2.9rem", fontSize: "0.9rem", ...(errors.toCity ? { borderColor: "#e74c3c", boxShadow: "0 0 0 3px rgba(231,76,60,0.12)" } : {}) }}
                                />
                                {errors.toCity && <span className="sb-field-error">⚠ {errors.toCity}</span>}
                            </div>
                            {/* Ngày đi */}
                            <div className="sb-field">
                                <label className="sb-field-label">📅 Ngày đi</label>
                                <input
                                    className="sb-input"
                                    type="date"
                                    value={effectiveDepartDate}
                                    min={clientToday}
                                    onChange={e => {
                                        setDepartDate(e.target.value);
                                        if (returnDate && returnDate <= e.target.value)
                                            setReturnDate(addDays(e.target.value, 2));
                                    }}
                                />
                            </div>
                            {/* Ngày về — chỉ hiện khi khứ hồi và tab máy bay */}
                            {activeTab === "flight" && tripType === "round_trip" && (
                                <div className="sb-field">
                                    <label className="sb-field-label">📅 Ngày về</label>
                                    <input
                                        className="sb-input"
                                        type="date"
                                        value={returnDate}
                                        min={effectiveDepartDate ? addDays(effectiveDepartDate, 1) : clientToday}
                                        onChange={e => setReturnDate(e.target.value)}
                                        placeholder="Chọn ngày về"
                                    />
                                </div>
                            )}
                            {/* Hành khách */}
                            <div className="sb-field" style={{ minWidth: 200, position: "relative" }} ref={paxRef}>
                                <label className="sb-field-label">👥 Hành khách</label>
                                <button className="sb-picker-btn" onClick={() => setPaxOpen(o => !o)}>
                                    <span>🎫 {paxSummary}</span>
                                    <span className="arrow">{paxOpen ? "▲" : "▼"}</span>
                                </button>
                                {paxOpen && (
                                    <div className="sb-dropdown">
                                        <div className="sb-drow">
                                            <div className="sb-drow-info">
                                                <span className="sb-drow-icon">🧑‍🤝‍🧑</span>
                                                <div><div className="sb-drow-label">Người lớn</div></div>
                                            </div>
                                            <div className="sb-counter">
                                                <button className="sb-cnt-btn" disabled={paxAdults <= 1} onClick={() => setPaxAdults(n => Math.max(1, n - 1))}>−</button>
                                                <span className="sb-cnt-val">{paxAdults}</span>
                                                <button className="sb-cnt-btn" disabled={paxTotal >= 9} onClick={() => setPaxAdults(n => n + 1)}>+</button>
                                            </div>
                                        </div>
                                        <div className="sb-drow">
                                            <div className="sb-drow-info">
                                                <span className="sb-drow-icon">🧒</span>
                                                <div>
                                                    <div className="sb-drow-label">Trẻ em</div>
                                                    <div className="sb-drow-sub">Dưới 12 tuổi</div>
                                                </div>
                                            </div>
                                            <div className="sb-counter">
                                                <button className="sb-cnt-btn" disabled={paxChildren <= 0} onClick={() => setPaxChildren(n => Math.max(0, n - 1))}>−</button>
                                                <span className="sb-cnt-val">{paxChildren}</span>
                                                <button className="sb-cnt-btn" disabled={paxTotal >= 9} onClick={() => setPaxChildren(n => n + 1)}>+</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <button className="sb-btn" onClick={handleSearch} disabled={searching}>
                        {searching ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                                <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "sb-spin 0.7s linear infinite" }} />
                                Đang tìm...
                            </span>
                        ) : "🔍 Tìm ngay"}
                    </button>
                </div>
            </div>
        </>
    );
}
