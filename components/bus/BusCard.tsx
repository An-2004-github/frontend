"use client";

import { useRouter } from "next/navigation";
import { Bus } from "@/types/bus";
import { useBookingStore } from "@/store/bookingStore";

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

const CLASS_LABELS: Record<string, { label: string; color: string }> = {
    standard: { label: "Ghế thường", color: "#6b8cbf" },
    vip: { label: "Ghế VIP", color: "#0052cc" },
    sleeper: { label: "Giường nằm", color: "#00875a" },
};

export default function BusCard({ bus, passengers = 1 }: Props) {
    const router = useRouter();
    const { setBooking } = useBookingStore();
    const duration = bus.duration_minutes ?? 0;
    const totalPrice = bus.price * passengers;
    const logo = COMPANY_LOGOS[bus.company] ?? "🚌";
    const isLowSeat = (bus.available_seats ?? 99) <= 5;
    const isOvernight = new Date(bus.arrive_time).getDate() !== new Date(bus.depart_time).getDate();

    const handleBook = () => {
        const basePrice = bus.price * passengers;
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
        router.push("/booking");
    };

    return (
        <div className="bcard">
            {/* Company */}
            <div className="bcard-company">
                <span className="bcard-company-logo">{logo}</span>
                <div>
                    <div className="bcard-company-name">{bus.company}</div>
                    <div className="bcard-company-sub">
                        {bus.available_seats ?? "?"} chỗ trống
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
                    <div className="bcard-date">{formatDate(bus.depart_time)}</div>
                    <div className="bcard-city-name">{bus.from_city}</div>
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
                    {isOvernight && (
                        <div className="bcard-overnight">🌙 Xe đêm</div>
                    )}
                </div>

                <div className="bcard-city" style={{ textAlign: "right" }}>
                    <div className="bcard-time">{formatTime(bus.arrive_time)}</div>
                    <div className="bcard-date">{formatDate(bus.arrive_time)}</div>
                    <div className="bcard-city-name">{bus.to_city}</div>
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
                <button className="bcard-btn" onClick={handleBook}>
                    Chọn chuyến
                </button>
            </div>
        </div>
    );
}