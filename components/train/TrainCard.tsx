"use client";

import { useState } from "react";
import { Train } from "@/types/train";
import TrainTicketModal from "./TrainTicketModal";

interface Props {
    train: Train;
    passengers?: number;
}

const SEAT_CLASS_LABEL: Record<string, string> = {
    hard_seat:    "Ngồi cứng",
    soft_seat:    "Ngồi mềm",
    hard_sleeper: "Nằm cứng",
    soft_sleeper: "Nằm mềm",
};

function formatTime(s: string) {
    return new Date(s).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDuration(m: number) {
    const h = Math.floor(m / 60), mm = m % 60;
    return `${h}g${mm > 0 ? ` ${mm}p` : ""}`;
}

export default function TrainCard({ train, passengers = 1 }: Props) {
    const [showModal, setShowModal] = useState(false);

    const duration = train.duration_minutes ?? 0;
    const lowestPrice = Math.min(
        ...(["hard_seat_price", "soft_seat_price", "hard_sleeper_price", "soft_sleeper_price"] as const)
            .map(k => (train[k] as number | undefined) ?? Infinity)
    );
    const displayPrice = isFinite(lowestPrice) ? lowestPrice : train.price;

    const classBadges = (["hard_seat", "soft_seat", "hard_sleeper", "soft_sleeper"] as const).filter(
        c => ((train[`${c}_count` as keyof Train] as number | undefined) ?? 0) > 0
    );

    return (
        <>
            <div className="tcard">
                {/* Header */}
                <div className="tcard-header">
                    <span className="tcard-code">{train.train_code}</span>
                    <div className="tcard-class-badges">
                        {classBadges.map(c => (
                            <span key={c} className="tcard-class-badge">
                                {SEAT_CLASS_LABEL[c]}
                                {" "}
                                <span style={{ opacity: 0.7 }}>
                                    {train[`${c}_count` as keyof Train] as number}
                                </span>
                            </span>
                        ))}
                    </div>
                    {(train.available_seats ?? 99) <= 10 && (
                        <span className="tcard-low-seat">🔥 Sắp hết chỗ</span>
                    )}
                </div>

                {/* Route */}
                <div className="tcard-route">
                    <div className="tcard-city">
                        <div className="tcard-time">{formatTime(train.depart_time)}</div>
                        <div className="tcard-city-name">{train.from_city}</div>
                        <div className="tcard-station">{train.from_station}</div>
                    </div>

                    <div className="tcard-middle">
                        <div className="tcard-duration">{formatDuration(duration)}</div>
                        <div className="tcard-line">
                            <div className="tcard-dot" />
                            <div className="tcard-dashes" />
                            <span className="tcard-icon">🚆</span>
                            <div className="tcard-dashes" />
                            <div className="tcard-dot" />
                        </div>
                        <div className="tcard-direct">Tàu thẳng</div>
                    </div>

                    <div className="tcard-city" style={{ textAlign: "right" }}>
                        <div className="tcard-time">{formatTime(train.arrive_time)}</div>
                        <div className="tcard-city-name">{train.to_city}</div>
                        <div className="tcard-station">{train.to_station}</div>
                    </div>
                </div>

                {/* Footer */}
                <div className="tcard-footer">
                    <div className="tcard-price-wrap">
                        {passengers > 1 && (
                            <div className="tcard-price-per">
                                {displayPrice.toLocaleString("vi-VN")}₫/khách
                            </div>
                        )}
                        <div className="tcard-price">
                            <span className="tcard-price-from">Từ</span>
                            <span className="tcard-price-value">
                                {(displayPrice * passengers).toLocaleString("vi-VN")}₫
                            </span>
                        </div>
                        {passengers > 1 && (
                            <div className="tcard-price-total">Tổng {passengers} khách</div>
                        )}
                    </div>

                    <button className="tcard-btn" onClick={() => setShowModal(true)}>
                        Chọn ghế
                    </button>
                </div>
            </div>

            {showModal && (
                <TrainTicketModal
                    train={train}
                    passengers={passengers}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}
