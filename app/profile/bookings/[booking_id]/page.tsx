"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";
import BookingModifyModal from "@/components/BookingModifyModal";

interface BookingItem {
    entity_type: string;
    entity_id: number;
    entity_name?: string;
    quantity: number;
    price: number;
    check_in_date?: string;
    check_out_date?: string;
}

interface BookingDetail {
    booking_id: number;
    booking_date: string;
    status: string;
    total_price: number;
    final_amount: number;
    discount_amount?: number;
    promo?: { code: string; description?: string } | null;
    items: BookingItem[];
    user?: { full_name: string; email: string };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    pending:   { label: "Chờ thanh toán", color: "#b8762e", bg: "#fff8e1",  icon: "⏳" },
    confirmed: { label: "Đã xác nhận",    color: "#00875a", bg: "#d4edda",  icon: "✅" },
    cancelled: { label: "Đã huỷ",         color: "#bf2600", bg: "#fff0ee",  icon: "❌" },
    completed: { label: "Hoàn thành",     color: "#0052cc", bg: "#e8f0fe",  icon: "🎉" },
};

const TYPE_MAP: Record<string, { icon: string; label: string }> = {
    room:   { icon: "🏨", label: "Khách sạn" },
    flight: { icon: "✈️", label: "Máy bay" },
    bus:    { icon: "🚌", label: "Xe khách" },
};

