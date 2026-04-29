"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Flight } from "@/types/flight";
import { useBookingStore } from "@/store/bookingStore";

const useIsClient = () =>
    useSyncExternalStore(() => () => {}, () => true, () => false);

interface SeatClassInfo {
    seat_class:             "economy" | "business" | "first";
    label:                  string;
    available:              number;
    price:                  number;
    carry_on_kg:            number;
    checked_bag_kg:         number;
    allows_reschedule:      boolean;
    allows_cancel:          boolean;
    refund_on_cancel:       boolean;
    reschedule_fee_percent: number;
    cancel_fee_percent:     number;
    min_hours_before:       number;
}

interface Props {
    flight:        Flight;
    passengers:    number;
    adults:        number;
    childrenCount: number;
    infants:       number;
    onClose:       () => void;
}

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
}

const ACCENT = "#0052cc";

const VN_CITIES = new Set([
    "hà nội", "ha noi", "hồ chí minh", "ho chi minh", "tp. hồ chí minh", "tp hồ chí minh",
    "sài gòn", "sai gon", "đà nẵng", "da nang", "huế", "hue", "nha trang",
    "đà lạt", "da lat", "phú quốc", "phu quoc", "hải phòng", "hai phong",
    "cần thơ", "can tho", "vinh", "đồng hới", "dong hoi", "rạch giá", "rach gia",
    "côn đảo", "con dao", "buôn ma thuột", "buon ma thuot", "pleiku", "chu lai",
    "tuy hòa", "tuy hoa", "cà mau", "ca mau", "liên khương", "lien khuong",
    "điện biên", "dien bien", "quy nhơn", "quy nhon", "thanh hóa", "thanh hoa",
]);

function isDomesticFlight(fromCity: string, toCity: string): boolean {
    return VN_CITIES.has(fromCity.toLowerCase()) && VN_CITIES.has(toCity.toLowerCase());
}

function PolicyTag({ ok, label }: { ok: boolean; label: string }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            fontSize: "0.8rem",
            color: ok ? "#00875a" : "#bf2600",
            textDecoration: ok ? "none" : "line-through",
            opacity: ok ? 1 : 0.75,
        }}>
            <span style={{ fontSize: "0.85rem" }}>{ok ? "✓" : "✗"}</span>
            {label}
        </div>
    );
}

