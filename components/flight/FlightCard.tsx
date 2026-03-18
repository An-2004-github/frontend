"use client";

import Link from "next/link";
import { Flight } from "@/types/flight";

interface Props {
    flight: Flight;
    passengers?: number;
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

export default function FlightCard({ flight, passengers = 1 }: Props) {
    const duration = flight.duration_minutes ?? 0;
    const totalPrice = flight.price * passengers;
    const logo = AIRLINE_LOGOS[flight.airline] ?? "✈️";
    const isLowSeat = (flight.available_seats ?? 99) <= 5;

    return (
        <div className="fcard">
            {/* Airline */}
            <div className="fcard-airline">
                <span className="fcard-airline-logo">{logo}</span>
                <div>
                    <div className="fcard-airline-name">{flight.airline}</div>
                    <div className="fcard-airline-code">
                        Bay thẳng · {flight.available_seats ?? "?"} ghế trống
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
                    {passengers > 1 && (
                        <div className="fcard-price-per">
                            {flight.price.toLocaleString("vi-VN")}₫/khách
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
                <Link
                    href={`/flights/${flight.flight_id}?passengers=${passengers}`}
                    className="fcard-btn"
                >
                    Chọn chuyến
                </Link>
            </div>
        </div>
    );
}