const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const fmtDateTime = (d?: string) =>
    d ? new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function BookingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const bookingId = params.booking_id;

    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [modifyMode, setModifyMode] = useState<"reschedule" | "cancel" | null>(null);

    useEffect(() => {
        api.get(`/api/bookings/${bookingId}`)
            .then(res => setBooking(res.data))
            .catch(err => {
                if (err?.response?.status === 404) setNotFound(true);
            })
            .finally(() => setLoading(false));
    }, [bookingId]);

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
            <div style={{ width: 36, height: 36, border: "3px solid #e8f0fe", borderTopColor: "#0052cc", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (notFound || !booking) return (
        <div style={{ textAlign: "center", padding: "4rem", background: "#fff", borderRadius: 16, border: "1px solid #e8f0fe" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
            <div style={{ fontWeight: 700, color: "#1a3c6b", fontSize: "1.1rem", marginBottom: "0.5rem" }}>Không tìm thấy đặt chỗ</div>
            <div style={{ color: "#6b8cbf", fontSize: "0.88rem", marginBottom: "1.5rem" }}>Đặt chỗ không tồn tại hoặc bạn không có quyền xem.</div>
            <Link href="/profile/bookings" style={{ color: "#0052cc", fontWeight: 600, fontSize: "0.9rem" }}>← Quay lại đặt chỗ của tôi</Link>
        </div>
    );

    const status = STATUS_MAP[booking.status] ?? { label: booking.status, color: "#6b8cbf", bg: "#f0f4ff", icon: "📋" };
    const item = booking.items?.[0];
    const type = item ? (TYPE_MAP[item.entity_type] ?? { icon: "📋", label: item.entity_type }) : { icon: "📋", label: "Dịch vụ" };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
                .bd-root { max-width: 640px; margin: 0 auto; font-family: 'DM Sans', sans-serif; }
                .bd-back { display: inline-flex; align-items: center; gap: 0.4rem; color: #6b8cbf; font-size: 0.85rem; font-weight: 500; text-decoration: none; margin-bottom: 1.25rem; }
                .bd-back:hover { color: #0052cc; }
                .bd-card { background: #fff; border-radius: 16px; border: 1px solid #e8f0fe; overflow: hidden; margin-bottom: 1rem; }
                .bd-hero { padding: 1.75rem 1.5rem; border-bottom: 1px solid #f0f4ff; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
                .bd-hero-left { display: flex; align-items: center; gap: 1rem; }
                .bd-type-icon { width: 52px; height: 52px; border-radius: 14px; background: #e8f0fe; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; flex-shrink: 0; }
                .bd-title { font-family: 'Nunito', sans-serif; font-size: 1.1rem; font-weight: 800; color: #1a3c6b; }
                .bd-id { font-size: 0.78rem; color: #6b8cbf; margin-top: 2px; }
                .bd-badge { padding: 0.35rem 0.85rem; border-radius: 99px; font-size: 0.78rem; font-weight: 700; white-space: nowrap; }

                .bd-section { padding: 1.25rem 1.5rem; }
                .bd-section + .bd-section { border-top: 1px solid #f0f4ff; }
                .bd-section-title { font-size: 0.72rem; font-weight: 700; color: #6b8cbf; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 1rem; }
                .bd-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #f8faff; font-size: 0.88rem; }
                .bd-row:last-child { border-bottom: none; }
                .bd-row-label { color: #6b8cbf; }
                .bd-row-value { font-weight: 500; color: #1a3c6b; text-align: right; }
                .bd-total-row { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; background: #f0f4ff; border-top: 2px solid #e8f0fe; }
                .bd-total-label { font-weight: 600; color: #1a3c6b; font-size: 0.9rem; }
                .bd-total-value { font-family: 'Nunito', sans-serif; font-size: 1.25rem; font-weight: 800; color: #0052cc; }

                .bd-actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }
                .bd-btn { flex: 1; padding: 0.75rem; border-radius: 10px; font-size: 0.88rem; font-weight: 600; cursor: pointer; text-align: center; border: none; }
                .bd-btn-primary { background: #0052cc; color: #fff; }
                .bd-btn-primary:hover { opacity: 0.9; }
                .bd-btn-outline { background: #fff; color: #0052cc; border: 1.5px solid #c8d8ff; }
                .bd-btn-outline:hover { background: #f0f4ff; }
            `}</style>

            <div className="bd-root">
                <Link href="/profile/bookings" className="bd-back">← Đặt chỗ của tôi</Link>

                <div className="bd-card">
                    {/* Hero */}
                    <div className="bd-hero">
                        <div className="bd-hero-left">
                            <div className="bd-type-icon">{type.icon}</div>
                            <div>
                                <div className="bd-title">{type.label}</div>
                                <div className="bd-id">Mã đặt chỗ #{booking.booking_id}</div>
                            </div>
                        </div>
                        <span className="bd-badge" style={{ color: status.color, background: status.bg }}>
                            {status.icon} {status.label}
                        </span>
                    </div>

                    {/* Thông tin đặt chỗ */}
                    <div className="bd-section">
                        <div className="bd-section-title">Thông tin đặt chỗ</div>
                        <div className="bd-row">
                            <span className="bd-row-label">Ngày đặt</span>
                            <span className="bd-row-value">{fmtDateTime(booking.booking_date)}</span>
                        </div>
                        {item && (
                            <>
                                <div className="bd-row">
                                    <span className="bd-row-label">Loại dịch vụ</span>
                                    <span className="bd-row-value">{type.label}</span>
                                </div>
                                {item.check_in_date && (
                                    <div className="bd-row">
                                        <span className="bd-row-label">
                                            {item.entity_type === "room" ? "Nhận phòng" : "Khởi hành"}
                                        </span>
                                        <span className="bd-row-value">{fmtDate(item.check_in_date)}</span>
                                    </div>
                                )}
                                {item.check_out_date && (
                                    <div className="bd-row">
                                        <span className="bd-row-label">
                                            {item.entity_type === "room" ? "Trả phòng" : "Đến nơi"}
                                        </span>
                                        <span className="bd-row-value">{fmtDate(item.check_out_date)}</span>
                                    </div>
                                )}
                                <div className="bd-row">
                                    <span className="bd-row-label">Số lượng</span>
                                    <span className="bd-row-value">{item.quantity}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Thanh toán */}
                    <div className="bd-section">
                        <div className="bd-section-title">Chi tiết thanh toán</div>
                        <div className="bd-row">
                            <span className="bd-row-label">Giá gốc</span>
                            <span className="bd-row-value">{(booking.total_price).toLocaleString("vi-VN")}₫</span>
                        </div>
                        {booking.discount_amount != null && booking.discount_amount > 0 && (
                            <div className="bd-row">
                                <span className="bd-row-label">
                                    🎟️ Mã giảm giá
                                    {booking.promo?.code && (
                                        <span style={{ marginLeft: "0.4rem", background: "#e8f0fe", color: "#0052cc", borderRadius: 6, padding: "1px 7px", fontSize: "0.75rem", fontWeight: 700 }}>
                                            {booking.promo.code}
                                        </span>
                                    )}
                                </span>
                                <span className="bd-row-value" style={{ color: "#00875a" }}>
                                    −{(booking.discount_amount).toLocaleString("vi-VN")}₫
                                </span>
                            </div>
                        )}
                        <div className="bd-row">
                            <span className="bd-row-label">Trạng thái</span>
                            <span className="bd-row-value" style={{ color: status.color, fontWeight: 700 }}>
                                {status.icon} {status.label}
                            </span>
                        </div>
                    </div>

                    {/* Tổng */}
                    <div className="bd-total-row">
                        <span className="bd-total-label">Tổng thanh toán</span>
                        <span className="bd-total-value">{(booking.final_amount ?? booking.total_price).toLocaleString("vi-VN")}₫</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="bd-actions">
                    <button className="bd-btn bd-btn-outline" onClick={() => router.back()}>← Quay lại</button>
                    {booking.status === "pending" && (
                        <button
                            className="bd-btn bd-btn-primary"
                            onClick={() => router.push(`/payment/${booking.booking_id}`)}
                        >
                            💳 Thanh toán ngay
                        </button>
                    )}
                    {booking.status === "confirmed" && (() => {
                        const checkIn = booking.items?.[0]?.check_in_date;
                        const isPast = checkIn ? new Date(checkIn) < new Date(new Date().toDateString()) : false;
                        if (isPast) return null;
                        return (
                            <>
                                <button
                                    className="bd-btn"
                                    style={{ background: "#fff3e0", color: "#e67e22", border: "1.5px solid #f39c12" }}
                                    onClick={() => setModifyMode("reschedule")}
                                >
                                    🔄 Đổi lịch
                                </button>
                                <button
                                    className="bd-btn"
                                    style={{ background: "#fff0ee", color: "#c0392b", border: "1.5px solid #e74c3c" }}
                                    onClick={() => setModifyMode("cancel")}
                                >
                                    ❌ Hủy {item?.entity_type === "room" ? "phòng" : "vé"}
                                </button>
                            </>
                        );
                    })()}
                </div>
            </div>

            {modifyMode && (
                <BookingModifyModal
                    booking={booking}
                    mode={modifyMode}
                    onClose={() => setModifyMode(null)}
                    onDone={() => {
                        setModifyMode(null);
                        // Reload booking data
                        api.get(`/api/bookings/${bookingId}`)
                            .then(res => setBooking(res.data))
                            .catch(() => {});
                    }}
                />
            )}
        </>
    );
}
