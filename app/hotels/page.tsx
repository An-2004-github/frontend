"use client";

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
    const [refundOnly, setRefundOnly] = useState(false);
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

    // ── Fetch filtered hotels ─────────────────────────────────────
    const fetchHotels = useCallback(async (keyword?: string) => {
        setLoadingHotels(true);
        try {
            const price = PRICE_OPTIONS[priceIdx];
            const data = await hotelService.getHotels({
                search: keyword || undefined,
                min_price: price.min,
                max_price: price.max,
                sort: sortVal as "rating" | "price_asc" | "price_desc",
                min_guests: guestsPerRoom,
            });
            let filtered = data;
            const minRating = RATING_OPTIONS[ratingIdx].min;
            if (minRating > 0) filtered = filtered.filter(h => (h.avg_rating ?? 0) >= minRating);
            if (refundOnly) filtered = filtered.filter(h => h.allows_refund === true);
            if (selectedAmenities.length > 0) {
                filtered = filtered.filter(h => {
                    const hAmens: string[] = Array.isArray(h.amenities) ? h.amenities : [];
                    return selectedAmenities.every(a =>
                        hAmens.some(ha => ha.toLowerCase().includes(a.toLowerCase()))
                    );
                });
            }
            setHotels(filtered);
        } finally {
            setLoadingHotels(false);
        }
    }, [priceIdx, ratingIdx, sortVal, guestsPerRoom, refundOnly, selectedAmenities]);

    // Tự động re-fetch khi filter/sort thay đổi (chỉ khi đã tìm kiếm)
    useEffect(() => {
        if (!showFilter) return;
        fetchHotels(search);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [priceIdx, ratingIdx, sortVal, guestsPerRoom, refundOnly, selectedAmenities]);

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
        setRefundOnly(false); setSelectedAmenities([]);
        setShowFilter(false); setHotels([]);
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
                * { box-sizing: border-box; }

                .hp-root {
                    min-height: 100vh;
                    background: #f0f4ff;
                    font-family: 'DM Sans', sans-serif;
                }

                /* ── HERO ── */
                .hp-hero {
                    background: linear-gradient(135deg, #003580 0%, #0052cc 55%, #0065ff 100%);
                    padding: 3rem 1.5rem 5rem;
                    position: relative; overflow: visible; text-align: center;
                }
                /* Wrapper riêng để clip các vòng trang trí mà không ảnh hưởng dropdown */
                .hp-hero-deco {
                    position: absolute; inset: 0; overflow: hidden;
                    pointer-events: none; border-radius: inherit;
                }
                .hp-hero-bg {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
                    background-size: 24px 24px;
                }
                .hp-hero-circle {
                    position: absolute; border-radius: 50%;
                    background: rgba(255,255,255,0.05);
                }
                .hp-hero h1 {
                    font-family: 'Nunito', sans-serif;
                    font-size: 2.2rem; font-weight: 800; color: #fff;
                    margin: 0 0 0.4rem; position: relative;
                }
                .hp-hero p {
                    color: rgba(255,255,255,0.7); font-weight: 300;
                    font-size: 1rem; position: relative; margin-bottom: 2rem;
                }

                /* ── SEARCH BOX ── */
                .hp-search-box {
                    position: relative; z-index: 10;
                    max-width: 860px; margin: 0 auto;
                    background: #fff; border-radius: 16px;
                    padding: 1.25rem 1.5rem;
                    box-shadow: 0 8px 40px rgba(0,0,0,0.18);
                    display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;
                }
                .hp-search-field {
                    display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 160px; position: relative;
                }
                .hp-search-label {
                    font-size: 0.72rem; font-weight: 600; color: #6b778c;
                    text-transform: uppercase; letter-spacing: 0.4px;
                }
                .hp-search-input {
                    border: 1.5px solid #dde3f0; border-radius: 10px;
                    padding: 0.7rem 1rem; font-size: 0.92rem;
                    font-family: 'DM Sans', sans-serif; color: #1a3c6b;
                    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
                }
                .hp-search-input:focus {
                    border-color: #0052cc;
                    box-shadow: 0 0 0 3px rgba(0,82,204,0.1);
                }
                .hp-search-input::placeholder { color: #b0bcd8; font-weight: 300; }
                /* ── GUEST PICKER ── */
                .hp-guest-btn {
                    width: 100%; border: 1.5px solid #dde3f0; border-radius: 10px;
                    padding: 0.7rem 1rem; font-size: 0.88rem;
                    font-family: 'DM Sans', sans-serif; color: #1a3c6b;
                    background: #fff; cursor: pointer; text-align: left;
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 0.5rem; white-space: nowrap;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .hp-guest-btn:hover { border-color: #0052cc; box-shadow: 0 0 0 3px rgba(0,82,204,0.08); }
                .hp-guest-arrow { font-size: 0.7rem; color: #6b8cbf; flex-shrink: 0; }
                .hp-guest-dropdown {
                    position: absolute; top: calc(100% + 6px); left: 0;
                    min-width: 300px;
                    background: #fff; border-radius: 14px;
                    border: 1.5px solid #dde3f0;
                    box-shadow: 0 12px 40px rgba(0,52,128,0.18);
                    padding: 0.4rem 0; z-index: 9999;
                }
                .hp-guest-row {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 0.85rem 1.25rem;
                    border-bottom: 1px solid #f0f4ff;
                }
                .hp-guest-row:last-child { border-bottom: none; }
                .hp-guest-info { display: flex; align-items: center; gap: 0.75rem; flex: 1; }
                .hp-guest-icon { font-size: 1.4rem; flex-shrink: 0; }
                .hp-guest-label { font-size: 0.92rem; font-weight: 600; color: #1a3c6b; }
                .hp-guest-sub { font-size: 0.75rem; color: #6b8cbf; margin-top: 0.1rem; }
                .hp-guest-counter { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
                .hp-guest-count-btn {
                    width: 34px; height: 34px; border-radius: 50%;
                    border: 2px solid #0052cc; background: #0052cc; color: #fff;
                    font-size: 1.2rem; font-weight: 700; line-height: 1;
                    cursor: pointer; display: flex; align-items: center; justify-content: center;
                    transition: opacity 0.15s; flex-shrink: 0;
                }
                .hp-guest-count-btn:disabled { background: #e8ecf8; border-color: #e8ecf8; color: #b0bcd8; cursor: not-allowed; }
                .hp-guest-count-btn:not(:disabled):hover { opacity: 0.85; }
                .hp-guest-count-val { font-size: 1.05rem; font-weight: 700; color: #1a3c6b; min-width: 24px; text-align: center; }

                .hp-search-btn {
                    padding: 0.75rem 1.75rem;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; border: none; border-radius: 10px;
                    font-family: 'Nunito', sans-serif; font-size: 0.95rem; font-weight: 700;
                    cursor: pointer; white-space: nowrap;
                    transition: opacity 0.15s, transform 0.15s;
                    margin-left: auto; align-self: flex-end;
                }
                .hp-search-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
                .hp-search-btn:disabled { background: #b0bcd8; cursor: not-allowed; opacity: 0.7; }

                /* ── CONTENT ── */
                .hp-content {
                    max-width: 1200px; margin: -2.5rem auto 0;
                    padding: 0 1.5rem 4rem; position: relative; z-index: 5;
                }

                /* ── SECTION HEADER ── */
                .hp-section-header {
                    display: flex; align-items: center; justify-content: space-between;
                    margin-bottom: 1.25rem; margin-top: 2.5rem;
                }
                .hp-section-title {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1.2rem; font-weight: 800; color: #1a3c6b;
                    display: flex; align-items: center; gap: 0.5rem;
                }
                .hp-section-link {
                    font-size: 0.85rem; color: #0052cc; font-weight: 500;
                    text-decoration: none;
                }
                .hp-section-link:hover { text-decoration: underline; }

                /* ── PROMO STRIP ── */
                .hp-promo-strip {
                    display: flex; gap: 1rem; overflow-x: auto;
                    padding-bottom: 0.5rem; scrollbar-width: none;
                }
                .hp-promo-strip::-webkit-scrollbar { display: none; }

                .hp-promo-card {
                    background: #fff;
                    border: 1px solid #e8f0fe; border-radius: 12px;
                    padding: 0.9rem 1.1rem;
                    display: flex; align-items: center; gap: 0.75rem;
                    min-width: 220px; flex-shrink: 0;
                    cursor: pointer;
                    transition: transform 0.15s, box-shadow 0.15s;
                }
                .hp-promo-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0,82,204,0.1);
                }
                .hp-promo-card-icon {
                    width: 40px; height: 40px; border-radius: 10px;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.1rem; flex-shrink: 0;
                }
                .hp-promo-card-info { min-width: 0; }
                .hp-promo-card-discount {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1rem; font-weight: 800; color: #0052cc;
                }
                .hp-promo-card-code {
                    font-family: 'Courier New', monospace;
                    font-size: 0.8rem; color: #6b8cbf; letter-spacing: 1px;
                    margin-top: 0.1rem;
                }

                /* ── DESTINATIONS ── */
                .hp-dest-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                    gap: 1rem;
                }
                .hp-dest-card {
                    background: #fff; border-radius: 14px;
                    border: 2px solid transparent;
                    overflow: hidden; cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
                }
                .hp-dest-card:hover, .hp-dest-card.active {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 24px rgba(0,82,204,0.14);
                    border-color: #0052cc;
                }
                .hp-dest-card-img {
                    height: 100px;
                    background: linear-gradient(135deg, #003580, #0052cc);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 2.5rem; position: relative; overflow: hidden;
                }
                .hp-dest-card-img img {
                    width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;
                }
                .hp-dest-card-body { padding: 0.75rem; }
                .hp-dest-card-name {
                    font-family: 'Nunito', sans-serif;
                    font-size: 0.9rem; font-weight: 700; color: #1a3c6b;
                }
                .hp-dest-card-count {
                    font-size: 0.75rem; color: #6b8cbf; margin-top: 0.15rem;
                }

                /* ── FILTER + LIST layout ── */
                .hp-filter-layout {
                    display: flex; gap: 1.5rem; align-items: flex-start;
                }

                /* ── SIDEBAR ── */
                .hp-sidebar {
                    width: 240px; flex-shrink: 0;
                    background: #fff; border-radius: 14px;
                    border: 1px solid #e8f0fe; padding: 1.25rem;
                    position: sticky; top: 72px;
                }
                .hp-sidebar h3 {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1rem; font-weight: 700; color: #1a3c6b;
                    margin: 0 0 1.1rem; padding-bottom: 0.75rem;
                    border-bottom: 2px solid #e8f0fe;
                }
                .hp-filter-group { margin-bottom: 1.1rem; }
                .hp-filter-group-label {
                    font-size: 0.75rem; font-weight: 600; color: #6b778c;
                    text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 0.5rem;
                }
                .hp-filter-option {
                    display: flex; align-items: center; gap: 0.5rem;
                    padding: 0.45rem 0.6rem; border-radius: 8px;
                    font-size: 0.85rem; color: #3a5f9a; cursor: pointer;
                    border: 1.5px solid transparent;
                    transition: background 0.15s, border-color 0.15s;
                    margin-bottom: 0.3rem;
                }
                .hp-filter-option:hover { background: #f0f4ff; }
                .hp-filter-option.active {
                    background: #e8f0fe; border-color: rgba(0,82,204,0.3);
                    color: #0052cc; font-weight: 500;
                }
                .hp-filter-dot {
                    width: 8px; height: 8px; border-radius: 50%;
                    border: 2px solid #0052cc; flex-shrink: 0;
                }
                .hp-filter-option.active .hp-filter-dot { background: #0052cc; }

                .hp-dest-toggle {
                    display: flex; gap: 0.3rem;
                    background: #e8f0fe; border-radius: 8px; padding: 3px;
                }
                .hp-dest-toggle-btn {
                    padding: 0.3rem 0.9rem;
                    border: none; border-radius: 6px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem; font-weight: 500;
                    cursor: pointer; transition: background 0.15s, color 0.15s;
                    background: transparent; color: #6b8cbf;
                }
                .hp-dest-toggle-btn.active {
                    background: #0052cc; color: #fff;
                    box-shadow: 0 2px 6px rgba(0,82,204,0.25);
                }
                    width: 100%; padding: 0.6rem 0.75rem;
                    border: 1.5px solid #dde3f0; border-radius: 8px;
                    font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #1a3c6b;
                    background: #fff; outline: none;
                    transition: border-color 0.2s;
                }
                .hp-sort-select:focus { border-color: #0052cc; }

                .hp-refund-toggle {
                    display: flex; align-items: center; gap: 0.55rem;
                    padding: 0.45rem 0.7rem; border-radius: 8px;
                    border: 1.5px solid #e8f0fe; background: #fff;
                    font-size: 0.82rem; color: #3a5f9a; cursor: pointer;
                    width: 100%; text-align: left; transition: all 0.15s;
                }
                .hp-refund-toggle:hover { background: #f0f4ff; }
                .hp-refund-toggle.active {
                    background: #e6f9f0; border-color: #b7dfbb;
                    color: #00875a; font-weight: 600;
                }
                .hp-refund-toggle .hp-toggle-box {
                    width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0;
                    border: 2px solid #00875a; display: flex; align-items: center;
                    justify-content: center; font-size: 0.65rem; color: #fff;
                    background: transparent; transition: background 0.15s;
                }
                .hp-refund-toggle.active .hp-toggle-box { background: #00875a; }

                .hp-amenity-item {
                    display: flex; align-items: center; gap: 0.5rem;
                    padding: 0.38rem 0.6rem; border-radius: 7px;
                    border: 1.5px solid #e8f0fe; background: #fff;
                    font-size: 0.8rem; color: #3a5f9a; cursor: pointer;
                    margin-bottom: 0.3rem; transition: all 0.15s;
                }
                .hp-amenity-item:hover { background: #f0f4ff; }
                .hp-amenity-item.active {
                    background: #e8f0fe; border-color: rgba(0,82,204,0.35);
                    color: #0052cc; font-weight: 500;
                }
                .hp-amenity-check {
                    width: 15px; height: 15px; border-radius: 4px; flex-shrink: 0;
                    border: 2px solid #0052cc; display: flex; align-items: center;
                    justify-content: center; font-size: 0.6rem; color: #fff;
                    background: transparent; transition: background 0.15s;
                }
                .hp-amenity-item.active .hp-amenity-check { background: #0052cc; }

                .hp-reset-btn {
                    width: 100%; padding: 0.6rem;
                    background: #f0f4ff; color: #0052cc;
                    border: 1.5px solid #c8d8ff; border-radius: 8px;
                    font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500;
                    cursor: pointer; transition: background 0.15s; margin-top: 0.5rem;
                }
                .hp-reset-btn:hover { background: #dde9ff; }

                /* ── MAIN ── */
                .hp-main { flex: 1; min-width: 0; }
                .hp-result-meta {
                    font-size: 0.88rem; color: #6b8cbf; margin-bottom: 1rem;
                }
                .hp-result-meta strong { color: #1a3c6b; }

                /* ── HOTEL CARD ── */
                .hcard {
                    background: #fff; border-radius: 14px;
                    border: 1px solid #e8f0fe; overflow: hidden;
                    transition: transform 0.2s, box-shadow 0.2s;
                    display: flex; flex-direction: column;
                }
                .hcard:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 32px rgba(0,82,204,0.12);
                }
                .hcard-img {
                    height: 170px; position: relative; overflow: hidden;
                    background: linear-gradient(135deg, #003580, #0052cc);
                    flex-shrink: 0;
                }
                .hcard-img-pattern {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px);
                    background-size: 18px 18px;
                }
                .hcard-img-real {
                    width: 100%; height: 100%; object-fit: cover;
                }
                .hcard-img-icon {
                    position: absolute; inset: 0; display: flex;
                    align-items: center; justify-content: center; font-size: 3rem; opacity: 0.5;
                }
                .hcard-star-badge {
                    position: absolute; top: 10px; right: 10px;
                    background: rgba(255,184,0,0.9); color: #1a1208;
                    font-size: 0.7rem; font-weight: 600;
                    padding: 0.2rem 0.55rem; border-radius: 99px;
                }
                .hcard-body {
                    padding: 1rem 1.1rem 1.1rem;
                    display: flex; flex-direction: column; flex: 1;
                }
                .hcard-stars { display: flex; gap: 2px; margin-bottom: 0.4rem; }
                .hcard-name {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1rem; font-weight: 700; color: #1a3c6b;
                    margin-bottom: 0.3rem; line-height: 1.3;
                    display: -webkit-box; -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical; overflow: hidden;
                }
                .hcard-location {
                    display: flex; align-items: flex-start; gap: 0.3rem;
                    font-size: 0.78rem; color: #6b8cbf; font-weight: 300;
                    margin-bottom: 0.6rem; flex: 1;
                }
                .hcard-rating {
                    display: flex; align-items: center; gap: 0.4rem;
                    margin-bottom: 0.75rem;
                }
                .hcard-rating-badge {
                    background: #0052cc; color: #fff;
                    font-size: 0.78rem; font-weight: 700;
                    padding: 0.2rem 0.5rem; border-radius: 6px;
                }
                .hcard-rating-label { font-size: 0.8rem; font-weight: 500; color: #1a3c6b; }
                .hcard-rating-count { font-size: 0.75rem; color: #6b8cbf; }
                .hcard-footer {
                    display: flex; align-items: center; justify-content: space-between;
                    border-top: 1px solid #eef2fb; padding-top: 0.75rem; margin-top: auto;
                }
                .hcard-price { display: flex; align-items: baseline; gap: 0.2rem; }
                .hcard-price-from { font-size: 0.68rem; color: #6b8cbf; }
                .hcard-price-value {
                    font-family: 'Nunito', sans-serif;
                    font-size: 0.88rem; font-weight: 800; color: #0052cc;
                }
                .hcard-price-night { font-size: 0.68rem; color: #6b8cbf; }
                .hcard-price-contact { font-size: 0.75rem; color: #6b8cbf; }
                .hcard-btn {
                    padding: 0.38rem 0.75rem;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; border-radius: 8px;
                    font-size: 0.75rem; font-weight: 600; text-decoration: none;
                    font-family: 'DM Sans', sans-serif; white-space: nowrap;
                    transition: opacity 0.15s;
                }
                .hcard-btn:hover { opacity: 0.88; }

                /* ── HOTEL GRID ── */
                .h-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                    gap: 1.25rem;
                }
                .h-empty {
                    text-align: center; padding: 3.5rem;
                    background: #fff; border-radius: 14px;
                    border: 1px dashed #c8d8ff; color: #6b8cbf;
                }

                /* ── LOADING ── */
                .hp-loading {
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    padding: 4rem; gap: 1rem; color: #6b8cbf;
                }
                .hp-spinner {
                    width: 34px; height: 34px;
                    border: 3px solid #e8f0fe; border-top-color: #0052cc;
                    border-radius: 50%; animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                @media (max-width: 768px) {
                    .hp-search-box { flex-direction: column; }
                    .hp-filter-layout { flex-direction: column; }
                    .hp-sidebar { width: 100%; position: static; }
                    .hp-dest-grid { grid-template-columns: repeat(3, 1fr); }
                    .hp-hero h1 { font-size: 1.6rem; }
                }
            `}</style>

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
                                min={checkIn ? (([y,m,d]) => { const dt = new Date(+y, +m-1, +d+1); return [dt.getFullYear(), String(dt.getMonth()+1).padStart(2,"0"), String(dt.getDate()).padStart(2,"0")].join("-"); })(checkIn.split("-")) : localDate(1)}
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
                                        <div className="hp-filter-group-label">Chính sách</div>
                                        <button
                                            className={`hp-refund-toggle${refundOnly ? " active" : ""}`}
                                            onClick={() => setRefundOnly(v => !v)}
                                        >
                                            <span className="hp-toggle-box">{refundOnly ? "✓" : ""}</span>
                                            ✅ Có thể hoàn tiền
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