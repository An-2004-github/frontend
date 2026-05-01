"use client";

import { useState } from "react";
import { Flight } from "@/types/flight";
import FlightTicketModal from "./FlightTicketModal";
import { logInteraction } from "@/lib/logInteraction";

interface Props {
    flight: Flight;
    passengers?: number;
    adults?: number;
    childrenCount?: number;
    infants?: number;
    tripType?: "one_way" | "round_trip";
}

const AIRLINE_LOGOS: Record<string, string> = {
    "Vietnam Airlines": "🇻🇳",
    "VietJet Air": "🔴",
    "Bamboo Airways": "🟢",
    "Pacific Airlines": "🔵",
    "Singapore Airlines": "🇸🇬",
    "Thai Airways": "🇹🇭",
    "ANA": "🇯🇵",
    "Korean Air": "🇰🇷",
};

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("vi-VN", {
        hour: "2-digit", minute: "2-digit", hour12: false,
    });
}

function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}g${m > 0 ? ` ${m}p` : ""}`;
}

export default function FlightCard({ flight, passengers = 1, adults = 1, childrenCount = 0, infants = 0, tripType = "one_way" }: Props) {
    const [showModal, setShowModal] = useState(false);

    const duration = flight.duration_minutes ?? 0;
    const priceMultiplier = tripType === "round_trip" ? 2 : 1;
    const totalPrice = flight.price * passengers * priceMultiplier;
    const logo = AIRLINE_LOGOS[flight.airline] ?? "✈️";
    const isLowSeat = (flight.available_seats ?? 99) <= 5;
    const isPast = new Date(flight.depart_time) < new Date();

    return (
        <>
            <div className="fcard">
                {/* Airline */}
                <div className="fcard-airline">
                    <span className="fcard-airline-logo">{logo}</span>
                    <div>
                        <div className="fcard-airline-name">{flight.airline}</div>
                        <div className="fcard-airline-code" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
                            {flight.economy_seats !== undefined && (
                                <span style={{
                                    fontSize: "0.7rem", padding: "0.1rem 0.45rem", borderRadius: 99,
                                    background: (flight.economy_seats ?? 0) <= 5 ? "#fff8e1" : "#f0f4ff",
                                    color: (flight.economy_seats ?? 0) <= 5 ? "#b8860b" : "#3a5f9a",
                                    border: `1px solid ${(flight.economy_seats ?? 0) <= 5 ? "#ffe082" : "#c8d8ff"}`,
                                    fontWeight: 600,
                                }}>
                                    Phổ thông: {flight.economy_seats}
                                </span>
                            )}
                            {(flight.business_seats ?? 0) > 0 && (
                                <span style={{
                                    fontSize: "0.7rem", padding: "0.1rem 0.45rem", borderRadius: 99,
                                    background: (flight.business_seats ?? 0) <= 3 ? "#fff8e1" : "#f5f0ff",
                                    color: (flight.business_seats ?? 0) <= 3 ? "#b8860b" : "#5a3fa0",
                                    border: `1px solid ${(flight.business_seats ?? 0) <= 3 ? "#ffe082" : "#d4c8f5"}`,
                                    fontWeight: 600,
                                }}>
                                    Thương gia: {flight.business_seats}
                                </span>
                            )}
                            {(flight.first_seats ?? 0) > 0 && (
                                <span style={{
                                    fontSize: "0.7rem", padding: "0.1rem 0.45rem", borderRadius: 99,
                                    background: "#fff8e1", color: "#b8860b",
                                    border: "1px solid #ffe082", fontWeight: 600,
                                }}>
                                    Hạng nhất: {flight.first_seats}
                                </span>
                            )}
                        </div>
                    </div>
                    {isLowSeat && (
                        <span className="fcard-low-seat">🔥 Sắp hết chỗ</span>
                    )}
                </div>

                {/* Route */}
                <div className="fcard-route">
                    <div className="fcard-city">
                        <div className="fcard-time">{formatTime(flight.depart_time)}</div>
                        <div className="fcard-city-name">{flight.from_city}</div>
                    </div>

                    <div className="fcard-middle">
                        <div className="fcard-duration">{formatDuration(duration)}</div>
                        <div className="fcard-line">
                            <div className="fcard-dot" />
                            <div className="fcard-dashes" />
                            <span className="fcard-plane">✈</span>
                            <div className="fcard-dashes" />
                            <div className="fcard-dot" />
                        </div>
                        <div className="fcard-direct">Bay thẳng</div>
                    </div>

                    <div className="fcard-city" style={{ textAlign: "right" }}>
                        <div className="fcard-time">{formatTime(flight.arrive_time)}</div>
                        <div className="fcard-city-name">{flight.to_city}</div>
                    </div>
                </div>

                {/* Footer */}
                <div className="fcard-footer">
                    <div className="fcard-price-wrap">
                        {tripType === "round_trip" && (
                            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#0052cc", background: "#e8f0fe", padding: "0.15rem 0.5rem", borderRadius: 99, marginBottom: "0.2rem", display: "inline-block" }}>
                                🔄 Khứ hồi (×2)
                            </div>
                        )}
                        {passengers > 1 && (
                            <div className="fcard-price-per">
                                {(flight.price * priceMultiplier).toLocaleString("vi-VN")}₫/khách
                            </div>
                        )}
                        <div className="fcard-price">
                            <span className="fcard-price-from">Từ</span>
                            <span className="fcard-price-value">
                                {totalPrice.toLocaleString("vi-VN")}₫
                            </span>
                        </div>
                        {passengers > 1 && (
                            <div className="fcard-price-total">Tổng {passengers} khách</div>
                        )}
                    </div>

                    <button
                        className="fcard-btn"
                        disabled={isPast}
                        style={isPast ? { opacity: 0.45, cursor: "not-allowed", background: "#aaa" } : undefined}
                        onClick={() => { if (!isPast) { logInteraction("flight", flight.flight_id, "click"); setShowModal(true); } }}
                    >
                        {isPast ? "Đã khởi hành" : "Chọn chuyến"}
                    </button>
                </div>
            </div>

            {/* Modal chọn loại vé */}
            {showModal && (
                <FlightTicketModal
                    flight={flight}
                    passengers={passengers}
                    adults={adults}
                    childrenCount={childrenCount}
                    infants={infants}
                    tripType={tripType}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}