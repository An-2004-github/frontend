"use client";

import "@/styles/hotels.css";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import HotelList from "@/components/hotel/HotelList";
import { Hotel } from "@/types/hotel";
import { hotelService } from "@/services/hotelService";
import { promotionService } from "@/services/promotionService";
import { Promotion } from "@/types/promotion";
import DestinationInput from "@/components/ui/DestinationInput";

function localDate(offsetDays = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

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

const AMENITIES_LIST = [
    { label: "WiFi miễn phí", value: "WiFi", icon: "📶" },
    { label: "Hồ bơi", value: "Hồ bơi", icon: "🏊" },
    { label: "Bãi đỗ xe", value: "Bãi đỗ xe", icon: "🅿️" },
    { label: "Bữa sáng", value: "Bữa sáng", icon: "🍳" },
    { label: "Gym", value: "Gym", icon: "💪" },
    { label: "Spa", value: "Spa", icon: "💆" },
    { label: "Điều hòa", value: "Điều hòa", icon: "❄️" },
    { label: "Nhà hàng", value: "Nhà hàng", icon: "🍽️" },
];

const POPULAR_CITIES_HP = [
    { city: "Hà Nội", emoji: "🏛️", label: "Thủ đô ngàn năm" },
    { city: "TP. Hồ Chí Minh", emoji: "🌆", label: "Thành phố sôi động" },
    { city: "Đà Nẵng", emoji: "🌊", label: "Thành phố đáng sống" },
    { city: "Hội An", emoji: "🏮", label: "Phố cổ di sản" },
    { city: "Nha Trang", emoji: "🏖️", label: "Thiên đường biển" },
    { city: "Đà Lạt", emoji: "🌸", label: "Thành phố ngàn hoa" },
    { city: "Phú Quốc", emoji: "🏝️", label: "Đảo ngọc nhiệt đới" },
    { city: "Huế", emoji: "🏯", label: "Cố đô lịch sử" },
];

export default function HotelsPage() {
    // Data
    const [topHotels, setTopHotels] = useState<Hotel[]>([]);
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [promos, setPromos] = useState<Promotion[]>([]);

    // Loading states
    const [loadingTop, setLoadingTop] = useState(true);
    const [loadingHotels, setLoadingHotels] = useState(false);

    // Filter state
    const [searchInput, setSearchInput] = useState("");
    const [searchError, setSearchError] = useState("");
    const [search, setSearch] = useState("");
    const [priceIdx, setPriceIdx] = useState(0);
    const [ratingIdx, setRatingIdx] = useState(0);
    const [sortVal, setSortVal] = useState("rating");
    const [refundFilter, setRefundFilter] = useState<"all" | "refundable" | "non_refundable">("all");
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [selectedCity, setSelectedCity] = useState<string | null>(null);
    const [checkIn, setCheckIn] = useState(() => localDate(0));
    const [checkOut, setCheckOut] = useState(() => {
        return localDate(1);
    });
    const [showFilter, setShowFilter] = useState(false);

    // Guest picker
    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);
    const [rooms, setRooms] = useState(1);
    const [guestOpen, setGuestOpen] = useState(false);
    const guestRef = useRef<HTMLDivElement>(null);

    // Max rooms = số người lớn (mỗi người lớn tối đa 1 phòng riêng)
    const maxRooms = adults;
    // Guests per room (rounded up) — used to filter hotels
    const guestsPerRoom = Math.ceil((adults + children) / rooms);

    // Đóng guest picker khi click ngoài
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (guestRef.current && !guestRef.current.contains(e.target as Node))
                setGuestOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const guestSummary = [
        `${adults} người lớn`,
        ...(children > 0 ? [`${children} trẻ em`] : []),
        `${rooms} phòng`,
    ].join(", ");

    const handleSetAdults = (next: number) => {
        setAdults(next);
        if (rooms > next) setRooms(next);
    };

    const listRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();

    // ── Init from URL parameters → auto search ───────────────────
    useEffect(() => {
        const qSearch = searchParams?.get("search");
        const qDestId = searchParams?.get("destination_id");

        if (!qSearch && !qDestId) return;

        if (qSearch) { setSearchInput(qSearch); setSearch(qSearch); setSelectedCity(qSearch); }
        const qCheckIn = searchParams?.get("check_in");
        const qCheckOut = searchParams?.get("check_out");
        if (qCheckIn) setCheckIn(qCheckIn);
        if (qCheckOut) setCheckOut(qCheckOut);
        setShowFilter(true);

        // Auto-fetch ngay lập tức với params từ URL
        setLoadingHotels(true);
        hotelService.getHotels({
            search: qSearch || undefined,
            destination_id: qDestId ? Number(qDestId) : undefined,
            sort: "rating",
            min_guests: guestsPerRoom,
        }).then(setHotels).catch(() => setHotels([])).finally(() => {
            setLoadingHotels(false);
            setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // ── Fetch top rated on mount ──────────────────────────────────
    useEffect(() => {
        hotelService.getHotels({ sort: "rating", limit: 6 })
            .then(setTopHotels).finally(() => setLoadingTop(false));

        promotionService.getPromotions("hotel")
            .then(setPromos).catch(() => { });
    }, []);

    const fetchAbortRef = useRef<AbortController | null>(null);

    // ── Fetch filtered hotels ─────────────────────────────────────
    const fetchHotels = useCallback(async (keyword?: string) => {
        fetchAbortRef.current?.abort();
        const controller = new AbortController();
        fetchAbortRef.current = controller;
        setLoadingHotels(true);
        try {
            const price = PRICE_OPTIONS[priceIdx];
            const data = await hotelService.getHotels({
                search: keyword || undefined,
                min_price: price.min,
                max_price: price.max,
                sort: sortVal as "rating" | "price_asc" | "price_desc",
                min_guests: guestsPerRoom,
            }, controller.signal);
            let filtered = data;
            const minRating = RATING_OPTIONS[ratingIdx].min;
            if (minRating > 0) filtered = filtered.filter(h => (h.avg_rating ?? 0) >= minRating);
            if (refundFilter === "refundable") filtered = filtered.filter(h => h.allows_refund === true);
            if (refundFilter === "non_refundable") filtered = filtered.filter(h => h.allows_refund === false);
            if (selectedAmenities.length > 0) {
                filtered = filtered.filter(h => {
                    const hAmens: string[] = Array.isArray(h.amenities) ? h.amenities : [];
                    return selectedAmenities.every(a =>
                        hAmens.some(ha => ha.toLowerCase().includes(a.toLowerCase()))
                    );
                });
            }
            setHotels(filtered);
        } catch (err) {
            if ((err as { name?: string })?.name === "CanceledError" || (err as { name?: string })?.name === "AbortError") return;
            setHotels([]);
        } finally {
            setLoadingHotels(false);
        }
    }, [priceIdx, ratingIdx, sortVal, guestsPerRoom, refundFilter, selectedAmenities]);

    // Tự động re-fetch khi filter/sort thay đổi (chỉ khi đã tìm kiếm)
    useEffect(() => {
        if (!showFilter) return;
        fetchHotels(search);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [priceIdx, ratingIdx, sortVal, guestsPerRoom, refundFilter, selectedAmenities]);

    const handleSearch = () => {
        if (!searchInput.trim()) { setSearchError("Vui lòng nhập tên khách sạn hoặc địa điểm"); return; }
        setSearchError("");
        setSearch(searchInput);
        setShowFilter(true);
        fetchHotels(searchInput);
        setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const handleReset = () => {
        setSearchInput("");
        setPriceIdx(0); setRatingIdx(0);
        setSortVal("rating"); setSelectedCity(null);
        setRefundFilter("all"); setSelectedAmenities([]);
        setShowFilter(false); setHotels([]);
    };

    return (
        <>

            <div className="hp-root">
                {/* ── HERO ── */}
                <div className="hp-hero">
                    {/* Các phần tử trang trí được bọc riêng để clip mà không ảnh hưởng dropdown */}
                    <div className="hp-hero-deco">
                        <div className="hp-hero-bg" />
                        <div className="hp-hero-circle" style={{ width: 220, height: 220, right: -60, top: -60 }} />
                        <div className="hp-hero-circle" style={{ width: 140, height: 140, left: -40, bottom: -40 }} />
                    </div>
                    <h1>🏨 Tìm khách sạn lý tưởng</h1>
                    <p>Hàng trăm lựa chọn khách sạn với giá tốt nhất</p>

                    {/* Search Box */}
                    <div className="hp-search-box">
                        <div className="hp-search-field" style={{ flex: 2 }}>
                            <label className="hp-search-label">🔍 Tìm kiếm</label>
                            <DestinationInput
                                value={searchInput}
                                onChange={v => { setSearchInput(v); if (v.trim()) setSearchError(""); }}
                                placeholder="Tên khách sạn hoặc địa điểm..."
                                cityMode
                                inputStyle={searchError ? { borderColor: "#e74c3c", boxShadow: "0 0 0 3px rgba(231,76,60,0.12)" } : {}}
                            />
                            {searchError && (
                                <span style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, fontSize: "0.7rem", color: "#fff", background: "#e74c3c", borderRadius: "6px", padding: "0.2rem 0.55rem", display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap", zIndex: 10, boxShadow: "0 2px 8px rgba(231,76,60,0.3)" }}>
                                    ⚠ {searchError}
                                </span>
                            )}
                        </div>
                        <div className="hp-search-field">
                            <label className="hp-search-label">📅 Nhận phòng</label>
                            <input className="hp-search-input" type="date" value={checkIn} min={localDate(0)}
                                onChange={e => {
                                    const newCheckIn = e.target.value;
                                    setCheckIn(newCheckIn);
                                    if (!checkOut || checkOut <= newCheckIn) {
                                        const d = new Date(newCheckIn);
                                        d.setDate(d.getDate() + 1);
                                        setCheckOut(d.toISOString().split("T")[0]);
                                    }
                                }} />
                        </div>
                        <div className="hp-search-field">
                            <label className="hp-search-label">📅 Trả phòng</label>
                            <input className="hp-search-input" type="date" value={checkOut}
                                min={checkIn ? (([y, m, d]) => { const dt = new Date(+y, +m - 1, +d + 1); return [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, "0"), String(dt.getDate()).padStart(2, "0")].join("-"); })(checkIn.split("-")) : localDate(1)}
                                onChange={e => setCheckOut(e.target.value)} />
                        </div>
                        <div className="hp-search-field" style={{ minWidth: 260, position: "relative" }} ref={guestRef}>
                            <label className="hp-search-label">👥 Khách và Phòng</label>
                            <button className="hp-guest-btn" onClick={() => setGuestOpen(o => !o)}>
                                <span>🛏 {guestSummary}</span>
                                <span className="hp-guest-arrow">{guestOpen ? "▲" : "▼"}</span>
                            </button>
                            {guestOpen && (
                                <div className="hp-guest-dropdown">
                                    {/* Người lớn */}
                                    <div className="hp-guest-row">
                                        <div className="hp-guest-info">
                                            <span className="hp-guest-icon">🧑‍🤝‍🧑</span>
                                            <div><div className="hp-guest-label">Người lớn</div></div>
                                        </div>
                                        <div className="hp-guest-counter">
                                            <button className="hp-guest-count-btn" disabled={adults <= 1} onClick={() => handleSetAdults(Math.max(1, adults - 1))}>−</button>
                                            <span className="hp-guest-count-val">{adults}</span>
                                            <button className="hp-guest-count-btn" onClick={() => handleSetAdults(adults + 1)}>+</button>
                                        </div>
                                    </div>
                                    {/* Trẻ em */}
                                    <div className="hp-guest-row">
                                        <div className="hp-guest-info">
                                            <span className="hp-guest-icon">🧒</span>
                                            <div>
                                                <div className="hp-guest-label">Trẻ em</div>
                                                <div className="hp-guest-sub">Dưới 18 tuổi</div>
                                            </div>
                                        </div>
                                        <div className="hp-guest-counter">
                                            <button className="hp-guest-count-btn" disabled={children <= 0} onClick={() => setChildren(c => Math.max(0, c - 1))}>−</button>
                                            <span className="hp-guest-count-val">{children}</span>
                                            <button className="hp-guest-count-btn" disabled={children >= 6} onClick={() => setChildren(c => Math.min(6, c + 1))}>+</button>
                                        </div>
                                    </div>
                                    {/* Phòng */}
                                    <div className="hp-guest-row">
                                        <div className="hp-guest-info">
                                            <span className="hp-guest-icon">🛏</span>
                                            <div>
                                                <div className="hp-guest-label">Phòng</div>
                                                <div className="hp-guest-sub">Tối đa {maxRooms} phòng</div>
                                            </div>
                                        </div>
                                        <div className="hp-guest-counter">
                                            <button className="hp-guest-count-btn" disabled={rooms <= 1} onClick={() => setRooms(r => Math.max(1, r - 1))}>−</button>
                                            <span className="hp-guest-count-val">{rooms}</span>
                                            <button className="hp-guest-count-btn" disabled={rooms >= maxRooms} onClick={() => setRooms(r => Math.min(maxRooms, r + 1))}>+</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button className="hp-search-btn" onClick={handleSearch}>
                            Tìm ngay
                        </button>
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
                        {selectedCity && (
                            <button
                                onClick={() => { setSelectedCity(null); setShowFilter(false); setHotels([]); }}
                                style={{ fontSize: "0.82rem", color: "#0052cc", background: "none", border: "none", cursor: "pointer" }}
                            >
                                ✕ Bỏ chọn {selectedCity}
                            </button>
                        )}
                    </div>
                    <div className="hp-dest-grid">
                        {POPULAR_CITIES_HP.map((item) => (
                            <div
                                key={item.city}
                                className={`hp-dest-card${selectedCity === item.city ? " active" : ""}`}
                                onClick={() => {
                                    if (selectedCity === item.city) {
                                        setSelectedCity(null);
                                        setShowFilter(false);
                                        setHotels([]);
                                    } else {
                                        setSelectedCity(item.city);
                                        setSearchInput(item.city);
                                        setShowFilter(true);
                                        setLoadingHotels(true);
                                        hotelService.getHotels({ search: item.city, sort: "rating", min_guests: guestsPerRoom })
                                            .then(setHotels).catch(() => setHotels([]))
                                            .finally(() => {
                                                setLoadingHotels(false);
                                                setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                                            });
                                    }
                                }}
                            >
                                <div className="hp-dest-card-img" style={{ fontSize: "1.8rem" }}>
                                    {item.emoji}
                                </div>
                                <div className="hp-dest-card-body">
                                    <div className="hp-dest-card-name">{item.city}</div>
                                    <div className="hp-dest-card-count">{item.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

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
                                <HotelList hotels={topHotels} adults={adults} childrenCount={children} rooms={rooms} checkIn={checkIn} checkOut={checkOut} />
                            )}
                        </>
                    )}

                    {/* ── FILTER + RESULTS ── */}
                    {showFilter && (
                        <div ref={listRef} style={{ marginTop: "2rem" }}>
                            <div className="hp-section-header">
                                <div className="hp-section-title">
                                    🔍 Kết quả tìm kiếm
                                    {selectedCity && <span style={{ color: "#0052cc" }}> · {selectedCity}</span>}
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

                                    {/* Refund policy */}
                                    <div className="hp-filter-group">
                                        <div className="hp-filter-group-label">Chính sách hoàn tiền</div>
                                        <button
                                            className={`hp-refund-toggle${refundFilter === "refundable" ? " active" : ""}`}
                                            onClick={() => setRefundFilter(v => v === "refundable" ? "all" : "refundable")}
                                        >
                                            <span className="hp-toggle-box">{refundFilter === "refundable" ? "✓" : ""}</span>
                                            ✅ Có hoàn tiền
                                        </button>
                                        <button
                                            className={`hp-refund-toggle${refundFilter === "non_refundable" ? " active" : ""}`}
                                            style={refundFilter === "non_refundable" ? { background: "#fff0ee", borderColor: "#f5c0b8", color: "#bf2600", fontWeight: 600 } : {}}
                                            onClick={() => setRefundFilter(v => v === "non_refundable" ? "all" : "non_refundable")}
                                        >
                                            <span className="hp-toggle-box" style={{ borderColor: refundFilter === "non_refundable" ? "#bf2600" : undefined, background: refundFilter === "non_refundable" ? "#bf2600" : undefined }}>
                                                {refundFilter === "non_refundable" ? "✓" : ""}
                                            </span>
                                            ❌ Không hoàn tiền
                                        </button>
                                    </div>

                                    {/* Amenities */}
                                    <div className="hp-filter-group">
                                        <div className="hp-filter-group-label">Tiện nghi</div>
                                        {AMENITIES_LIST.map((a) => {
                                            const active = selectedAmenities.includes(a.value);
                                            return (
                                                <div
                                                    key={a.value}
                                                    className={`hp-amenity-item${active ? " active" : ""}`}
                                                    onClick={() => setSelectedAmenities(prev =>
                                                        active ? prev.filter(x => x !== a.value) : [...prev, a.value]
                                                    )}
                                                >
                                                    <span className="hp-amenity-check">{active ? "✓" : ""}</span>
                                                    {a.icon} {a.label}
                                                </div>
                                            );
                                        })}
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
                                        <HotelList hotels={hotels} adults={adults} childrenCount={children} rooms={rooms} checkIn={checkIn} checkOut={checkOut} />
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