export default function FlightTicketModal({ flight, passengers, adults, childrenCount, infants, onClose }: Props) {
    const router = useRouter();
    const { setBooking } = useBookingStore();
    const [seatClasses, setSeatClasses] = useState<SeatClassInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<SeatClassInfo | null>(null);
    const isClient = useIsClient();

    useEffect(() => {

        api.get(`/api/flights/${flight.flight_id}`)
            .then(res => setSeatClasses(res.data.seat_classes ?? []))
            .finally(() => setLoading(false));
    }, [flight.flight_id]);

    const handleSelect = () => {
        if (!selected) return;
        const basePrice  = selected.price * passengers;
        const taxAndFees = Math.round(basePrice * 0.1);
        setBooking({
            type:            "flight",
            flightId:        flight.flight_id,
            airline:         flight.airline,
            fromCity:        flight.from_city,
            toCity:          flight.to_city,
            departTime:      flight.depart_time,
            arriveTime:      flight.arrive_time,
            seatClass:       selected.seat_class,
            passengers,
            adultsCount:     adults,
            childrenCount,
            infantsCount:    infants,
            basePrice,
            taxAndFees,
            totalPrice:      basePrice + taxAndFees,
            isInternational: !isDomesticFlight(flight.from_city, flight.to_city),
        });
        onClose();
        router.push("/booking");
    };

    if (!isClient) return null;

    return createPortal(
        <>
            <style>{`
                .ftm-overlay {
                    position: fixed; inset: 0; z-index: 9999;
                    background: rgba(0,0,0,0.5); backdrop-filter: blur(3px);
                    display: flex; align-items: center; justify-content: center;
                    padding: 1rem; animation: fadeIn 0.2s ease;
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .ftm-modal {
                    background: #fff; border-radius: 16px;
                    width: 100%; max-width: 860px; max-height: 90vh;
                    overflow-y: auto; box-shadow: 0 24px 60px rgba(0,0,0,0.25);
                    animation: slideUp 0.25s ease;
                }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .ftm-header {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 1.25rem 1.5rem; border-bottom: 1px solid #e8f0fe;
                    position: sticky; top: 0; background: #fff; z-index: 10;
                }
                .ftm-title { font-family: 'Nunito', sans-serif; font-size: 1.1rem; font-weight: 700; color: #1a3c6b; }
                .ftm-close {
                    width: 32px; height: 32px; border-radius: 50%;
                    border: 1.5px solid #e8f0fe; background: #f0f4ff;
                    cursor: pointer; font-size: 1rem; color: #6b8cbf;
                    display: flex; align-items: center; justify-content: center;
                }
                .ftm-close:hover { background: #dde9ff; color: #0052cc; }
                .ftm-flight-info {
                    background: #f0f4ff; margin: 1rem 1.5rem;
                    border-radius: 12px; padding: 1rem 1.25rem;
                    display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;
                }
                .ftm-tab { background: #0052cc; color: #fff; padding: 0.3rem 0.85rem; border-radius: 99px; font-size: 0.78rem; font-weight: 600; }
                .ftm-route { display: flex; align-items: center; gap: 0.75rem; font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700; color: #1a3c6b; }
                .ftm-date { font-size: 0.82rem; color: #6b8cbf; }
                .ftm-airline-info { margin-left: auto; text-align: right; }
                .ftm-airline-name { font-size: 0.88rem; font-weight: 600; color: #1a3c6b; }
                .ftm-time-range { font-size: 0.82rem; color: #6b8cbf; }
                .ftm-tickets {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 1rem; padding: 0 1.5rem 1.5rem;
                }
                .ftm-ticket {
                    border: 2px solid #e8f0fe; border-radius: 14px; padding: 1.25rem;
                    cursor: pointer; display: flex; flex-direction: column; gap: 0.75rem;
                    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
                }
                .ftm-ticket:hover:not(.disabled) { border-color: #0052cc; box-shadow: 0 4px 16px rgba(0,82,204,0.1); }
                .ftm-ticket.selected { border-color: #0052cc; background: #f0f4ff; box-shadow: 0 4px 16px rgba(0,82,204,0.15); }
                .ftm-ticket.disabled { opacity: 0.5; cursor: not-allowed; }
                .ftm-select-btn {
                    width: 100%; padding: 0.6rem;
                    background: linear-gradient(135deg,#0052cc,#0065ff);
                    color: #fff; border: none; border-radius: 8px;
                    font-size: 0.85rem; font-weight: 600; cursor: pointer;
                    transition: opacity 0.15s; margin-top: auto;
                }
                .ftm-select-btn:disabled { opacity: 0.45; cursor: not-allowed; }
                .ftm-footer {
                    padding: 1rem 1.5rem; border-top: 1px solid #e8f0fe;
                    display: flex; align-items: center; justify-content: space-between;
                    position: sticky; bottom: 0; background: #fff;
                }
                .ftm-confirm-btn {
                    padding: 0.65rem 1.75rem; background: linear-gradient(135deg,#0052cc,#0065ff);
                    color: #fff; border: none; border-radius: 10px;
                    font-family: 'Nunito', sans-serif; font-size: 0.95rem; font-weight: 700;
                    cursor: pointer; transition: opacity 0.15s, transform 0.15s;
                }
                .ftm-confirm-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
                .ftm-confirm-btn:disabled { opacity: 0.45; cursor: not-allowed; }
                .ftm-loading { display: flex; justify-content: center; align-items: center; padding: 3rem; }
                .ftm-spinner { width: 32px; height: 32px; border: 3px solid #e8f0fe; border-top-color: #0052cc; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .ftm-divider { height: 1px; background: #f0f4ff; margin: 0.25rem 0; }
            `}</style>

            <div className="ftm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                <div className="ftm-modal">
                    <div className="ftm-header">
                        <div className="ftm-title">✈️ Chọn hạng vé</div>
                        <button className="ftm-close" onClick={onClose}>✕</button>
                    </div>

                    <div className="ftm-flight-info">
                        <span className="ftm-tab">Khởi hành</span>
                        <div className="ftm-route">
                            <span>{flight.from_city}</span>
                            <span style={{ color: "#6b8cbf" }}>→</span>
                            <span>{flight.to_city}</span>
                        </div>
                        <span className="ftm-date">{formatDate(flight.depart_time)}</span>
                        <div className="ftm-airline-info">
                            <div className="ftm-airline-name">{flight.airline}</div>
                            <div className="ftm-time-range">{formatTime(flight.depart_time)} → {formatTime(flight.arrive_time)}</div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="ftm-loading"><div className="ftm-spinner" /></div>
                    ) : (
                        <div className="ftm-tickets">
                            {seatClasses.map((sc) => {
                                const notEnough  = sc.available < passengers;
                                const isSelected = selected?.seat_class === sc.seat_class;
                                const totalPrice = sc.price * passengers;

                                return (
                                    <div
                                        key={sc.seat_class}
                                        className={`ftm-ticket${isSelected ? " selected" : ""}${notEnough ? " disabled" : ""}`}
                                        onClick={() => !notEnough && setSelected(sc)}
                                    >
                                        {/* Header: class name + availability */}
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b8cbf", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                                {sc.label}
                                            </div>
                                            <span style={{
                                                fontSize: "0.72rem", fontWeight: 700,
                                                padding: "0.15rem 0.55rem", borderRadius: 99,
                                                background: notEnough ? "#fff0f0" : sc.available <= 5 ? "#fff8e1" : "#e6f9f0",
                                                color: notEnough ? "#c0392b" : sc.available <= 5 ? "#b8860b" : "#00875a",
                                                border: `1px solid ${notEnough ? "#ffcdd2" : sc.available <= 5 ? "#ffe082" : "#b7dfbb"}`,
                                            }}>
                                                {notEnough ? "Hết chỗ" : `${sc.available} ghế`}
                                            </span>
                                        </div>

                                        {/* Price */}
                                        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: "1.2rem", fontWeight: 800, color: "#1a3c6b" }}>
                                            {totalPrice.toLocaleString("vi-VN")}₫
                                            {passengers > 1 && <span style={{ fontSize: "0.78rem", fontWeight: 400, color: "#6b8cbf" }}> / {passengers} khách</span>}
                                        </div>

                                        <div className="ftm-divider" />

                                        {/* Baggage */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.82rem", color: "#4a5568" }}>
                                                <span>🎒</span> Xách tay {sc.carry_on_kg} kg
                                            </div>
                                            <div style={{
                                                display: "flex", alignItems: "center", gap: "0.45rem",
                                                fontSize: "0.82rem",
                                                color: sc.checked_bag_kg > 0 ? "#4a5568" : "#b0bcd8",
                                                textDecoration: sc.checked_bag_kg === 0 ? "line-through" : "none",
                                            }}>
                                                <span>🧳</span>
                                                {sc.checked_bag_kg > 0 ? `Ký gửi ${sc.checked_bag_kg} kg` : "Không có ký gửi"}
                                            </div>
                                        </div>

                                        <div className="ftm-divider" />

                                        {/* Policy */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                            <PolicyTag
                                                ok={sc.allows_reschedule}
                                                label={sc.allows_reschedule
                                                    ? `Đổi vé${sc.reschedule_fee_percent > 0 ? ` (phí ${sc.reschedule_fee_percent}%)` : " miễn phí"}`
                                                    : "Không được đổi vé"}
                                            />
                                            <PolicyTag
                                                ok={sc.refund_on_cancel}
                                                label={sc.refund_on_cancel
                                                    ? `Hoàn vé${sc.cancel_fee_percent > 0 ? ` (phí ${sc.cancel_fee_percent}%)` : " miễn phí"}`
                                                    : `Không hoàn vé${sc.cancel_fee_percent > 0 ? ` + phí hủy ${sc.cancel_fee_percent}%` : ""}`}
                                            />
                                            {(sc.allows_reschedule || sc.allows_cancel) && sc.min_hours_before > 0 && (
                                                <div style={{ fontSize: "0.75rem", color: "#6b8cbf", marginTop: "0.1rem" }}>
                                                    ⏱ Trước ít nhất {sc.min_hours_before} giờ
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            className="ftm-select-btn"
                                            disabled={notEnough}
                                            onClick={(e) => { e.stopPropagation(); if (!notEnough) setSelected(sc); }}
                                            style={{ background: isSelected ? "linear-gradient(135deg,#003580,#0052cc)" : undefined }}
                                        >
                                            {notEnough ? "Hết chỗ" : isSelected ? "✓ Đã chọn" : "Chọn"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="ftm-footer">
                        <div>
                            {selected ? (
                                <>
                                    <div style={{ fontSize: "0.88rem", color: "#6b8cbf" }}>{selected.label} · {passengers} khách</div>
                                    <div style={{ fontFamily: "Nunito, sans-serif", fontSize: "1.1rem", fontWeight: 800, color: ACCENT }}>
                                        {(selected.price * passengers).toLocaleString("vi-VN")}₫
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: "0.88rem", color: "#6b8cbf" }}>Chưa chọn hạng vé</div>
                            )}
                        </div>
                        <button className="ftm-confirm-btn" disabled={!selected} onClick={handleSelect}>
                            Tiếp tục →
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}
