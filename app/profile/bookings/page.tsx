"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";

interface Booking {
    booking_id: number;
    booking_date: string;
    status: string;
    total_price: number;
    final_amount: number;
    entity_type: string;
    entity_id: number;
    entity_name?: string;
    check_in_date?: string;
    check_out_date?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Chờ xác nhận", color: "#b8762e", bg: "#fff8e1" },
    confirmed: { label: "Đã xác nhận", color: "#00875a", bg: "#d4edda" },
    cancelled: { label: "Đã hủy", color: "#bf2600", bg: "#fff0ee" },
    completed: { label: "Hoàn thành", color: "#0052cc", bg: "#e8f0fe" },
};

const TYPE_MAP: Record<string, { icon: string; label: string }> = {
    room: { icon: "🏨", label: "Khách sạn" },
    flight: { icon: "✈️", label: "Máy bay" },
    bus: { icon: "🚌", label: "Xe khách" },
    train: { icon: "🚆", label: "Tàu hỏa" },
};

const TABS = ["Tất cả", "Khách sạn", "Máy bay", "Xe khách"];

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Tất cả");

    useEffect(() => {
        api.get("/api/bookings/my")
            .then(res => setBookings(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const TAB_FILTER: Record<string, string[]> = {
        "Tất cả": [],
        "Khách sạn": ["room"],
        "Máy bay": ["flight"],
        "Xe khách": ["bus"],
    };

    const filtered = activeTab === "Tất cả"
        ? bookings
        : bookings.filter(b => TAB_FILTER[activeTab].includes(b.entity_type));

    return (
        <>
            <style>{`
                .bk-card { background: #fff; border-radius: 16px; border: 1px solid #e8f0fe; overflow: hidden; margin-bottom: 1rem; transition: box-shadow 0.2s; }
                .bk-card:hover { box-shadow: 0 4px 20px rgba(0,82,204,0.08); }
                .bk-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid #f0f4ff; }
                .bk-type { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; color: #1a3c6b; }
                .bk-type-icon { font-size: 1.1rem; }
                .bk-id { font-size: 0.75rem; color: #6b8cbf; }
                .bk-status { font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.65rem; border-radius: 99px; }
                .bk-body { padding: 1rem 1.25rem; }
                .bk-name { font-family: 'Nunito',sans-serif; font-size: 1rem; font-weight: 700; color: #1a3c6b; margin-bottom: 0.5rem; }
                .bk-meta { display: flex; gap: 1.5rem; flex-wrap: wrap; }
                .bk-meta-item { display: flex; flex-direction: column; gap: 0.15rem; }
                .bk-meta-label { font-size: 0.72rem; color: #6b8cbf; text-transform: uppercase; letter-spacing: 0.4px; }
                .bk-meta-value { font-size: 0.88rem; font-weight: 500; color: #1a3c6b; }
                .bk-footer { display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1.25rem; background: #f8faff; border-top: 1px solid #f0f4ff; }
                .bk-price { font-family: 'Nunito',sans-serif; font-size: 1.05rem; font-weight: 800; color: #0052cc; }
                .bk-price-label { font-size: 0.75rem; color: #6b8cbf; font-weight: 400; margin-right: 0.3rem; }
                .bk-action { font-size: 0.82rem; color: #0052cc; font-weight: 500; text-decoration: none; padding: 0.4rem 0.85rem; border-radius: 8px; border: 1.5px solid #c8d8ff; background: #f0f4ff; transition: background 0.15s; }
                .bk-action:hover { background: #dde9ff; }
                .bk-tabs { display: flex; gap: 0.25rem; background: #fff; border-radius: 12px; padding: 4px; border: 1px solid #e8f0fe; margin-bottom: 1.25rem; }
                .bk-tab { flex: 1; padding: 0.55rem; border: none; border-radius: 9px; font-family: 'DM Sans',sans-serif; font-size: 0.85rem; font-weight: 500; color: #6b8cbf; background: transparent; cursor: pointer; transition: background 0.15s, color 0.15s; }
                .bk-tab:hover { background: #f0f4ff; color: #0052cc; }
                .bk-tab.active { background: #0052cc; color: #fff; font-weight: 600; }
                .bk-empty { text-align: center; padding: 3.5rem; background: #fff; border-radius: 16px; border: 1px solid #e8f0fe; color: #6b8cbf; }
                .bk-loading { display: flex; justify-content: center; padding: 3rem; }
                .bk-spinner { width: 32px; height: 32px; border: 3px solid #e8f0fe; border-top-color: #0052cc; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .bk-title { font-family: 'Nunito',sans-serif; font-size: 1.2rem; font-weight: 800; color: #1a3c6b; margin-bottom: 1.25rem; }
            `}</style>

            <div className="bk-title">🗂️ Đặt chỗ của tôi</div>

            {/* Tabs */}
            <div className="bk-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        className={`bk-tab${activeTab === tab ? " active" : ""}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="bk-loading"><div className="bk-spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="bk-empty">
                    <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🗂️</div>
                    <p style={{ fontWeight: 600, color: "#1a3c6b" }}>Chưa có đơn đặt chỗ nào</p>
                    <p style={{ fontSize: "0.85rem", marginTop: "0.4rem" }}>Hãy đặt chuyến đi đầu tiên của bạn!</p>
                    <Link href="/" style={{ display: "inline-block", marginTop: "1rem", color: "#0052cc", fontWeight: 600, fontSize: "0.9rem" }}>
                        Khám phá ngay →
                    </Link>
                </div>
            ) : (
                filtered.map((b) => {
                    const type = TYPE_MAP[b.entity_type] ?? { icon: "📋", label: b.entity_type };
                    const status = STATUS_MAP[b.status] ?? { label: b.status, color: "#6b8cbf", bg: "#f0f4ff" };
                    return (
                        <div key={b.booking_id} className="bk-card">
                            <div className="bk-header">
                                <div className="bk-type">
                                    <span className="bk-type-icon">{type.icon}</span>
                                    {type.label}
                                    <span className="bk-id">#{b.booking_id}</span>
                                </div>
                                <span className="bk-status" style={{ color: status.color, background: status.bg }}>
                                    {status.label}
                                </span>
                            </div>

                            <div className="bk-body">
                                <div className="bk-name">{b.entity_name ?? `${type.label} #${b.entity_id}`}</div>
                                <div className="bk-meta">
                                    <div className="bk-meta-item">
                                        <span className="bk-meta-label">Ngày đặt</span>
                                        <span className="bk-meta-value">
                                            {new Date(b.booking_date).toLocaleDateString("vi-VN")}
                                        </span>
                                    </div>
                                    {b.check_in_date && (
                                        <div className="bk-meta-item">
                                            <span className="bk-meta-label">Nhận phòng</span>
                                            <span className="bk-meta-value">
                                                {new Date(b.check_in_date).toLocaleDateString("vi-VN")}
                                            </span>
                                        </div>
                                    )}
                                    {b.check_out_date && (
                                        <div className="bk-meta-item">
                                            <span className="bk-meta-label">Trả phòng</span>
                                            <span className="bk-meta-value">
                                                {new Date(b.check_out_date).toLocaleDateString("vi-VN")}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bk-footer">
                                <div className="bk-price">
                                    <span className="bk-price-label">Tổng tiền</span>
                                    {(b.final_amount ?? b.total_price).toLocaleString("vi-VN")}₫
                                </div>
                                <Link href={`/profile/bookings/${b.booking_id}`} className="bk-action">
                                    Xem chi tiết
                                </Link>
                            </div>
                        </div>
                    );
                })
            )}
        </>
    );
}