"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import api from "@/lib/axios";
import DestinationInput from "@/components/ui/DestinationInput";

// ── Types ──────────────────────────────────────────────────────────
type Budget        = "under5m" | "5to10m" | "10to20m" | "over20m";
type Transport     = "flight" | "bus" | "self_drive" | "any";
type ItineraryType = "short" | "medium" | "long";

interface TrendingDest {
    destination_id: number;
    city:           string;
    name:           string;
    avg_rating:     number;
    min_price?:     number;
    image_url?:     string;
    trend_score:    number;
    booking_score:  number;
    interact_score: number;
    search_score:   number;
}

interface Suggestion {
    city:           string;
    match_score:    number;
    tagline:        string;
    why_match:      string;
    highlights:     string[];
    budget_note:    string;
    transport_tip:  string;
    itinerary:      string;
    destination_id?: number;
    image_url?:     string;
    min_price?:     number;
    avg_rating?:    number;
}

// ── Constants ──────────────────────────────────────────────────────
const INTERESTS = [
    { id: "resort",    label: "🏖️ Nghỉ dưỡng" },
    { id: "relax",     label: "🧘 Thư giãn" },
    { id: "culture",   label: "🏛️ Văn hoá - Lịch sử" },
    { id: "food",      label: "🍜 Ẩm thực" },
    { id: "adventure", label: "🧗 Mạo hiểm" },
    { id: "family",    label: "👨‍👩‍👧 Gia đình" },
    { id: "romantic",  label: "💑 Lãng mạn - Cặp đôi" },
];

const BUDGETS: { id: Budget; label: string; desc: string }[] = [
    { id: "under5m",  label: "< 5 triệu",   desc: "Tiết kiệm" },
    { id: "5to10m",   label: "5–10 triệu",  desc: "Thoải mái" },
    { id: "10to20m",  label: "10–20 triệu", desc: "Cao cấp" },
    { id: "over20m",  label: "> 20 triệu",  desc: "Sang trọng" },
];

const TRANSPORTS: { id: Transport; icon: string; label: string }[] = [
    { id: "flight",     icon: "✈️", label: "Máy bay" },
    { id: "bus",        icon: "🚌", label: "Xe khách" },
    { id: "self_drive", icon: "🚗", label: "Tự lái" },
    { id: "any",        icon: "🔄", label: "Linh hoạt" },
];

const ITINERARIES: { id: ItineraryType; label: string; desc: string }[] = [
    { id: "short",  label: "1–3 ngày",  desc: "Cuối tuần" },
    { id: "medium", label: "4–7 ngày",  desc: "Kỳ nghỉ" },
    { id: "long",   label: "> 7 ngày",  desc: "Dài ngày" },
];

const SCORE_COLOR = (s: number) =>
    s >= 90 ? "#00875a" : s >= 75 ? "#0052cc" : "#6b778c";

const TODAY = new Date().toISOString().split("T")[0];

