"use client";

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
    const [paxAdults, setPaxAdults]     = useState(1);
    const [paxChildren, setPaxChildren] = useState(0);
    const [paxOpen, setPaxOpen]         = useState(false);
    const paxRef = useRef<HTMLDivElement>(null);

    // Giá trị hiệu dụng: dùng state nếu user đã chọn, không thì fallback về ngày client
    const effectiveCheckIn   = checkIn    || clientToday;
    const effectiveCheckOut  = checkOut   || clientTomorrow;
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
            logSearch(hotelQuery);
            const p = new URLSearchParams();
            if (hotelQuery) p.set("search", hotelQuery);
            if (checkIn)    p.set("check_in", checkIn);
            if (checkOut)   p.set("check_out", checkOut);
            p.set("adults", String(adults));
            p.set("children", String(children));
            p.set("rooms", String(rooms));
            router.push(`/hotels?${p.toString()}`);
        } else {
            logSearch(`${fromCity} → ${toCity}`);
            const p = new URLSearchParams();
            if (fromCity)   p.set("from", fromCity);
            if (toCity)     p.set("to", toCity);
            if (departDate) p.set("date", departDate);
            p.set("adults", String(paxAdults));
            p.set("children", String(paxChildren));
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
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

                .sb-wrap {
                    background: #fff;
                    border-radius: 20px;
                    box-shadow: 0 12px 48px rgba(0,0,0,0.22);
                    overflow: visible;
                    width: 100%;
                    max-width: 900px;
                    margin: 0 auto;
                    font-family: 'DM Sans', sans-serif;
                }

                /* ── TABS ── */
                .sb-tabs {
                    display: flex;
                    border-bottom: 1.5px solid #e8f0fe;
                    padding: 0 1.25rem;
                    overflow-x: auto;
                    scrollbar-width: none;
                }
                .sb-tabs::-webkit-scrollbar { display: none; }
                .sb-tab {
                    padding: 0.85rem 1.25rem;
                    font-size: 0.88rem; font-weight: 500;
                    color: #6b8cbf; background: none; border: none;
                    border-bottom: 2.5px solid transparent;
                    cursor: pointer; white-space: nowrap;
                    transition: color 0.18s, border-color 0.18s;
                    margin-bottom: -1.5px;
                }
                .sb-tab:hover { color: #0052cc; }
                .sb-tab.active { color: #0052cc; font-weight: 700; border-bottom-color: #0052cc; }

                /* ── FIELDS ROW ── */
                .sb-fields {
                    display: flex; flex-wrap: wrap;
                    gap: 0.75rem; align-items: flex-end;
                    padding: 1.1rem 1.25rem 1.25rem;
                }
                .sb-field {
                    display: flex; flex-direction: column; gap: 0.3rem;
                    flex: 1; min-width: 140px;
                }
                .sb-field-label {
                    font-size: 0.7rem; font-weight: 700;
                    color: #6b778c; text-transform: uppercase; letter-spacing: 0.5px;
                }
                .sb-input {
                    border: 1.5px solid #dde3f0; border-radius: 10px;
                    padding: 0.68rem 0.9rem; font-size: 0.9rem;
                    font-family: 'DM Sans', sans-serif; color: #1a3c6b;
                    outline: none; width: 100%; box-sizing: border-box;
                    transition: border-color 0.18s, box-shadow 0.18s;
                    background: #fff;
                }
                .sb-input:focus {
                    border-color: #0052cc;
                    box-shadow: 0 0 0 3px rgba(0,82,204,0.1);
                }
                .sb-input::placeholder { color: #b0bcd8; font-weight: 300; }

                /* ── GUEST / PAX BUTTON ── */
                .sb-picker-btn {
                    width: 100%; border: 1.5px solid #dde3f0; border-radius: 10px;
                    padding: 0.68rem 0.9rem; font-size: 0.88rem;
                    font-family: 'DM Sans', sans-serif; color: #1a3c6b;
                    background: #fff; cursor: pointer; text-align: left;
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 0.4rem; white-space: nowrap; box-sizing: border-box;
                    transition: border-color 0.18s, box-shadow 0.18s;
                }
                .sb-picker-btn:hover { border-color: #0052cc; box-shadow: 0 0 0 3px rgba(0,82,204,0.08); }
                .sb-picker-btn .arrow { font-size: 0.65rem; color: #6b8cbf; flex-shrink: 0; }

                /* ── DROPDOWN ── */
                .sb-dropdown {
                    position: absolute; top: calc(100% + 6px); left: 0;
                    min-width: 290px; background: #fff;
                    border-radius: 14px; border: 1.5px solid #dde3f0;
                    box-shadow: 0 12px 40px rgba(0,52,128,0.18);
                    padding: 0.3rem 0; z-index: 9999;
                }
                .sb-drow {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 0.8rem 1.15rem;
                    border-bottom: 1px solid #f0f4ff;
                }
                .sb-drow:last-child { border-bottom: none; }
                .sb-drow-info { display: flex; align-items: center; gap: 0.65rem; flex: 1; }
                .sb-drow-icon { font-size: 1.3rem; flex-shrink: 0; }
                .sb-drow-label { font-size: 0.9rem; font-weight: 600; color: #1a3c6b; }
                .sb-drow-sub { font-size: 0.72rem; color: #6b8cbf; margin-top: 0.1rem; }
                .sb-counter { display: flex; align-items: center; gap: 0.65rem; flex-shrink: 0; }
                .sb-cnt-btn {
                    width: 32px; height: 32px; border-radius: 50%;
                    border: 2px solid #0052cc; background: #0052cc; color: #fff;
                    font-size: 1.1rem; font-weight: 700; line-height: 1;
                    cursor: pointer; display: flex; align-items: center; justify-content: center;
                    transition: opacity 0.15s; flex-shrink: 0;
                }
                .sb-cnt-btn:disabled { background: #e8ecf8; border-color: #e8ecf8; color: #b0bcd8; cursor: not-allowed; }
                .sb-cnt-btn:not(:disabled):hover { opacity: 0.85; }
                .sb-cnt-val { font-size: 1rem; font-weight: 700; color: #1a3c6b; min-width: 22px; text-align: center; }

                /* ── SEARCH BUTTON ── */
                .sb-btn {
                    padding: 0.75rem 1.6rem;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; border: none; border-radius: 10px;
                    font-family: 'Nunito', sans-serif; font-size: 0.95rem; font-weight: 800;
                    cursor: pointer; white-space: nowrap; flex-shrink: 0;
                    transition: opacity 0.15s, transform 0.15s;
                    align-self: flex-end;
                }
                .sb-btn:hover { opacity: 0.9; transform: translateY(-1px); }

                @media (max-width: 640px) {
                    .sb-fields { flex-direction: column; }
                    .sb-field { min-width: unset; width: 100%; }
                }
            `}</style>

            <div className="sb-wrap">
                {/* Tabs */}
                <div className="sb-tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`sb-tab${activeTab === tab.id ? " active" : ""}`}
                            onClick={() => setActiveTab(tab.id)}
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
                                    onChange={setHotelQuery}
                                    placeholder="Tên khách sạn hoặc thành phố..."
                                    cityMode
                                    inputStyle={{ height: "2.9rem", fontSize: "0.9rem" }}
                                />
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
                                        if (checkOut && checkOut <= v) {
                                            const d = new Date(v);
                                            d.setDate(d.getDate() + 1);
                                            setCheckOut(d.toISOString().split("T")[0]);
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
                            {/* Điểm đi */}
                            <div className="sb-field" style={{ flex: 1.2, minWidth: 160 }}>
                                <label className="sb-field-label">🛫 Điểm đi</label>
                                <DestinationInput
                                    value={fromCity}
                                    onChange={setFromCity}
                                    placeholder="Thành phố khởi hành..."
                                    cityMode
                                    inputStyle={{ height: "2.9rem", fontSize: "0.9rem" }}
                                />
                            </div>
                            {/* Điểm đến */}
                            <div className="sb-field" style={{ flex: 1.2, minWidth: 160 }}>
                                <label className="sb-field-label">🛬 Điểm đến</label>
                                <DestinationInput
                                    value={toCity}
                                    onChange={setToCity}
                                    placeholder="Thành phố đến..."
                                    cityMode
                                    inputStyle={{ height: "2.9rem", fontSize: "0.9rem" }}
                                />
                            </div>
                            {/* Ngày đi */}
                            <div className="sb-field">
                                <label className="sb-field-label">📅 Ngày đi</label>
                                <input
                                    className="sb-input"
                                    type="date"
                                    value={effectiveDepartDate}
                                    min={clientToday}
                                    onChange={e => setDepartDate(e.target.value)}
                                />
                            </div>
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

                    <button className="sb-btn" onClick={handleSearch}>
                        🔍 Tìm ngay
                    </button>
                </div>
            </div>
        </>
    );
}
