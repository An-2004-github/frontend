"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const useIsClient = () =>
    useSyncExternalStore(() => () => {}, () => true, () => false);
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Bus } from "@/types/bus";
import { useBookingStore } from "@/store/bookingStore";

interface SeatClassInfo {
    seat_class:             "standard" | "vip" | "sleeper";
    label:                  string;
    available:              number;
    price:                  number;
    allows_reschedule:      boolean;
    allows_cancel:          boolean;
    refund_on_cancel:       boolean;
    reschedule_fee_percent: number;
    cancel_fee_percent:     number;
    min_hours_before:       number;
}

interface Props {
    bus:        Bus;
    passengers: number;
    onClose:    () => void;
}

const SEAT_ICON: Record<string, string> = {
    standard: "💺",
    vip:      "🪑",
    sleeper:  "🛌",
};
const SEAT_DESC: Record<string, string> = {
    standard: "Ghế ngồi thông thường",
    vip:      "Ghế ngồi nệm êm, rộng hơn",
    sleeper:  "Giường nằm thoải mái",
};

function formatTime(s: string) {
    return new Date(s).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function formatDate(s: string) {
    return new Date(s).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
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
            <span>{ok ? "✓" : "✗"}</span>
            {label}
        </div>
    );
}

export default function BusTicketModal({ bus, passengers, onClose }: Props) {
    const router = useRouter();
    const { setBooking } = useBookingStore();
    const [seatClasses, setSeatClasses] = useState<SeatClassInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<SeatClassInfo | null>(null);
    const isClient = useIsClient();

    useEffect(() => {
        api.get(`/api/buses/${bus.bus_id}`)
            .then(res => setSeatClasses(res.data.seat_classes ?? []))
            .finally(() => setLoading(false));
    }, [bus.bus_id]);

    const handleSelect = () => {
        if (!selected) return;
        const basePrice  = selected.price * passengers;
        const taxAndFees = Math.round(basePrice * 0.05);
        setBooking({
            type:       "bus",
            busId:      bus.bus_id,
            company:    bus.company,
            fromCity:   bus.from_city,
            toCity:     bus.to_city,
            departTime: bus.depart_time,
            arriveTime: bus.arrive_time,
            seatClass:  selected.seat_class,
            passengers,
            basePrice,
            taxAndFees,
            totalPrice: basePrice + taxAndFees,
        });
        onClose();
        router.push("/booking");
    };

    if (!isClient) return null;

    return createPortal(
        <>
            <style>{`
                .btm-overlay {
                    position: fixed; inset: 0; z-index: 9999;
                    background: rgba(0,0,0,0.5); backdrop-filter: blur(3px);
                    display: flex; align-items: center; justify-content: center;
                    padding: 1rem; animation: fadeIn 0.2s ease;
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .btm-modal {
                    background: #fff; border-radius: 16px;
                    width: 100%; max-width: 860px; max-height: 90vh;
                    overflow-y: auto; box-shadow: 0 24px 60px rgba(0,0,0,0.25);
                    animation: slideUp 0.25s ease;
                }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .btm-header {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 1.25rem 1.5rem; border-bottom: 1px solid #e8f0fe;
                    position: sticky; top: 0; background: #fff; z-index: 10;
                }
                .btm-title { font-family: 'Nunito', sans-serif; font-size: 1.1rem; font-weight: 700; color: #1a3c6b; }
                .btm-close {
                    width: 32px; height: 32px; border-radius: 50%;
                    border: 1.5px solid #e8f0fe; background: #f0f4ff;
                    cursor: pointer; font-size: 1rem; color: #6b8cbf;
                    display: flex; align-items: center; justify-content: center;
                }
                .btm-close:hover { background: #dde9ff; color: #00875a; }
                .btm-info {
                    background: #f0f4ff; margin: 1rem 1.5rem;
                    border-radius: 12px; padding: 1rem 1.25rem;
                    display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;
                }
                .btm-tab { background: #00875a; color: #fff; padding: 0.3rem 0.85rem; border-radius: 99px; font-size: 0.78rem; font-weight: 600; }
                .btm-route { display: flex; align-items: center; gap: 0.75rem; font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700; color: #1a3c6b; }
                .btm-date { font-size: 0.82rem; color: #6b8cbf; }
                .btm-company-info { margin-left: auto; text-align: right; }
                .btm-company-name { font-size: 0.88rem; font-weight: 600; color: #1a3c6b; }
                .btm-time-range { font-size: 0.82rem; color: #6b8cbf; }
                .btm-tickets {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                    gap: 1rem; padding: 0 1.5rem 1.5rem;
                }
                .btm-ticket {
                    border: 2px solid #e8f0fe; border-radius: 14px; padding: 1.25rem;
                    cursor: pointer; display: flex; flex-direction: column; gap: 0.75rem;
                    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
                }
                .btm-ticket:hover:not(.disabled) { border-color: #00875a; box-shadow: 0 4px 16px rgba(0,135,90,0.1); }
                .btm-ticket.selected { border-color: #00875a; background: #e6f9f0; box-shadow: 0 4px 16px rgba(0,135,90,0.15); }
                .btm-ticket.disabled { opacity: 0.5; cursor: not-allowed; }
                .btm-divider { height: 1px; background: #f0f4ff; margin: 0.1rem 0; }
                .btm-select-btn {
                    width: 100%; padding: 0.6rem;
                    background: linear-gradient(135deg,#00875a,#00a36c);
                    color: #fff; border: none; border-radius: 8px;
                    font-size: 0.85rem; font-weight: 600; cursor: pointer;
                    transition: opacity 0.15s; margin-top: auto;
                }
                .btm-select-btn:disabled { opacity: 0.45; cursor: not-allowed; }
                .btm-footer {
                    padding: 1rem 1.5rem; border-top: 1px solid #e8f0fe;
                    display: flex; align-items: center; justify-content: space-between;
                    position: sticky; bottom: 0; background: #fff;
                }
                .btm-confirm-btn {
                    padding: 0.65rem 1.75rem; background: linear-gradient(135deg,#00875a,#00a36c);
                    color: #fff; border: none; border-radius: 10px;
                    font-family: 'Nunito', sans-serif; font-size: 0.95rem; font-weight: 700;
                    cursor: pointer; transition: opacity 0.15s, transform 0.15s;
                }
                .btm-confirm-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
                .btm-confirm-btn:disabled { opacity: 0.45; cursor: not-allowed; }
                .btm-loading { display: flex; justify-content: center; align-items: center; padding: 3rem; }
                .btm-spinner { width: 32px; height: 32px; border: 3px solid #e8f0fe; border-top-color: #00875a; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div className="btm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                <div className="btm-modal">
                    <div className="btm-header">
                        <div className="btm-title">🚌 Chọn loại ghế</div>
                        <button className="btm-close" onClick={onClose}>✕</button>
                    </div>

                    <div className="btm-info">
                        <span className="btm-tab">🚌 Khởi hành</span>
                        <div className="btm-route">
                            <span>{bus.from_city}</span>
                            <span style={{ color: "#6b8cbf" }}>→</span>
                            <span>{bus.to_city}</span>
                        </div>
                        <span className="btm-date">{formatDate(bus.depart_time)}</span>
                        <div className="btm-company-info">
                            <div className="btm-company-name">{bus.company}</div>
                            <div className="btm-time-range">{formatTime(bus.depart_time)} → {formatTime(bus.arrive_time)}</div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="btm-loading"><div className="btm-spinner" /></div>
                    ) : (
                        <div className="btm-tickets">
                            {seatClasses.map((sc) => {
                                const notEnough  = sc.available < passengers;
                                const isSelected = selected?.seat_class === sc.seat_class;
                                const totalPrice = sc.price * passengers;
                                return (
                                    <div
                                        key={sc.seat_class}
                                        className={`btm-ticket${isSelected ? " selected" : ""}${notEnough ? " disabled" : ""}`}
                                        onClick={() => !notEnough && setSelected(sc)}
                                    >
                                        {/* Header */}
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                <span style={{ fontSize: "1.5rem" }}>{SEAT_ICON[sc.seat_class] ?? "💺"}</span>
                                                <div>
                                                    <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "#1a3c6b" }}>{sc.label}</div>
                                                    <div style={{ fontSize: "0.75rem", color: "#6b8cbf" }}>{SEAT_DESC[sc.seat_class] ?? ""}</div>
                                                </div>
                                            </div>
                                            <span style={{
                                                fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.55rem", borderRadius: 99,
                                                background: notEnough ? "#fff0f0" : sc.available <= 5 ? "#fff8e1" : "#e6f9f0",
                                                color: notEnough ? "#c0392b" : sc.available <= 5 ? "#b8860b" : "#00875a",
                                                border: `1px solid ${notEnough ? "#ffcdd2" : sc.available <= 5 ? "#ffe082" : "#b7dfbb"}`,
                                            }}>
                                                {notEnough ? "Hết chỗ" : `${sc.available} ghế`}
                                            </span>
                                        </div>

                                        {/* Price */}
                                        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: "1.15rem", fontWeight: 800, color: "#1a3c6b" }}>
                                            {totalPrice.toLocaleString("vi-VN")}₫
                                            {passengers > 1 && <span style={{ fontSize: "0.78rem", fontWeight: 400, color: "#6b8cbf" }}> / {passengers} khách</span>}
                                        </div>

                                        <div className="btm-divider" />

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
                                                <div style={{ fontSize: "0.75rem", color: "#6b8cbf" }}>⏱ Trước ít nhất {sc.min_hours_before} giờ</div>
                                            )}
                                        </div>

                                        <button
                                            className="btm-select-btn"
                                            disabled={notEnough}
                                            onClick={(e) => { e.stopPropagation(); if (!notEnough) setSelected(sc); }}
                                            style={{ background: isSelected ? "linear-gradient(135deg,#006644,#00875a)" : undefined }}
                                        >
                                            {notEnough ? "Hết chỗ" : isSelected ? "✓ Đã chọn" : "Chọn"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="btm-footer">
                        <div>
                            {selected ? (
                                <>
                                    <div style={{ fontSize: "0.88rem", color: "#6b8cbf" }}>{selected.label} · {passengers} khách</div>
                                    <div style={{ fontFamily: "Nunito, sans-serif", fontSize: "1.1rem", fontWeight: 800, color: "#00875a" }}>
                                        {(selected.price * passengers).toLocaleString("vi-VN")}₫
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: "0.88rem", color: "#6b8cbf" }}>Chưa chọn loại ghế</div>
                            )}
                        </div>
                        <button className="btm-confirm-btn" disabled={!selected} onClick={handleSelect}>
                            Tiếp tục →
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}