// ── Component ──────────────────────────────────────────────────────
export default function TravelPlannerPage() {
    // Form state
    const [destination, setDestination] = useState("");
    const [departDate,  setDepartDate]  = useState("");
    const [returnDate,  setReturnDate]  = useState("");
    const [budget,      setBudget]      = useState<Budget | "">("");
    const [interests,   setInterests]   = useState<string[]>([]);
    const [people,      setPeople]      = useState(2);
    const [transport,   setTransport]   = useState<Transport | "">("");
    const [itinerary,   setItinerary]   = useState<ItineraryType | "">("");

    // Trending state
    const [trending,        setTrending]        = useState<TrendingDest[]>([]);
    const [trendingLoading, setTrendingLoading] = useState(true);

    useEffect(() => {
        api.get("/api/travel-planner/trending", { params: { limit: 8, days: 30 } })
            .then(res => setTrending(res.data))
            .catch(() => {})
            .finally(() => setTrendingLoading(false));
    }, []);

    // Result state
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState("");
    const [submitted,   setSubmitted]   = useState(false);

    const toggleInterest = (id: string) =>
        setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const handleSubmit = async () => {
        if (interests.length === 0) { setError("Vui lòng chọn ít nhất 1 sở thích."); return; }
        setError("");
        setLoading(true);
        setSubmitted(true);
        setSuggestions([]);
        try {
            const res = await api.post("/api/travel-planner/suggest", {
                destination:    destination || null,
                depart_date:    departDate  || null,
                return_date:    returnDate  || null,
                budget:         budget      || null,
                interests,
                people,
                transport:      transport   || null,
                itinerary_type: itinerary   || null,
            });
            setSuggestions(res.data);
        } catch {
            setError("Đã có lỗi xảy ra. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=DM+Sans:wght@300;400;500&display=swap');
                * { box-sizing: border-box; }
                .tp-root { min-height: 100vh; background: #f0f4ff; font-family: 'DM Sans', sans-serif; }

                /* Hero */
                .tp-hero { background: linear-gradient(135deg,#0035a0 0%,#0065ff 60%,#00c9a7 100%); padding: 3rem 1.5rem 2.5rem; text-align: center; color: #fff; }
                .tp-hero-icon { font-size: 3rem; margin-bottom: 0.75rem; }
                .tp-hero-title { font-family: 'Nunito',sans-serif; font-size: 2rem; font-weight: 900; margin-bottom: 0.5rem; }
                .tp-hero-sub { font-size: 1rem; opacity: 0.88; max-width: 520px; margin: 0 auto; line-height: 1.6; }

                /* Layout */
                .tp-body { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem 4rem; display: flex; gap: 2rem; align-items: flex-start; }
                .tp-form-col { width: 420px; flex-shrink: 0; }
                .tp-result-col { flex: 1; min-width: 0; }

                /* Card */
                .tp-card { background: #fff; border-radius: 16px; border: 1px solid #e8f0fe; padding: 1.5rem; margin-bottom: 1.25rem; }
                .tp-card-title { font-family: 'Nunito',sans-serif; font-size: 0.9rem; font-weight: 800; color: #1a3c6b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.4rem; }

                /* Input */
                .tp-input { width: 100%; border: 1.5px solid #dde3f0; border-radius: 10px; padding: 0.7rem 0.9rem; font-size: 0.9rem; font-family: 'DM Sans',sans-serif; color: #1a3c6b; outline: none; transition: border-color 0.2s; }
                .tp-input:focus { border-color: #0052cc; }
                .tp-date-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
                .tp-label { font-size: 0.72rem; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 0.3rem; }

                /* Interest tags */
                .tp-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
                .tp-tag { padding: 0.4rem 0.85rem; border-radius: 99px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1.5px solid #dde3f0; color: #6b778c; background: #f8f9ff; transition: all 0.15s; user-select: none; }
                .tp-tag:hover { border-color: #0052cc; color: #0052cc; }
                .tp-tag.active { background: #0052cc; color: #fff; border-color: #0052cc; }

                /* Budget options */
                .tp-budget-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
                .tp-budget-opt { border: 1.5px solid #dde3f0; border-radius: 12px; padding: 0.65rem 0.75rem; cursor: pointer; text-align: center; transition: all 0.15s; }
                .tp-budget-opt:hover { border-color: #0052cc; }
                .tp-budget-opt.active { border-color: #0052cc; background: #e8f0fe; }
                .tp-budget-label { font-size: 0.88rem; font-weight: 700; color: #1a3c6b; }
                .tp-budget-desc { font-size: 0.72rem; color: #6b8cbf; margin-top: 0.1rem; }

                /* People stepper */
                .tp-stepper { display: flex; align-items: center; gap: 0.75rem; }
                .tp-step-btn { width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid #dde3f0; background: #fff; font-size: 1.1rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #1a3c6b; transition: background 0.15s; }
                .tp-step-btn:hover { background: #f0f4ff; }
                .tp-step-val { font-size: 1.1rem; font-weight: 800; color: #1a3c6b; min-width: 2rem; text-align: center; }

                /* Transport */
                .tp-transport-row { display: flex; gap: 0.6rem; flex-wrap: wrap; }
                .tp-transport-opt { flex: 1; min-width: 80px; border: 1.5px solid #dde3f0; border-radius: 12px; padding: 0.6rem; text-align: center; cursor: pointer; transition: all 0.15s; }
                .tp-transport-opt:hover { border-color: #0052cc; }
                .tp-transport-opt.active { border-color: #0052cc; background: #e8f0fe; }
                .tp-transport-icon { font-size: 1.4rem; }
                .tp-transport-label { font-size: 0.72rem; font-weight: 600; color: #1a3c6b; margin-top: 0.2rem; }

                /* Itinerary */
                .tp-iter-row { display: flex; gap: 0.6rem; }
                .tp-iter-opt { flex: 1; border: 1.5px solid #dde3f0; border-radius: 12px; padding: 0.7rem 0.5rem; text-align: center; cursor: pointer; transition: all 0.15s; }
                .tp-iter-opt:hover { border-color: #0052cc; }
                .tp-iter-opt.active { border-color: #0052cc; background: #e8f0fe; }
                .tp-iter-label { font-size: 0.88rem; font-weight: 700; color: #1a3c6b; }
                .tp-iter-desc { font-size: 0.7rem; color: #6b8cbf; margin-top: 0.1rem; }

                /* Submit btn */
                .tp-submit { width: 100%; padding: 0.9rem; background: linear-gradient(135deg,#0035a0,#0065ff); color: #fff; border: none; border-radius: 12px; font-family: 'Nunito',sans-serif; font-size: 1rem; font-weight: 800; cursor: pointer; transition: opacity 0.15s, transform 0.15s; margin-top: 0.5rem; }
                .tp-submit:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
                .tp-submit:disabled { opacity: 0.6; cursor: not-allowed; }

                /* Error */
                .tp-error { background: #fff0ee; border: 1px solid #ffbdad; color: #bf2600; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.85rem; margin-bottom: 1rem; }

                /* Loading */
                .tp-loading { display: flex; flex-direction: column; align-items: center; padding: 3rem; gap: 1rem; }
                .tp-spinner { width: 48px; height: 48px; border: 4px solid #e8f0fe; border-top-color: #0052cc; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .tp-loading-text { font-size: 0.95rem; color: #6b8cbf; text-align: center; }

                /* Suggestion card */
                .tp-sug { background: #fff; border-radius: 20px; border: 1px solid #e8f0fe; overflow: hidden; margin-bottom: 1.5rem; box-shadow: 0 2px 16px rgba(0,82,204,0.07); }
                .tp-sug-img { position: relative; height: 180px; }
                .tp-sug-img-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7) 30%, transparent); }
                .tp-sug-img-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 4rem; }
                .tp-sug-img-city { position: absolute; bottom: 1rem; left: 1rem; color: #fff; }
                .tp-sug-city-name { font-family: 'Nunito',sans-serif; font-size: 1.4rem; font-weight: 900; line-height: 1; }
                .tp-sug-tagline { font-size: 0.82rem; opacity: 0.9; margin-top: 0.2rem; }
                .tp-sug-score { position: absolute; top: 1rem; right: 1rem; background: rgba(255,255,255,0.2); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.35); color: #fff; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 99px; }
                .tp-sug-body { padding: 1.25rem; }
                .tp-sug-section { margin-bottom: 1rem; }
                .tp-sug-section-title { font-size: 0.72rem; font-weight: 700; color: #6b778c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.4rem; }
                .tp-sug-text { font-size: 0.88rem; color: #4a5568; line-height: 1.65; }
                .tp-highlights { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.4rem; }
                .tp-highlight { background: #f0f4ff; color: #0052cc; font-size: 0.78rem; font-weight: 600; padding: 0.2rem 0.65rem; border-radius: 99px; border: 1px solid #c8d8ff; }
                .tp-sug-footer { display: flex; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap; }
                .tp-sug-info { flex: 1; background: #f8faff; border-radius: 10px; padding: 0.6rem 0.75rem; }
                .tp-sug-info-label { font-size: 0.68rem; font-weight: 700; color: #6b778c; text-transform: uppercase; letter-spacing: 0.4px; }
                .tp-sug-info-val { font-size: 0.82rem; color: #1a3c6b; font-weight: 500; margin-top: 0.15rem; line-height: 1.4; }
                .tp-sug-actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
                .tp-sug-btn-primary { flex: 1; padding: 0.65rem; background: linear-gradient(135deg,#0052cc,#0065ff); color: #fff; border: none; border-radius: 10px; font-family: 'Nunito',sans-serif; font-size: 0.88rem; font-weight: 700; cursor: pointer; text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; transition: opacity 0.15s; }
                .tp-sug-btn-primary:hover { opacity: 0.9; }
                .tp-sug-btn-sec { padding: 0.65rem 1rem; background: #f0f4ff; color: #0052cc; border: 1.5px solid #c8d8ff; border-radius: 10px; font-family: 'Nunito',sans-serif; font-size: 0.88rem; font-weight: 700; cursor: pointer; text-decoration: none; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
                .tp-sug-btn-sec:hover { background: #dde9ff; }

                /* Empty state */
                .tp-empty { display: flex; flex-direction: column; align-items: center; padding: 3rem; text-align: center; color: #6b8cbf; }
                .tp-empty-icon { font-size: 3rem; margin-bottom: 1rem; }

                /* Trending */
                .tp-trend { background: #fff; border-bottom: 1px solid #e8f0fe; padding: 1.5rem 0; }
                .tp-trend-inner { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; }
                .tp-trend-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
                .tp-trend-title { font-family: 'Nunito',sans-serif; font-size: 1.1rem; font-weight: 800; color: #1a3c6b; display: flex; align-items: center; gap: 0.5rem; }
                .tp-trend-sub { font-size: 0.78rem; color: #6b8cbf; margin-top: 0.1rem; }
                .tp-trend-scroll { display: flex; gap: 0.85rem; overflow-x: auto; padding-bottom: 0.5rem; scroll-snap-type: x mandatory; scrollbar-width: thin; scrollbar-color: #c8d8ff transparent; }
                .tp-trend-scroll::-webkit-scrollbar { height: 4px; }
                .tp-trend-scroll::-webkit-scrollbar-thumb { background: #c8d8ff; border-radius: 99px; }
                .tp-trend-item { flex-shrink: 0; width: 160px; scroll-snap-align: start; cursor: pointer; text-decoration: none; }
                .tp-trend-img { position: relative; height: 110px; border-radius: 14px; overflow: hidden; }
                .tp-trend-img-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.65) 40%, transparent); }
                .tp-trend-city { position: absolute; bottom: 0.5rem; left: 0.6rem; color: #fff; font-family: 'Nunito',sans-serif; font-size: 0.88rem; font-weight: 800; }
                .tp-trend-badge { position: absolute; top: 0.4rem; right: 0.4rem; background: rgba(255,255,255,0.2); backdrop-filter: blur(6px); color: #fff; font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 99px; border: 1px solid rgba(255,255,255,0.35); }
                .tp-trend-info { padding: 0.45rem 0.1rem 0; }
                .tp-trend-price { font-size: 0.75rem; color: #0052cc; font-weight: 700; }
                .tp-trend-rating { font-size: 0.72rem; color: #6b8cbf; margin-top: 0.1rem; }
                .tp-trend-skel { width: 160px; flex-shrink: 0; }
                .tp-trend-skel-img { height: 110px; border-radius: 14px; background: linear-gradient(90deg,#f0f4ff 25%,#e8f0fe 50%,#f0f4ff 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
                @keyframes shimmer { to { background-position: -200% 0; } }

                @media (max-width: 768px) {
                    .tp-body { flex-direction: column; }
                    .tp-form-col { width: 100%; }
                    .tp-hero-title { font-size: 1.5rem; }
                }
            `}</style>

            <div className="tp-root">
                {/* Hero */}
                <div className="tp-hero">
                    <div className="tp-hero-icon">🗺️</div>
                    <h1 className="tp-hero-title">Gợi ý Hành Trình Du Lịch</h1>
                    <p className="tp-hero-sub">
                        Điền sở thích của bạn — AI sẽ gợi ý những điểm đến hoàn hảo nhất chỉ trong vài giây
                    </p>
                </div>

                {/* ── TRENDING SECTION ── */}
                <div className="tp-trend">
                    <div className="tp-trend-inner">
                        <div className="tp-trend-header">
                            <div>
                                <div className="tp-trend-title">
                                    🔥 Đang hot trong 30 ngày qua
                                </div>
                                <div className="tp-trend-sub">Dựa trên lượt đặt phòng, tìm kiếm và lượt xem của người dùng</div>
                            </div>
                        </div>

                        <div className="tp-trend-scroll">
                            {trendingLoading
                                ? Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="tp-trend-skel">
                                        <div className="tp-trend-skel-img" />
                                        <div style={{ height: 12, marginTop: 8, borderRadius: 6, background: "#f0f4ff", width: "70%" }} />
                                        <div style={{ height: 10, marginTop: 5, borderRadius: 6, background: "#f0f4ff", width: "50%" }} />
                                    </div>
                                ))
                                : trending.map((dest, idx) => (
                                    <TrendingCard key={dest.destination_id} dest={dest} rank={idx + 1} />
                                ))
                            }
                        </div>
                    </div>
                </div>

                <div className="tp-body">
                    {/* ── FORM COLUMN ── */}
                    <div className="tp-form-col">

                        {/* Địa điểm */}
                        <div className="tp-card">
                            <div className="tp-card-title">📍 Địa điểm mong muốn</div>
                            <DestinationInput
                                value={destination}
                                onChange={setDestination}
                                placeholder="VD: Đà Nẵng, Phú Quốc... (để trống = AI tự chọn)"
                                cityMode
                            />
                        </div>

                        {/* Ngày đi / về */}
                        <div className="tp-card">
                            <div className="tp-card-title">📅 Thời gian</div>
                            <div className="tp-date-row">
                                <div>
                                    <div className="tp-label">Ngày đi</div>
                                    <input type="date" className="tp-input" value={departDate} min={TODAY}
                                        onChange={e => setDepartDate(e.target.value)} />
                                </div>
                                <div>
                                    <div className="tp-label">Ngày về</div>
                                    <input type="date" className="tp-input" value={returnDate} min={departDate || TODAY}
                                        onChange={e => setReturnDate(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Ngân sách */}
                        <div className="tp-card">
                            <div className="tp-card-title">💰 Ngân sách / người</div>
                            <div className="tp-budget-grid">
                                {BUDGETS.map(b => (
                                    <div key={b.id}
                                        className={`tp-budget-opt${budget === b.id ? " active" : ""}`}
                                        onClick={() => setBudget(prev => prev === b.id ? "" : b.id)}
                                    >
                                        <div className="tp-budget-label">{b.label}</div>
                                        <div className="tp-budget-desc">{b.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sở thích */}
                        <div className="tp-card">
                            <div className="tp-card-title">❤️ Sở thích <span style={{ color: "#c0392b", fontSize: "0.8rem" }}>*</span></div>
                            <div className="tp-tags">
                                {INTERESTS.map(t => (
                                    <div key={t.id}
                                        className={`tp-tag${interests.includes(t.id) ? " active" : ""}`}
                                        onClick={() => toggleInterest(t.id)}
                                    >
                                        {t.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Số người */}
                        <div className="tp-card">
                            <div className="tp-card-title">👥 Số người tham gia</div>
                            <div className="tp-stepper">
                                <button className="tp-step-btn" onClick={() => setPeople(p => Math.max(1, p - 1))}>−</button>
                                <span className="tp-step-val">{people}</span>
                                <button className="tp-step-btn" onClick={() => setPeople(p => Math.min(50, p + 1))}>+</button>
                                <span style={{ fontSize: "0.85rem", color: "#6b8cbf", marginLeft: "0.5rem" }}>
                                    {people === 1 ? "1 người" : `${people} người`}
                                </span>
                            </div>
                        </div>

                        {/* Phương tiện */}
                        <div className="tp-card">
                            <div className="tp-card-title">🚗 Phương tiện ưu tiên</div>
                            <div className="tp-transport-row">
                                {TRANSPORTS.map(t => (
                                    <div key={t.id}
                                        className={`tp-transport-opt${transport === t.id ? " active" : ""}`}
                                        onClick={() => setTransport(prev => prev === t.id ? "" : t.id)}
                                    >
                                        <div className="tp-transport-icon">{t.icon}</div>
                                        <div className="tp-transport-label">{t.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Loại lịch trình */}
                        <div className="tp-card">
                            <div className="tp-card-title">🗓️ Loại lịch trình</div>
                            <div className="tp-iter-row">
                                {ITINERARIES.map(it => (
                                    <div key={it.id}
                                        className={`tp-iter-opt${itinerary === it.id ? " active" : ""}`}
                                        onClick={() => setItinerary(prev => prev === it.id ? "" : it.id)}
                                    >
                                        <div className="tp-iter-label">{it.label}</div>
                                        <div className="tp-iter-desc">{it.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {error && <div className="tp-error">⚠️ {error}</div>}

                        <button className="tp-submit" onClick={handleSubmit} disabled={loading}>
                            {loading ? "⏳ AI đang phân tích..." : "✨ Gợi ý hành trình cho tôi"}
                        </button>
                    </div>

                    {/* ── RESULT COLUMN ── */}
                    <div className="tp-result-col">
                        {!submitted && (
                            <div className="tp-empty">
                                <div className="tp-empty-icon">🌏</div>
                                <p style={{ fontSize: "1rem", fontWeight: 600, color: "#1a3c6b" }}>
                                    Điền thông tin và nhấn Gợi ý
                                </p>
                                <p style={{ fontSize: "0.85rem", marginTop: "0.4rem" }}>
                                    AI sẽ phân tích sở thích và gợi ý những điểm đến phù hợp nhất với bạn
                                </p>
                            </div>
                        )}

                        {loading && (
                            <div className="tp-loading">
                                <div className="tp-spinner" />
                                <div className="tp-loading-text">
                                    <strong>AI đang phân tích...</strong><br />
                                    Đang tìm điểm đến phù hợp với sở thích của bạn
                                </div>
                            </div>
                        )}

                        {!loading && suggestions.map((s, idx) => (
                            <SuggestionCard key={idx} s={s} />
                        ))}

                        {!loading && submitted && suggestions.length === 0 && !error && (
                            <div className="tp-empty">
                                <div className="tp-empty-icon">😕</div>
                                <p style={{ fontWeight: 600, color: "#1a3c6b" }}>Không tìm được gợi ý phù hợp</p>
                                <p style={{ fontSize: "0.85rem", marginTop: "0.4rem" }}>Thử thay đổi sở thích hoặc địa điểm</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Trending Card Sub-component ───────────────────────────────────
const TREND_GRADS = [
    "from-blue-500 to-cyan-400",
    "from-orange-400 to-pink-500",
    "from-violet-500 to-purple-400",
    "from-emerald-500 to-teal-400",
    "from-rose-500 to-orange-400",
    "from-indigo-500 to-blue-400",
    "from-amber-400 to-yellow-400",
    "from-cyan-500 to-blue-400",
];

function TrendingCard({ dest, rank }: { dest: TrendingDest; rank: number }) {
    const grad = TREND_GRADS[(rank - 1) % TREND_GRADS.length];
    const isTop3 = rank <= 3;

    return (
        <Link
            href={`/hotels?destination_id=${dest.destination_id}&search=${encodeURIComponent(dest.city)}`}
            className="tp-trend-item"
        >
            <div className="tp-trend-img">
                {dest.image_url ? (
                    <Image src={dest.image_url} alt={dest.city} fill style={{ objectFit: "cover" }} sizes="160px" />
                ) : (
                    <div style={{ width: "100%", height: "100%" }}
                        className={`bg-linear-to-br ${grad}`} />
                )}
                <div className="tp-trend-img-overlay" />

                {/* Rank badge */}
                {isTop3 && (
                    <div className="tp-trend-badge">
                        {rank === 1 ? "🥇 #1" : rank === 2 ? "🥈 #2" : "🥉 #3"}
                    </div>
                )}

                <div className="tp-trend-city">{dest.city}</div>
            </div>

            <div className="tp-trend-info">
                {dest.min_price ? (
                    <div className="tp-trend-price">Từ {Number(dest.min_price).toLocaleString("vi-VN")}₫</div>
                ) : null}
                <div className="tp-trend-rating">
                    {dest.avg_rating > 0 && `⭐ ${Number(dest.avg_rating).toFixed(1)}`}
                    {dest.trend_score > 0 && (
                        <span style={{ marginLeft: "0.4rem", color: "#e84118", fontWeight: 700 }}>
                            🔥 {dest.trend_score}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}

// ── Suggestion Card Sub-component ─────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string {
    try {
        const raw = localStorage.getItem("auth-storage");
        if (raw) return JSON.parse(raw)?.state?.token ?? "";
    } catch { }
    return "";
}

function SuggestionCard({ s }: { s: Suggestion }) {
    const GRAD = ["from-blue-400 to-emerald-400", "from-orange-400 to-pink-500", "from-purple-500 to-indigo-500"];
    const gradIdx = Math.abs(s.city.charCodeAt(0)) % GRAD.length;
    const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);

    const sendFeedback = async (action: "like" | "dislike") => {
        setFeedback(action);
        const token = getToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        try {
            await fetch(`${API_BASE}/api/chat/feedback`, {
                method: "POST",
                headers,
                body: JSON.stringify({ city: s.city, action }),
            });
        } catch { }
    };

    return (
        <div className="tp-sug">
            {/* Image / Gradient header */}
            <div className="tp-sug-img">
                {s.image_url ? (
                    <Image src={s.image_url} alt={s.city} fill style={{ objectFit: "cover" }} sizes="600px" />
                ) : (
                    <div className={`tp-sug-img-fallback bg-linear-to-br ${GRAD[gradIdx]}`}>🏙️</div>
                )}
                <div className="tp-sug-img-overlay" />
                <div className="tp-sug-score">⚡ {s.match_score}% phù hợp</div>
                <div className="tp-sug-img-city">
                    <div className="tp-sug-city-name">{s.city}</div>
                    <div className="tp-sug-tagline">{s.tagline}</div>
                </div>
            </div>

            <div className="tp-sug-body">
                {/* Why match */}
                <div className="tp-sug-section">
                    <div className="tp-sug-section-title">✅ Tại sao phù hợp</div>
                    <p className="tp-sug-text">{s.why_match}</p>
                </div>

                {/* Highlights */}
                {s.highlights?.length > 0 && (
                    <div className="tp-sug-section">
                        <div className="tp-sug-section-title">🌟 Điểm nổi bật</div>
                        <div className="tp-highlights">
                            {s.highlights.map((h, i) => (
                                <span key={i} className="tp-highlight">{h}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Itinerary */}
                {s.itinerary && (
                    <div className="tp-sug-section">
                        <div className="tp-sug-section-title">📋 Lịch trình mẫu</div>
                        <p className="tp-sug-text" style={{ whiteSpace: "pre-line" }}>{s.itinerary}</p>
                    </div>
                )}

                {/* Info grid */}
                <div className="tp-sug-footer">
                    {s.budget_note && (
                        <div className="tp-sug-info">
                            <div className="tp-sug-info-label">💰 Ngân sách</div>
                            <div className="tp-sug-info-val">{s.budget_note}</div>
                        </div>
                    )}
                    {s.transport_tip && (
                        <div className="tp-sug-info">
                            <div className="tp-sug-info-label">🚗 Di chuyển</div>
                            <div className="tp-sug-info-val">{s.transport_tip}</div>
                        </div>
                    )}
                    {s.min_price && (
                        <div className="tp-sug-info">
                            <div className="tp-sug-info-label">🏨 Khách sạn từ</div>
                            <div className="tp-sug-info-val">{Number(s.min_price).toLocaleString("vi-VN")}₫/đêm</div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="tp-sug-actions">
                    {s.destination_id ? (
                        <Link
                            href={`/hotels?destination_id=${s.destination_id}&search=${encodeURIComponent(s.city)}`}
                            className="tp-sug-btn-primary"
                        >
                            🏨 Xem khách sạn tại {s.city}
                        </Link>
                    ) : (
                        <Link
                            href={`/hotels?search=${encodeURIComponent(s.city)}`}
                            className="tp-sug-btn-primary"
                        >
                            🏨 Xem khách sạn tại {s.city}
                        </Link>
                    )}
                    <Link href={`/flights?search=${encodeURIComponent(s.city)}`} className="tp-sug-btn-sec">
                        ✈️ Vé bay
                    </Link>
                </div>

                {/* Feedback */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #f0f4ff" }}>
                    <span style={{ fontSize: "0.78rem", color: "#6b778c" }}>Gợi ý này có phù hợp với bạn không?</span>
                    <button
                        onClick={() => sendFeedback("like")}
                        style={{
                            border: "1.5px solid", borderRadius: 99, padding: "0.25rem 0.85rem",
                            fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", transition: "all .15s",
                            borderColor: feedback === "like" ? "#22c55e" : "#d1d5db",
                            background: feedback === "like" ? "#dcfce7" : "#fff",
                            color: feedback === "like" ? "#16a34a" : "#6b778c",
                        }}
                    >
                        👍 Thích{feedback === "like" && " ✓"}
                    </button>
                    <button
                        onClick={() => sendFeedback("dislike")}
                        style={{
                            border: "1.5px solid", borderRadius: 99, padding: "0.25rem 0.85rem",
                            fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", transition: "all .15s",
                            borderColor: feedback === "dislike" ? "#ef4444" : "#d1d5db",
                            background: feedback === "dislike" ? "#fee2e2" : "#fff",
                            color: feedback === "dislike" ? "#dc2626" : "#6b778c",
                        }}
                    >
                        👎 Không thích{feedback === "dislike" && " ✓"}
                    </button>
                </div>
            </div>
        </div>
    );
}
