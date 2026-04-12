"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Train, TrainSeatClassInfo } from "@/types/train";
import { useBookingStore } from "@/store/bookingStore";

const SEAT_CLASS_LABEL: Record<string, string> = {
    hard_seat:    "Ngồi cứng",
    soft_seat:    "Ngồi mềm",
    hard_sleeper: "Nằm cứng",
    soft_sleeper: "Nằm mềm",
};
const SEAT_CLASS_ICON: Record<string, string> = {
    hard_seat:    "💺",
    soft_seat:    "🪑",
    hard_sleeper: "🛏",
    soft_sleeper: "🛌",
};
const SEAT_CLASS_DESC: Record<string, string> = {
    hard_seat:    "Ghế ngồi cứng, tiết kiệm nhất",
    soft_seat:    "Ghế ngồi nệm êm, thoải mái",
    hard_sleeper: "Giường nằm 6 chỗ/khoang",
    soft_sleeper: "Giường nằm 4 chỗ/khoang, riêng tư",
};

interface Props {
    train: Train;
    passengers: number;
    onClose: () => void;
}

function formatTime(s: string) {
    return new Date(s).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function formatDate(s: string) {
    return new Date(s).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
}
function formatDuration(m: number) {
    const h = Math.floor(m / 60), mm = m % 60;
    return `${h}g${mm > 0 ? ` ${mm}p` : ""}`;
}

export default function TrainTicketModal({ train, passengers, onClose }: Props) {
    const router = useRouter();
    const { setBooking } = useBookingStore();
    const [seatClasses, setSeatClasses] = useState<TrainSeatClassInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<TrainSeatClassInfo | null>(null);

    useEffect(() => {
        api.get(`/api/trains/${train.train_id}`)
            .then(res => setSeatClasses(res.data.seat_classes ?? []))
            .finally(() => setLoading(false));
    }, [train.train_id]);

    const handleConfirm = () => {
        if (!selected) return;
        const basePrice = selected.price * passengers;
        const taxAndFees = Math.round(basePrice * 0.05);
        setBooking({
            type: "train",
            trainId: train.train_id,
            trainCode: train.train_code,
            fromCity: train.from_city,
            toCity: train.to_city,
            fromStation: train.from_station,
            toStation: train.to_station,
            departTime: train.depart_time,
            arriveTime: train.arrive_time,
            seatClass: selected.seat_class,
            seatClassName: SEAT_CLASS_LABEL[selected.seat_class] ?? selected.seat_class,
            passengers,
            basePrice,
            taxAndFees,
            totalPrice: basePrice + taxAndFees,
        });
        onClose();
        router.push("/booking");
    };

    const totalPrice = selected ? selected.price * passengers : 0;

    return createPortal(
        <>
            <style>{`
                .ttm-overlay {
                    position: fixed; inset: 0; z-index: 9999;
                    background: rgba(0,0,0,0.5); backdrop-filter: blur(3px);
                    display: flex; align-items: center; justify-content: center;
                    padding: 1rem; animation: fadeIn 0.2s ease;
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .ttm-modal {
                    background: #fff; border-radius: 16px;
                    width: 100%; max-width: 680px; max-height: 90vh;
                    overflow-y: auto; box-shadow: 0 24px 60px rgba(0,0,0,0.25);
                    animation: slideUp 0.25s ease;
                }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .ttm-header {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 1.25rem 1.5rem; border-bottom: 1px solid #e8f0fe;
                    position: sticky; top: 0; background: #fff; z-index: 10;
                }
                .ttm-title { font-family: 'Nunito', sans-serif; font-size: 1.1rem; font-weight: 700; color: #1a3c6b; }
                .ttm-close {
                    width: 32px; height: 32px; border-radius: 50%;
                    border: 1.5px solid #e8f0fe; background: #f0f4ff;
                    cursor: pointer; font-size: 1rem; color: #6b8cbf;
                    display: flex; align-items: center; justify-content: center;
                    transition: background 0.15s;
                }
                .ttm-close:hover { background: #dde9ff; color: #0052cc; }
                .ttm-info {
                    background: #f0f4ff; margin: 1rem 1.5rem;
                    border-radius: 12px; padding: 1rem 1.25rem;
                    display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;
                }
                .ttm-badge {
                    background: #003580; color: #fff;
                    padding: 0.3rem 0.85rem; border-radius: 99px;
                    font-size: 0.78rem; font-weight: 700;
                }
                .ttm-route {
                    font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700; color: #1a3c6b;
                    display: flex; align-items: center; gap: 0.5rem;
                }
                .ttm-route-arrow { color: #6b8cbf; }
                .ttm-date { font-size: 0.82rem; color: #6b8cbf; }
                .ttm-time-wrap { margin-left: auto; text-align: right; }
                .ttm-time { font-size: 0.88rem; font-weight: 600; color: #1a3c6b; }
                .ttm-duration { font-size: 0.78rem; color: #6b8cbf; }

                .ttm-classes { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; padding: 0 1.5rem 1.5rem; }
                .ttm-class {
                    border: 2px solid #e8f0fe; border-radius: 14px; padding: 1.25rem;
                    cursor: pointer; transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
                    display: flex; flex-direction: column; gap: 0.75rem;
                }
                .ttm-class:hover { border-color: #003580; box-shadow: 0 4px 16px rgba(0,53,128,0.1); }
                .ttm-class.selected { border-color: #003580; background: #f0f4ff; box-shadow: 0 4px 16px rgba(0,53,128,0.15); }
                .ttm-class.disabled { opacity: 0.45; cursor: not-allowed; }
                .ttm-class-header { display: flex; align-items: center; justify-content: space-between; }
                .ttm-class-icon { font-size: 1.8rem; }
                .ttm-avail {
                    font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.55rem;
                    border-radius: 99px;
                }
                .ttm-class-name { font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700; color: #1a3c6b; }
                .ttm-class-desc { font-size: 0.8rem; color: #6b8cbf; }
                .ttm-class-price { font-family: 'Nunito', sans-serif; font-size: 1.2rem; font-weight: 800; color: #003580; }
                .ttm-class-price span { font-size: 0.78rem; font-weight: 400; color: #6b8cbf; }
                .ttm-select-btn {
                    width: 100%; padding: 0.6rem;
                    background: linear-gradient(135deg, #003580, #0052cc);
                    color: #fff; border: none; border-radius: 8px;
                    font-size: 0.85rem; font-weight: 600; cursor: pointer;
                    transition: opacity 0.15s; margin-top: auto;
                }
                .ttm-select-btn:hover { opacity: 0.88; }
                .ttm-footer {
                    padding: 1rem 1.5rem; border-top: 1px solid #e8f0fe;
                    display: flex; align-items: center; justify-content: space-between;
                    position: sticky; bottom: 0; background: #fff;
                }
                .ttm-sel-info { font-size: 0.88rem; color: #6b8cbf; }
                .ttm-sel-price { font-family: 'Nunito', sans-serif; font-size: 1.1rem; font-weight: 800; color: #003580; }
                .ttm-confirm-btn {
                    padding: 0.65rem 1.75rem;
                    background: linear-gradient(135deg, #003580, #0052cc);
                    color: #fff; border: none; border-radius: 10px;
                    font-family: 'Nunito', sans-serif; font-size: 0.95rem; font-weight: 700;
                    cursor: pointer; transition: opacity 0.15s, transform 0.15s;
                }
                .ttm-confirm-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
                .ttm-confirm-btn:disabled { opacity: 0.45; cursor: not-allowed; }
                .ttm-loading { display: flex; justify-content: center; align-items: center; padding: 3rem; }
                .ttm-spinner { width: 32px; height: 32px; border: 3px solid #e8f0fe; border-top-color: #003580; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div className="ttm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                <div className="ttm-modal">
                    <div className="ttm-header">
                        <div className="ttm-title">🚆 Chọn hạng ghế</div>
                        <button className="ttm-close" onClick={onClose}>✕</button>
                    </div>

                    <div className="ttm-info">
                        <span className="ttm-badge">{train.train_code}</span>
                        <div className="ttm-route">
                            <span>{train.from_city}</span>
                            <span className="ttm-route-arrow">→</span>
                            <span>{train.to_city}</span>
                        </div>
                        <span className="ttm-date">{formatDate(train.depart_time)}</span>
                        <div className="ttm-time-wrap">
                            <div className="ttm-time">{formatTime(train.depart_time)} → {formatTime(train.arrive_time)}</div>
                            <div className="ttm-duration">{formatDuration(train.duration_minutes)}</div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="ttm-loading"><div className="ttm-spinner" /></div>
                    ) : (
                        <div className="ttm-classes">
                            {seatClasses.map((sc) => {
                                const notEnough = sc.available < passengers;
                                const isSelected = selected?.seat_class === sc.seat_class;
                                const label = SEAT_CLASS_LABEL[sc.seat_class] ?? sc.seat_class;
                                const icon = SEAT_CLASS_ICON[sc.seat_class] ?? "💺";
                                const desc = SEAT_CLASS_DESC[sc.seat_class] ?? "";
                                return (
                                    <div
                                        key={sc.seat_class}
                                        className={`ttm-class${isSelected ? " selected" : ""}${notEnough ? " disabled" : ""}`}
                                        onClick={() => !notEnough && setSelected(sc)}
                                    >
                                        <div className="ttm-class-header">
                                            <span className="ttm-class-icon">{icon}</span>
                                            <span className="ttm-avail" style={{
                                                background: notEnough ? "#fff0f0" : sc.available <= 10 ? "#fff8e1" : "#e6f9f0",
                                                color: notEnough ? "#c0392b" : sc.available <= 10 ? "#b8860b" : "#00875a",
                                                border: `1px solid ${notEnough ? "#ffcdd2" : sc.available <= 10 ? "#ffe082" : "#b7dfbb"}`,
                                            }}>
                                                {notEnough ? "Hết chỗ" : `${sc.available} chỗ trống`}
                                            </span>
                                        </div>
                                        <div className="ttm-class-name">{label}</div>
                                        <div className="ttm-class-desc">{desc}</div>
                                        <div className="ttm-class-price">
                                            {(sc.price * passengers).toLocaleString("vi-VN")}₫
                                            {passengers > 1 && <span> / {passengers} khách</span>}
                                        </div>
                                        <button
                                            className="ttm-select-btn"
                                            disabled={notEnough}
                                            onClick={(e) => { e.stopPropagation(); if (!notEnough) setSelected(sc); }}
                                        >
                                            {notEnough ? "Hết chỗ" : isSelected ? "✓ Đã chọn" : "Chọn"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="ttm-footer">
                        <div>
                            {selected ? (
                                <>
                                    <div className="ttm-sel-info">
                                        {SEAT_CLASS_LABEL[selected.seat_class]} · {passengers} khách
                                    </div>
                                    <div className="ttm-sel-price">
                                        {totalPrice.toLocaleString("vi-VN")}₫
                                    </div>
                                </>
                            ) : (
                                <div className="ttm-sel-info">Chưa chọn hạng ghế</div>
                            )}
                        </div>
                        <button
                            className="ttm-confirm-btn"
                            disabled={!selected}
                            onClick={handleConfirm}
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
