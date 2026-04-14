"use client";

import { useState } from "react";
import { Bus } from "@/types/bus";
import BusTicketModal from "./BusTicketModal";
import { logInteraction } from "@/lib/logInteraction";

interface Props {
    bus: Bus;
    passengers?: number;
}

const COMPANY_LOGOS: Record<string, string> = {
    "Phương Trang": "🟡",
    "Thanh Buổi": "🔵",
    "Hoàng Long": "🟢",
    "Kumho Samco": "🔴",
};

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("vi-VN", {
        hour: "2-digit", minute: "2-digit", hour12: false,
    });
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
        day: "2-digit", month: "2-digit",
    });
}

function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}g${m > 0 ? ` ${m}p` : ""}`;
}

export default function BusCard({ bus, passengers = 1 }: Props) {
    const [showModal, setShowModal] = useState(false);

    const duration = bus.duration_minutes ?? 0;
    const totalPrice = bus.price * passengers;
    const logo = COMPANY_LOGOS[bus.company] ?? "🚌";
    const isLowSeat = (bus.available_seats ?? 99) <= 5;
    const isOvernight = new Date(bus.arrive_time).getDate() !== new Date(bus.depart_time).getDate();
    const isPast = new Date(bus.depart_time) < new Date();

    return (
        <>
            <div className="bcard">
                {/* Company */}
                <div className="bcard-company">
                    <span className="bcard-company-logo">{logo}</span>
                    <div>
                        <div className="bcard-company-name">{bus.company}</div>
                        <div className="bcard-company-code" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
                            {bus.standard_seats !== undefined && (
                                <span style={{
                                    fontSize: "0.7rem", padding: "0.1rem 0.45rem", borderRadius: 99,
                                    background: (bus.standard_seats ?? 0) <= 5 ? "#fff8e1" : "#f0f4ff",
                                    color: (bus.standard_seats ?? 0) <= 5 ? "#b8860b" : "#3a5f9a",
                                    border: `1px solid ${(bus.standard_seats ?? 0) <= 5 ? "#ffe082" : "#c8d8ff"}`,
                                    fontWeight: 600,
                                }}>
                                    Thường: {bus.standard_seats}
                                </span>
                            )}
                            {(bus.vip_seats ?? 0) > 0 && (
                                <span style={{
                                    fontSize: "0.7rem", padding: "0.1rem 0.45rem", borderRadius: 99,
                                    background: (bus.vip_seats ?? 0) <= 3 ? "#fff8e1" : "#f5f0ff",
                                    color: (bus.vip_seats ?? 0) <= 3 ? "#b8860b" : "#5a3fa0",
                                    border: `1px solid ${(bus.vip_seats ?? 0) <= 3 ? "#ffe082" : "#d4c8f5"}`,
                                    fontWeight: 600,
                                }}>
                                    VIP: {bus.vip_seats}
                                </span>
                            )}
                            {(bus.sleeper_seats ?? 0) > 0 && (
                                <span style={{
                                    fontSize: "0.7rem", padding: "0.1rem 0.45rem", borderRadius: 99,
                                    background: "#e6f9f0", color: "#00875a",
                                    border: "1px solid #b7dfbb", fontWeight: 600,
                                }}>
                                    Giường: {bus.sleeper_seats}
                                </span>
                            )}
                        </div>
                    </div>
                    {isLowSeat && (
                        <span className="bcard-low-seat">🔥 Sắp hết chỗ</span>
                    )}
                </div>

                {/* Route */}
                <div className="bcard-route">
                    <div className="bcard-city">
                        <div className="bcard-time">{formatTime(bus.depart_time)}</div>
                        <div className="bcard-city-name">{bus.from_city}</div>
                        <div className="bcard-date">{formatDate(bus.depart_time)}</div>
                    </div>

                    <div className="bcard-middle">
                        <div className="bcard-duration">{formatDuration(duration)}</div>
                        <div className="bcard-line">
                            <div className="bcard-dot" />
                            <div className="bcard-dashes" />
                            <span className="bcard-bus-icon">🚌</span>
                            <div className="bcard-dashes" />
                            <div className="bcard-dot" />
                        </div>
                        <div className="bcard-direct">
                            {isOvernight ? "🌙 Xe đêm" : "Xe thẳng"}
                        </div>
                    </div>

                    <div className="bcard-city" style={{ textAlign: "right" }}>
                        <div className="bcard-time">{formatTime(bus.arrive_time)}</div>
                        <div className="bcard-city-name">{bus.to_city}</div>
                        <div className="bcard-date">{formatDate(bus.arrive_time)}</div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bcard-footer">
                    <div className="bcard-price-wrap">
                        {passengers > 1 && (
                            <div className="bcard-price-per">
                                {bus.price.toLocaleString("vi-VN")}₫/khách
                            </div>
                        )}
                        <div className="bcard-price">
                            <span className="bcard-price-from">Từ</span>
                            <span className="bcard-price-value">
                                {totalPrice.toLocaleString("vi-VN")}₫
                            </span>
                        </div>
                        {passengers > 1 && (
                            <div className="bcard-price-total">Tổng {passengers} khách</div>
                        )}
                    </div>
                    <button
                        className="bcard-btn"
                        disabled={isPast}
                        style={isPast ? { opacity: 0.45, cursor: "not-allowed", background: "#aaa" } : undefined}
                        onClick={() => { if (!isPast) { logInteraction("bus", bus.bus_id, "click"); setShowModal(true); } }}
                    >
                        {isPast ? "Đã khởi hành" : "Chọn chuyến"}
                    </button>
                </div>
            </div>

            {showModal && (
                <BusTicketModal
                    bus={bus}
                    passengers={passengers}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}
