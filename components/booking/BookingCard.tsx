"use client";

import { useState, useEffect, useRef } from "react";
import { BookingData } from "@/store/bookingStore";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

const fmt = (n: number) => n.toLocaleString("vi-VN") + " VND";

const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const fmtDate = (s: string) => {
    const d = new Date(s);
    const wd = WEEKDAYS[d.getDay()];
    const day = String(d.getDate()).padStart(2, "0");
    const mon = String(d.getMonth() + 1).padStart(2, "0");
    return `${wd}, ${day} tháng ${mon} ${d.getFullYear()}`;
};

interface PromoResult {
    promo_id: number;
    code: string;
    discount_amount: number;
    message: string;
}

interface Promotion {
    promo_id: number;
    code: string;
    description: string;
    min_order_value: number;
    max_discount: number;
    discount_percent: number;
    discount_type: string;
    used_count: number;
    usage_limit: number;
}

interface Props {
    booking: BookingData;
    onContinue: (promoId?: number, discountAmount?: number) => void;
    submitting: boolean;
}

export default function BookingCard({ booking, onContinue, submitting }: Props) {
    const { user } = useAuthStore();
    const [priceOpen, setPriceOpen] = useState(true);

    // Promo code state
    const [promoCode, setPromoCode] = useState("");
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [availablePromos, setAvailablePromos] = useState<Promotion[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const promoWrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (promoWrapRef.current && !promoWrapRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const discountAmount = promoResult?.discount_amount ?? 0;
    const finalTotal = Math.max(0, booking.totalPrice - discountAmount);
    
    const appliesTo =
        booking.type === "hotel" ? "hotel" :
        booking.type === "flight" ? "flight" :
        booking.type === "bus" ? "bus" :
        booking.type === "train" ? "train" : "all";

    useEffect(() => {
        const fetchPromos = async () => {
            try {
                const res = await api.get(`/api/promotions?applies_to=${appliesTo}`);
                setAvailablePromos(res.data);
            } catch (error) {
                console.error("Failed to fetch promotions", error);
            }
        };
        fetchPromos();
    }, [appliesTo]);

    const handleApplyPromo = async (codeToApply?: string) => {
        if (!user) {
            setPromoError("Vui lòng đăng nhập để sử dụng mã giảm giá");
            return;
        }
        const code = (codeToApply || promoCode).trim().toUpperCase();
        if (!code) return;
        setPromoCode(code);
        setPromoLoading(true);
        setPromoError(null);
        setPromoResult(null);

        try {
            const res = await api.post("/api/promotions/validate", {
                code,
                order_value: booking.totalPrice,
                applies_to: appliesTo,
            });
            setPromoResult(res.data);
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })
                ?.response?.data?.detail;
            setPromoError(detail ?? "Mã không hợp lệ hoặc đã hết hạn");
        } finally {
            setPromoLoading(false);
        }
    };

    const handleRemovePromo = () => {
        setPromoResult(null);
        setPromoError(null);
        setPromoCode("");
    };

    return (
        <>
            <style>{`
                .bc-wrap { background: #fff; border-radius: 12px; border: 1px solid #dde3f0; overflow: hidden; position: sticky; top: 80px; }
                .bc-banner { background: #e8f4fd; padding: 0.6rem 1rem; font-size: 0.8rem; color: #1a3c6b; font-weight: 600; border-bottom: 1px solid #bee3f8; }
                .bc-body { padding: 1rem 1.25rem; }
                .bc-room-name { font-size: 1rem; font-weight: 700; color: #1a3c6b; margin-bottom: 0.2rem; }
                .bc-popular { font-size: 0.78rem; color: #e05c00; font-weight: 600; margin-bottom: 1rem; }
                .bc-dates { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0.5rem; align-items: start; margin-bottom: 1rem; }
                .bc-date-col {}
                .bc-date-label { font-size: 0.72rem; color: #6b8cbf; margin-bottom: 0.15rem; }
                .bc-date-val { font-size: 0.85rem; font-weight: 700; color: #1a3c6b; }
                .bc-date-time { font-size: 0.75rem; color: #6b8cbf; margin-top: 0.15rem; }
                .bc-nights { text-align: center; font-size: 0.78rem; color: #6b8cbf; padding-top: 0.8rem; }
                .bc-nights strong { display: block; font-size: 0.9rem; color: #1a3c6b; }
                .bc-info-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #444; margin-bottom: 0.45rem; }
                .bc-info-icon { color: #6b8cbf; }
                .bc-policy { font-size: 0.78rem; color: #6b8cbf; display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.35rem; }
                .bc-policy-icon { width: 15px; height: 15px; border-radius: 50%; border: 1px solid #aaa; display: inline-flex; align-items: center; justify-content: center; font-size: 0.6rem; color: #777; flex-shrink: 0; }
                .bc-policy-badges { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem; margin-bottom: 0.2rem; }
                .bc-policy-badge { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.73rem; font-weight: 600; padding: 0.25rem 0.65rem; border-radius: 99px; }
                .bc-policy-badge.ok { background: #e6f9f0; color: #00875a; border: 1px solid #b7dfbb; }
                .bc-policy-badge.no { background: #fff0f0; color: #c0392b; border: 1px solid #ffcdd2; }
                .bc-divider { border: none; border-top: 1px solid #eef0f8; margin: 0.85rem 0; }
                .bc-price-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
                .bc-price-title { font-size: 0.88rem; font-weight: 700; color: #1a3c6b; }
                .bc-chevron { font-size: 0.85rem; color: #6b8cbf; transition: transform 0.2s; }
                .bc-price-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 0.75rem; }
                .bc-price-label { font-size: 0.84rem; color: #444; }
                .bc-price-sub { font-size: 0.72rem; color: #999; margin-top: 0.1rem; }
                .bc-price-val { font-size: 0.84rem; color: #1a3c6b; font-weight: 600; text-align: right; }
                .bc-total-label { font-size: 0.88rem; font-weight: 700; color: #1a3c6b; }
                .bc-total-sub { font-size: 0.72rem; color: #999; margin-top: 0.1rem; }
                .bc-total-val { text-align: right; }
                .bc-total-original { font-size: 0.78rem; color: #aaa; text-decoration: line-through; }
                .bc-total-final { font-size: 1.05rem; font-weight: 800; color: #d32f2f; }
                .bc-btn { width: 100%; padding: 0.9rem; background: linear-gradient(135deg, #0052cc, #0065ff); color: #fff; border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: opacity 0.15s; margin-top: 1rem; font-family: inherit; }
                .bc-btn:hover:not(:disabled) { opacity: 0.9; }
                .bc-btn:disabled { opacity: 0.55; cursor: not-allowed; }
                .bc-terms { font-size: 0.72rem; color: #999; text-align: center; margin-top: 0.6rem; line-height: 1.4; }
                .bc-terms a { color: #0052cc; text-decoration: none; }

                /* Promo */
                .bc-promo-wrap { margin-top: 0.85rem; position: relative; }
                .bc-promo-label { font-size: 0.75rem; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 0.4rem; }
                .bc-promo-row { display: flex; gap: 0.5rem; }
                .bc-promo-input { flex: 1; border: 1.5px solid #dde3f0; border-radius: 8px; padding: 0.55rem 0.75rem; font-size: 0.88rem; font-family: inherit; color: #1a3c6b; outline: none; text-transform: uppercase; transition: border-color 0.2s; min-width: 0; }
                .bc-promo-input:focus { border-color: #0052cc; }
                .bc-promo-input:disabled { background: #f8f9fb; color: #aaa; }
                .bc-promo-btn { padding: 0.55rem 0.9rem; background: #0052cc; color: #fff; border: none; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer; white-space: nowrap; transition: opacity 0.15s; font-family: inherit; flex-shrink: 0; }
                .bc-promo-btn:hover:not(:disabled) { opacity: 0.85; }
                .bc-promo-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .bc-promo-btn.remove { background: #fff; color: #d32f2f; border: 1.5px solid #ffbdad; }
                .bc-promo-dropdown-btn { padding: 0.55rem 0.65rem; background: #f0f4ff; color: #0052cc; border: 1.5px solid #c8d8ff; border-radius: 8px; font-size: 0.85rem; cursor: pointer; transition: background 0.15s; flex-shrink: 0; line-height: 1; }
                .bc-promo-dropdown-btn:hover { background: #dde9ff; }
                .bc-promo-dropdown-btn.open { background: #0052cc; color: #fff; border-color: #0052cc; }
                .bc-promo-success { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.4rem; font-size: 0.8rem; color: #00875a; font-weight: 500; }
                .bc-promo-error { margin-top: 0.4rem; font-size: 0.8rem; color: #bf2600; }
                .bc-promo-login-hint { font-size: 0.82rem; color: #6b778c; background: #f4f5f7; border-radius: 8px; padding: 0.55rem 0.75rem; margin-top: 0.25rem; }
                .bc-discount-row { display: flex; justify-content: space-between; margin-top: 0.75rem; }
                .bc-discount-label { font-size: 0.84rem; color: #00875a; font-weight: 600; }
                .bc-discount-val { font-size: 0.84rem; color: #00875a; font-weight: 700; }

                /* Promo dropdown */
                .bc-promo-dropdown { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: #fff; border: 1.5px solid #c8d8ff; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,82,204,0.13); z-index: 100; overflow: hidden; }
                .bc-promo-dropdown-header { padding: 0.55rem 0.85rem; background: #f0f4ff; font-size: 0.72rem; font-weight: 700; color: #0052cc; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 1px solid #dde9ff; }
                .bc-promo-dropdown-list { max-height: 260px; overflow-y: auto; }
                .bc-promo-dropdown-list::-webkit-scrollbar { width: 4px; }
                .bc-promo-dropdown-list::-webkit-scrollbar-thumb { background: #c8d8ff; border-radius: 4px; }
                .bc-promo-item { padding: 0.65rem 0.85rem; cursor: pointer; transition: background 0.15s; border-bottom: 1px solid #f0f4ff; position: relative; }
                .bc-promo-item:last-child { border-bottom: none; }
                .bc-promo-item:hover { background: #f4f8ff; }
                .bc-promo-item.disabled { opacity: 0.55; cursor: not-allowed; }
                .bc-promo-item.disabled:hover { background: transparent; }
                .bc-promo-item-top { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem; }
                .bc-promo-item-code { font-weight: 700; color: #0052cc; font-size: 0.85rem; padding: 0.15rem 0.45rem; background: #e8f0ff; border-radius: 4px; border: 1px solid #cce0ff; letter-spacing: 0.5px; }
                .bc-promo-item-badge { font-size: 0.72rem; font-weight: 700; color: #fff; background: #e05c00; padding: 0.1rem 0.4rem; border-radius: 99px; }
                .bc-promo-item-desc { font-size: 0.8rem; color: #444; line-height: 1.3; }
                .bc-promo-item-req { font-size: 0.72rem; color: #d32f2f; margin-top: 0.15rem; font-weight: 500; }
                .bc-promo-showmore { padding: 0.55rem; text-align: center; font-size: 0.8rem; color: #0052cc; font-weight: 600; cursor: pointer; border-top: 1px solid #e8f0fe; background: #f8faff; }
                .bc-promo-showmore:hover { background: #eef3ff; }
                .bc-promo-item-applied { position: absolute; top: 0; right: 0; background: #00875a; color: #fff; font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.5rem; border-bottom-left-radius: 8px; }
            `}</style>

            <div className="bc-wrap">
                {booking.type === "hotel" && (
                    <div className="bc-banner">
                        🌟 Chỗ ở phổ biến! Ngày bạn chọn đang được nhiều người đặt.
                    </div>
                )}

                <div className="bc-body">
                    {/* Tên phòng / chuyến */}
                    {booking.type === "hotel" && (
                        <>
                            <div className="bc-room-name">
                                ({booking.quantity}x) {booking.roomName}
                            </div>
                            <div className="bc-popular">Được nhiều người chọn!</div>

                            <div className="bc-dates">
                                <div className="bc-date-col">
                                    <div className="bc-date-label">Nhận phòng</div>
                                    <div className="bc-date-val">{fmtDate(booking.checkIn)}</div>
                                    <div className="bc-date-time">Từ {booking.checkInTime || "14:00"}</div>
                                </div>
                                <div className="bc-nights">
                                    <strong>{booking.nights}</strong>
                                    đêm →
                                </div>
                                <div className="bc-date-col">
                                    <div className="bc-date-label">Trả phòng</div>
                                    <div className="bc-date-val">{fmtDate(booking.checkOut)}</div>
                                    <div className="bc-date-time">Trước {booking.checkOutTime || "12:00"}</div>
                                </div>
                            </div>

                            <div className="bc-info-row">
                                <span>🛏 {booking.quantity} phòng</span>
                                <span style={{ color: "#c8d8ff" }}>·</span>
                                <span>👤 {booking.adultsCount} người lớn{booking.childrenCount > 0 ? ` · 🧒 ${booking.childrenCount} trẻ em` : ""}</span>
                                <span style={{ color: "#c8d8ff" }}>·</span>
                                <span>🌙 {booking.nights} đêm</span>
                            </div>

                            <div className="bc-policy-badges">
                                {booking.allowsRefund !== false ? (
                                    <span className="bc-policy-badge ok">✓ Có thể hoàn tiền</span>
                                ) : (
                                    <span className="bc-policy-badge no">⛔ Không hoàn tiền</span>
                                )}
                                {booking.allowsReschedule !== false ? (
                                    <span className="bc-policy-badge ok">✓ Được đổi lịch</span>
                                ) : (
                                    <span className="bc-policy-badge no">🚫 Không được đổi lịch</span>
                                )}
                            </div>
                        </>
                    )}

                    {booking.type === "flight" && (
                        <>
                            <div className="bc-room-name">{booking.airline}</div>
                            <div className="bc-popular">{booking.fromCity} → {booking.toCity}</div>
                            <div className="bc-info-row">
                                <span>✈ Khởi hành: {new Date(booking.departTime).toLocaleString("vi-VN")}</span>
                            </div>
                            <div className="bc-info-row">
                                <span>🛬 Đến: {new Date(booking.arriveTime).toLocaleString("vi-VN")}</span>
                            </div>
                            <div className="bc-info-row">
                                <span>👥 {booking.passengers} hành khách</span>
                                <span style={{ color: "#c8d8ff" }}>·</span>
                                <span>💺 {booking.seatClass === "business" ? "Thương gia" : booking.seatClass === "first" ? "Hạng nhất" : "Phổ thông"}</span>
                            </div>
                        </>
                    )}

                    {booking.type === "bus" && (
                        <>
                            <div className="bc-room-name">{booking.company}</div>
                            <div className="bc-popular">{booking.fromCity} → {booking.toCity}</div>
                            <div className="bc-info-row">
                                <span>🚌 Khởi hành: {new Date(booking.departTime).toLocaleString("vi-VN")}</span>
                            </div>
                            <div className="bc-info-row">
                                <span>👥 {booking.passengers} hành khách</span>
                                {booking.seatClass && (
                                    <>
                                        <span style={{ color: "#c8d8ff" }}>·</span>
                                        <span>💺 {booking.seatClass === "vip" ? "VIP" : booking.seatClass === "sleeper" ? "Giường nằm" : "Thường"}</span>
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {booking.type === "train" && (
                        <>
                            <div className="bc-room-name">Tàu {booking.trainCode}</div>
                            <div className="bc-popular">{booking.fromCity} → {booking.toCity}</div>
                            <div className="bc-info-row">
                                <span>🚉 {booking.fromStation} → {booking.toStation}</span>
                            </div>
                            <div className="bc-info-row">
                                <span>🚆 Khởi hành: {new Date(booking.departTime).toLocaleString("vi-VN")}</span>
                            </div>
                            <div className="bc-info-row">
                                <span>👥 {booking.passengers} hành khách</span>
                                <span style={{ color: "#c8d8ff" }}>·</span>
                                <span>💺 {booking.seatClassName}</span>
                            </div>
                        </>
                    )}

                    <hr className="bc-divider" />

                    {/* Mã giảm giá */}
                    <div className="bc-promo-wrap" ref={promoWrapRef}>
                        <div className="bc-promo-label">🏷️ Mã giảm giá</div>
                        {!user ? (
                            <div className="bc-promo-login-hint">
                                🔒 <a href="/login" style={{ color: "#0052cc", fontWeight: 600 }}>Đăng nhập</a> để sử dụng mã giảm giá
                            </div>
                        ) : (
                            <>
                                <div className="bc-promo-row">
                                    <input
                                        className="bc-promo-input"
                                        type="text"
                                        placeholder="Nhập mã khuyến mãi..."
                                        value={promoCode}
                                        disabled={!!promoResult}
                                        onChange={e => {
                                            setPromoCode(e.target.value);
                                            setPromoError(null);
                                        }}
                                        onKeyDown={e => e.key === "Enter" && !promoResult && handleApplyPromo()}
                                    />
                                    {promoResult ? (
                                        <button className="bc-promo-btn remove" onClick={handleRemovePromo}>
                                            Xóa
                                        </button>
                                    ) : (
                                        <button
                                            className="bc-promo-btn"
                                            onClick={() => handleApplyPromo()}
                                            disabled={promoLoading || !promoCode.trim()}
                                        >
                                            {promoLoading ? "..." : "Áp dụng"}
                                        </button>
                                    )}
                                    {availablePromos.length > 0 && !promoResult && (
                                        <button
                                            className={`bc-promo-dropdown-btn${dropdownOpen ? " open" : ""}`}
                                            onClick={() => { setDropdownOpen(o => !o); setShowAll(false); }}
                                            title="Xem mã khuyến mãi có thể áp dụng"
                                        >
                                            🏷️{dropdownOpen ? " ▲" : " ▼"}
                                        </button>
                                    )}
                                </div>

                                {promoResult && (
                                    <div className="bc-promo-success">✅ {promoResult.message}</div>
                                )}
                                {promoError && (
                                    <div className="bc-promo-error">❌ {promoError}</div>
                                )}
                            </>
                        )}

                        {/* Dropdown danh sách mã */}
                        {user && dropdownOpen && !promoResult && availablePromos.length === 0 && (
                            <div className="bc-promo-dropdown">
                                <div style={{ padding: "1rem", textAlign: "center", color: "#6b8cbf", fontSize: "0.85rem" }}>
                                    Không có mã khuyến mãi khả dụng
                                </div>
                            </div>
                        )}
                        {user && dropdownOpen && !promoResult && availablePromos.length > 0 && (() => {
                            // Sắp xếp: applicable trước, trong mỗi nhóm sort theo giảm nhiều nhất
                            const calcDiscount = (p: Promotion) =>
                                p.discount_type === "percent"
                                    ? Math.min(booking.totalPrice * p.discount_percent / 100, p.max_discount)
                                    : p.max_discount;

                            const sorted = [...availablePromos].sort((a, b) => {
                                const aOk = booking.totalPrice >= a.min_order_value ? 1 : 0;
                                const bOk = booking.totalPrice >= b.min_order_value ? 1 : 0;
                                if (aOk !== bOk) return bOk - aOk;
                                return calcDiscount(b) - calcDiscount(a);
                            });

                            const visible = showAll ? sorted : sorted.slice(0, 3);
                            const hasMore = sorted.length > 3;

                            return (
                                <div className="bc-promo-dropdown">
                                    <div className="bc-promo-dropdown-header">
                                        {availablePromos.length} mã khả dụng cho đơn hàng này
                                    </div>
                                    <div className="bc-promo-dropdown-list">
                                        {visible.map(promo => {
                                            const isApplicable = booking.totalPrice >= promo.min_order_value;
                                            const discount = calcDiscount(promo);
                                            return (
                                                <div
                                                    key={promo.promo_id}
                                                    className={`bc-promo-item${!isApplicable ? " disabled" : ""}`}
                                                    onClick={() => {
                                                        if (!isApplicable || promoLoading) return;
                                                        setDropdownOpen(false);
                                                        handleApplyPromo(promo.code);
                                                    }}
                                                >
                                                    <div className="bc-promo-item-top">
                                                        <span className="bc-promo-item-code">{promo.code}</span>
                                                        <span className="bc-promo-item-badge">
                                                            -{promo.discount_type === "percent" ? `${promo.discount_percent}%` : fmt(discount)}
                                                        </span>
                                                        {!isApplicable && (
                                                            <span style={{ fontSize: "0.72rem", color: "#999", marginLeft: "auto" }}>
                                                                Không đủ điều kiện
                                                            </span>
                                                        )}
                                                    </div>
                                                    {promo.description && (
                                                        <div className="bc-promo-item-desc">{promo.description}</div>
                                                    )}
                                                    {isApplicable ? (
                                                        <div style={{ fontSize: "0.75rem", color: "#00875a", marginTop: "0.15rem", fontWeight: 600 }}>
                                                            Tiết kiệm {fmt(discount)}
                                                        </div>
                                                    ) : (
                                                        <div className="bc-promo-item-req">
                                                            Cần thêm {fmt(promo.min_order_value - booking.totalPrice)} để áp dụng
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {hasMore && !showAll && (
                                        <div className="bc-promo-showmore" onClick={() => setShowAll(true)}>
                                            Xem thêm {sorted.length - 3} mã khác ▼
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    <hr className="bc-divider" />

                    {/* Chi tiết giá */}
                    <div className="bc-price-header" onClick={() => setPriceOpen(o => !o)}>
                        <span className="bc-price-title">Chi tiết giá</span>
                        <span className="bc-chevron" style={{ transform: priceOpen ? "rotate(0)" : "rotate(180deg)" }}>∧</span>
                    </div>

                    {priceOpen && (
                        <>
                            <div className="bc-price-row">
                                <div>
                                    <div className="bc-price-label">Giá {booking.type === "hotel" ? "phòng" : "vé"}</div>
                                    {booking.type === "hotel" && (
                                        <div className="bc-price-sub">({booking.quantity}x) {booking.roomName} ({booking.nights} đêm)</div>
                                    )}
                                </div>
                                <div className="bc-price-val">{fmt(booking.basePrice)}</div>
                            </div>
                            <div className="bc-price-row">
                                <div className="bc-price-label">Thuế và phí</div>
                                <div className="bc-price-val">{fmt(booking.taxAndFees)}</div>
                            </div>

                            {discountAmount > 0 && (
                                <div className="bc-discount-row">
                                    <div className="bc-discount-label">🏷️ Giảm giá ({promoResult?.code})</div>
                                    <div className="bc-discount-val">-{fmt(discountAmount)}</div>
                                </div>
                            )}

                            <hr className="bc-divider" />

                            <div className="bc-price-row">
                                <div>
                                    <div className="bc-total-label">Tổng cộng</div>
                                    <div className="bc-total-sub">
                                        {booking.type === "hotel"
                                            ? `${booking.quantity} phòng, ${booking.nights} đêm`
                                            : `${booking.passengers} hành khách`
                                        }
                                    </div>
                                </div>
                                <div className="bc-total-val">
                                    {discountAmount > 0 && (
                                        <div className="bc-total-original">{fmt(booking.totalPrice)}</div>
                                    )}
                                    {!discountAmount && booking.type === "hotel" && booking.originalPrice && booking.originalPrice > booking.totalPrice && (
                                        <div className="bc-total-original">{fmt(booking.originalPrice)}</div>
                                    )}
                                    <div className="bc-total-final">{fmt(finalTotal)}</div>
                                </div>
                            </div>
                        </>
                    )}

                    <button
                        className="bc-btn"
                        onClick={() => onContinue(promoResult?.promo_id, discountAmount > 0 ? discountAmount : undefined)}
                        disabled={submitting}
                    >
                        {submitting ? "Đang xử lý..." : "Tiếp tục"}
                    </button>

                    <div className="bc-terms">
                        Bằng cách tiến hành thanh toán, bạn đã đồng ý với{" "}
                        <a href="#">Điều khoản và Điều kiện</a>,{" "}
                        <a href="#">Chính sách Bảo mật</a>, và{" "}
                        <a href="#">Quy trình Hoàn tiền Lưu trú</a>.
                    </div>
                </div>
            </div>
        </>
    );
}
