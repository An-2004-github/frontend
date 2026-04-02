"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Bus } from "@/types/bus";
import { useBookingStore } from "@/store/bookingStore";

interface TicketOption {
    seat_id: number;
    label: string;
    seat_class: "standard" | "vip" | "sleeper";
    price_modifier: number;
    carry_on_kg: number;
    checked_bag_kg: number;
    is_refundable: boolean;
    is_changeable: boolean;
    is_booked: boolean;
    available_count: number;
}

interface Props {
    bus: Bus;
    passengers: number;
    onClose: () => void;
}

const CLASS_LABELS: Record<string, string> = {
    standard: "Ghế thường",
    vip: "Ghế VIP",
    sleeper: "Giường nằm",
};

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("vi-VN", {
        hour: "2-digit", minute: "2-digit", hour12: false,
    });
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
        weekday: "short", day: "2-digit", month: "long", year: "numeric",
    });
}

export default function BusTicketModal({ bus, passengers, onClose }: Props) {
    const router = useRouter();
    const { setBooking } = useBookingStore();
    const [tickets, setTickets] = useState<TicketOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<TicketOption | null>(null);

    useEffect(() => {
        api.get(`/api/buses/${bus.bus_id}`)
            .then(res => {
                const seats: TicketOption[] = res.data.seats ?? [];
                const countMap: Record<string, number> = {};
                seats.forEach(s => {
                    if (!s.is_booked) {
                        const key = s.label ?? s.seat_class;
                        countMap[key] = (countMap[key] || 0) + 1;
                    }
                });
                const repMap: Record<string, TicketOption> = {};
                seats.forEach(s => {
                    if (!s.is_booked) {
                        const key = s.label ?? s.seat_class;
                        if (!repMap[key]) repMap[key] = s;
                    }
                });
                const unique = Object.keys(repMap).map(key => ({
                    ...repMap[key],
                    available_count: countMap[key] ?? 0,
                }));
                setTickets(unique);
            })
            .finally(() => setLoading(false));
    }, [bus.bus_id]);

    const price = (t: TicketOption) =>
        Math.round(bus.price * t.price_modifier * passengers);

    const handleSelect = () => {
        if (!selected) return;
        const basePrice = Math.round(bus.price * selected.price_modifier * passengers);
        const taxAndFees = Math.round(basePrice * 0.05);
        setBooking({
            type: "bus",
            busId: bus.bus_id,
            company: bus.company,
            fromCity: bus.from_city,
            toCity: bus.to_city,
            departTime: bus.depart_time,
            arriveTime: bus.arrive_time,
            passengers,
            basePrice,
            taxAndFees,
            totalPrice: basePrice + taxAndFees,
        });
        onClose();
        router.push("/booking");
    };

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
                    transition: background 0.15s;
                }
                .btm-close:hover { background: #dde9ff; color: #0052cc; }
                .btm-bus-info {
                    background: #f0f4ff; margin: 1rem 1.5rem;
                    border-radius: 12px; padding: 1rem 1.25rem;
                    display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;
                }
                .btm-tab {
                    background: #00875a; color: #fff;
                    padding: 0.3rem 0.85rem; border-radius: 99px;
                    font-size: 0.78rem; font-weight: 600;
                }
                .btm-route {
                    display: flex; align-items: center; gap: 0.75rem;
                    font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700; color: #1a3c6b;
                }
                .btm-route-arrow { color: #6b8cbf; font-size: 0.9rem; }
                .btm-date { font-size: 0.82rem; color: #6b8cbf; }
                .btm-company-info { margin-left: auto; text-align: right; }
                .btm-company-name { font-size: 0.88rem; font-weight: 600; color: #1a3c6b; }
                .btm-time-range { font-size: 0.82rem; color: #6b8cbf; }
                .btm-tickets {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                    gap: 1rem; padding: 0 1.5rem 1.5rem;
                }
                .btm-ticket {
                    border: 2px solid #e8f0fe; border-radius: 14px;
                    padding: 1.25rem; cursor: pointer;
                    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
                    display: flex; flex-direction: column; gap: 0.85rem;
                }
                .btm-ticket:hover { border-color: #00875a; box-shadow: 0 4px 16px rgba(0,135,90,0.1); }
                .btm-ticket.selected { border-color: #00875a; background: #e6f9f0; box-shadow: 0 4px 16px rgba(0,135,90,0.15); }
                .btm-ticket-class { font-size: 0.72rem; font-weight: 600; color: #6b8cbf; text-transform: uppercase; letter-spacing: 0.5px; }
                .btm-ticket-price { font-family: 'Nunito', sans-serif; font-size: 1.2rem; font-weight: 800; color: #1a3c6b; }
                .btm-ticket-price span { font-size: 0.78rem; font-weight: 400; color: #6b8cbf; }
                .btm-ticket-label { font-size: 0.9rem; font-weight: 600; color: #00875a; }
                .btm-features { display: flex; flex-direction: column; gap: 0.45rem; }
                .btm-feature { display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: #4a5568; }
                .btm-feature-icon { font-size: 0.9rem; flex-shrink: 0; }
                .btm-feature.no { color: #b0bcd8; text-decoration: line-through; }
                .btm-select-btn {
                    width: 100%; padding: 0.6rem;
                    background: linear-gradient(135deg, #00875a, #00a36c);
                    color: #fff; border: none; border-radius: 8px;
                    font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 600;
                    cursor: pointer; transition: opacity 0.15s; margin-top: auto;
                }
                .btm-select-btn:hover { opacity: 0.88; }
                .btm-select-btn:disabled { opacity: 0.45; cursor: not-allowed; }
                .btm-footer {
                    padding: 1rem 1.5rem; border-top: 1px solid #e8f0fe;
                    display: flex; align-items: center; justify-content: space-between;
                    position: sticky; bottom: 0; background: #fff;
                }
                .btm-selected-info { font-size: 0.88rem; color: #6b8cbf; }
                .btm-selected-price { font-family: 'Nunito', sans-serif; font-size: 1.1rem; font-weight: 800; color: #00875a; }
                .btm-confirm-btn {
                    padding: 0.65rem 1.75rem;
                    background: linear-gradient(135deg, #00875a, #00a36c);
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
                    {/* Header */}
                    <div className="btm-header">
                        <div className="btm-title">Chọn loại ghế</div>
                        <button className="btm-close" onClick={onClose}>✕</button>
                    </div>

                    {/* Bus info strip */}
                    <div className="btm-bus-info">
                        <span className="btm-tab">🚌 Khởi hành</span>
                        <div className="btm-route">
                            <span>{bus.from_city}</span>
                            <span className="btm-route-arrow">→</span>
                            <span>{bus.to_city}</span>
                        </div>
                        <span className="btm-date">{formatDate(bus.depart_time)}</span>
                        <div className="btm-company-info">
                            <div className="btm-company-name">{bus.company}</div>
                            <div className="btm-time-range">
                                {formatTime(bus.depart_time)} → {formatTime(bus.arrive_time)}
                            </div>
                        </div>
                    </div>

                    {/* Ticket options */}
                    {loading ? (
                        <div className="btm-loading"><div className="btm-spinner" /></div>
                    ) : (
                        <div className="btm-tickets">
                            {tickets.map((t) => {
                                const notEnough = t.available_count < passengers;
                                const isSelected = selected?.seat_id === t.seat_id;
                                return (
                                    <div
                                        key={t.seat_id}
                                        className={`btm-ticket${isSelected ? " selected" : ""}`}
                                        onClick={() => !notEnough && setSelected(t)}
                                        style={notEnough ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div className="btm-ticket-class">{CLASS_LABELS[t.seat_class] ?? t.seat_class}</div>
                                            <span style={{
                                                fontSize: "0.72rem", fontWeight: 700,
                                                padding: "0.15rem 0.55rem", borderRadius: 99,
                                                background: notEnough ? "#fff0f0" : t.available_count <= 5 ? "#fff8e1" : "#e6f9f0",
                                                color: notEnough ? "#c0392b" : t.available_count <= 5 ? "#b8860b" : "#00875a",
                                                border: `1px solid ${notEnough ? "#ffcdd2" : t.available_count <= 5 ? "#ffe082" : "#b7dfbb"}`,
                                            }}>
                                                {notEnough ? "Hết chỗ" : `${t.available_count} ghế trống`}
                                            </span>
                                        </div>

                                        <div className="btm-ticket-price">
                                            {price(t).toLocaleString("vi-VN")} VND
                                            <span>/khách</span>
                                        </div>
                                        <div className="btm-ticket-label">{t.label}</div>

                                        <div className="btm-features">
                                            <div className="btm-feature">
                                                <span className="btm-feature-icon">🎒</span>
                                                Hành lý xách tay {t.carry_on_kg} kg
                                            </div>
                                            <div className={`btm-feature${t.checked_bag_kg === 0 ? " no" : ""}`}>
                                                <span className="btm-feature-icon">🧳</span>
                                                {t.checked_bag_kg > 0
                                                    ? `Hành lý ký gửi ${t.checked_bag_kg} kg`
                                                    : "Không có hành lý ký gửi"}
                                            </div>
                                            <div className={`btm-feature${!t.is_changeable ? " no" : ""}`}>
                                                <span className="btm-feature-icon">🔄</span>
                                                {t.is_changeable ? "Cho phép đổi vé" : "Không áp dụng đổi vé"}
                                            </div>
                                            <div className={`btm-feature${!t.is_refundable ? " no" : ""}`}>
                                                <span className="btm-feature-icon">💳</span>
                                                {t.is_refundable ? "Cho phép hoàn vé" : "Không áp dụng hoàn vé"}
                                            </div>
                                        </div>

                                        <button
                                            className="btm-select-btn"
                                            disabled={notEnough}
                                            onClick={(e) => { e.stopPropagation(); if (!notEnough) setSelected(t); }}
                                        >
                                            {notEnough ? "Hết chỗ" : isSelected ? "✓ Đã chọn" : "Chọn"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="btm-footer">
                        <div>
                            {selected ? (
                                <>
                                    <div className="btm-selected-info">{selected.label} · {passengers} khách</div>
                                    <div className="btm-selected-price">{price(selected).toLocaleString("vi-VN")}₫</div>
                                </>
                            ) : (
                                <div className="btm-selected-info">Chưa chọn loại ghế</div>
                            )}
                        </div>
                        <button
                            className="btm-confirm-btn"
                            disabled={!selected}
                            onClick={handleSelect}
                        >
                            Tiếp tục →
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}
