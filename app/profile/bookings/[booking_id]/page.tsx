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
    seat_class?: string;
    check_in_date?: string;
    check_out_date?: string;
    from_city?: string;
    to_city?: string;
    depart_time?: string;
    arrive_time?: string;
    adults?: number;
    children?: number;
}

interface Modification {
    mod_id: number;
    type: "reschedule" | "cancel";
    status: "pending" | "approved" | "rejected";
    old_price?: number;
    new_price?: number;
    price_diff?: number;
    reschedule_fee?: number;
    cancel_fee?: number;
    refund_amount?: number;
    refund_method?: string;
    new_seat_class?: string;
    new_check_in?: string;
    new_check_out?: string;
    new_entity_id?: number;
    bank_info?: string;
    admin_note?: string;
    created_at: string;
    approved_at?: string;
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
    modifications?: Modification[];
}

interface TransportPolicy {
    allows_reschedule: boolean;
    allows_cancel: boolean;
    reschedule_fee_percent: number;
    cancel_fee_percent: number;
    refund_on_downgrade?: boolean;
    min_hours_before: number;
    allows_refund?: boolean;
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
    train:  { icon: "🚆", label: "Tàu hỏa" },
};

const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const fmtDateTime = (d?: string) =>
    d ? new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const SEAT_CLASS_VN: Record<string, string> = {
    economy:      "Economy",
    business:     "Business",
    first:        "First Class",
    standard:     "Ghế thường",
    vip:          "Ghế VIP",
    sleeper:      "Giường nằm",
    hard_seat:    "Ngồi cứng",
    soft_seat:    "Ngồi mềm",
    hard_sleeper: "Nằm cứng",
    soft_sleeper: "Nằm mềm",
};

export default function BookingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const bookingId = params.booking_id;

    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [modifyMode, setModifyMode] = useState<"reschedule" | "cancel" | null>(null);
    const [policy, setPolicy] = useState<TransportPolicy | null>(null);

    const reloadBooking = () =>
        api.get(`/api/bookings/${bookingId}`).then(res => {
            const b = res.data as BookingDetail & { policy?: TransportPolicy };
            setBooking(b);
            if (b.policy) setPolicy(b.policy);
        }).catch(() => {});

    useEffect(() => {
        api.get(`/api/bookings/${bookingId}`)
            .then(res => {
                const b = res.data as BookingDetail & { policy?: TransportPolicy };
                setBooking(b);
                if (b.policy) setPolicy(b.policy);
            })
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

                .bd-policy-row { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 0.25rem; }
                .bd-policy-badge {
                    display: inline-flex; align-items: center; gap: 0.35rem;
                    font-size: 0.78rem; font-weight: 600;
                    padding: 0.3rem 0.75rem; border-radius: 99px;
                }
                .bd-policy-badge.ok { background: #e6f9f0; color: #00875a; border: 1px solid #b7dfbb; }
                .bd-policy-badge.no { background: #fff0f0; color: #c0392b; border: 1px solid #ffcdd2; }

                .bd-actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }
                .bd-btn { flex: 1; padding: 0.75rem; border-radius: 10px; font-size: 0.88rem; font-weight: 600; cursor: pointer; text-align: center; border: none; }
                .bd-btn-primary { background: #0052cc; color: #fff; }
                .bd-btn-primary:hover { opacity: 0.9; }
                .bd-btn-outline { background: #fff; color: #0052cc; border: 1.5px solid #c8d8ff; }
                .bd-btn-outline:hover { background: #f0f4ff; }

                .bd-timeline { display: flex; flex-direction: column; gap: 0; }
                .bd-tl-item { display: flex; gap: 0.85rem; padding: 1rem 0; border-bottom: 1px solid #f0f4ff; }
                .bd-tl-item:last-child { border-bottom: none; padding-bottom: 0; }
                .bd-tl-dot-col { display: flex; flex-direction: column; align-items: center; gap: 0; flex-shrink: 0; padding-top: 2px; }
                .bd-tl-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; }
                .bd-tl-line { width: 2px; flex: 1; min-height: 12px; background: #e8f0fe; margin-top: 4px; }
                .bd-tl-body { flex: 1; min-width: 0; }
                .bd-tl-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
                .bd-tl-title { font-weight: 700; font-size: 0.9rem; color: #1a3c6b; }
                .bd-tl-date { font-size: 0.75rem; color: #6b8cbf; }
                .bd-tl-badge { font-size: 0.72rem; font-weight: 700; padding: 2px 10px; border-radius: 99px; }
                .bd-tl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem 1rem; font-size: 0.82rem; }
                .bd-tl-kv { display: flex; flex-direction: column; }
                .bd-tl-k { color: #6b8cbf; font-size: 0.72rem; margin-bottom: 1px; }
                .bd-tl-v { color: #1a3c6b; font-weight: 600; }
                .bd-tl-note { margin-top: 0.5rem; font-size: 0.8rem; background: #f8faff; border-left: 3px solid #c8d8ff; padding: 0.4rem 0.6rem; border-radius: 0 6px 6px 0; color: #4a6fa5; }
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

                        {item && item.entity_type === "room" && (
                            <>
                                {item.entity_name && (
                                    <div className="bd-row">
                                        <span className="bd-row-label">Khách sạn / Phòng</span>
                                        <span className="bd-row-value">{item.entity_name}</span>
                                    </div>
                                )}
                                {item.check_in_date && (
                                    <div className="bd-row">
                                        <span className="bd-row-label">Nhận phòng</span>
                                        <span className="bd-row-value">{fmtDate(item.check_in_date)}</span>
                                    </div>
                                )}
                                {item.check_out_date && (
                                    <div className="bd-row">
                                        <span className="bd-row-label">Trả phòng</span>
                                        <span className="bd-row-value">{fmtDate(item.check_out_date)}</span>
                                    </div>
                                )}
                                {item.check_in_date && item.check_out_date && (
                                    <div className="bd-row">
                                        <span className="bd-row-label">Số đêm</span>
                                        <span className="bd-row-value">
                                            {Math.round((new Date(item.check_out_date).getTime() - new Date(item.check_in_date).getTime()) / 86400000)} đêm
                                        </span>
                                    </div>
                                )}
                                <div className="bd-row">
                                    <span className="bd-row-label">Số phòng</span>
                                    <span className="bd-row-value">{item.quantity} phòng</span>
                                </div>
                                {(item.adults != null || item.children != null) && (
                                    <div className="bd-row">
                                        <span className="bd-row-label">Khách</span>
                                        <span className="bd-row-value">
                                            {item.adults ?? 1} người lớn
                                            {(item.children ?? 0) > 0 && `, ${item.children} trẻ em`}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        {item && (item.entity_type === "flight" || item.entity_type === "bus" || item.entity_type === "train") && (
                            <>
                                {item.entity_name && (
                                    <div className="bd-row">
                                        <span className="bd-row-label">
                                            {item.entity_type === "flight" ? "Hãng bay" : item.entity_type === "bus" ? "Nhà xe" : "Chuyến tàu"}
                                        </span>
                                        <span className="bd-row-value">{item.entity_name}</span>
                                    </div>
                                )}
                                {(item.from_city || item.to_city) && (
                                    <div className="bd-row">
                                        <span className="bd-row-label">Tuyến đường</span>
                                        <span className="bd-row-value">{item.from_city} → {item.to_city}</span>
                                    </div>
                                )}
                                {(item.depart_time || item.check_in_date) && (
                                    <div className="bd-row">
                                        <span className="bd-row-label">Khởi hành</span>
                                        <span className="bd-row-value">{fmtDateTime(item.depart_time || item.check_in_date)}</span>
                                    </div>
                                )}
                                {(item.arrive_time || item.check_out_date) && (
                                    <div className="bd-row">
                                        <span className="bd-row-label">Đến nơi</span>
                                        <span className="bd-row-value">{fmtDateTime(item.arrive_time || item.check_out_date)}</span>
                                    </div>
                                )}
                                {item.seat_class && (
                                    <div className="bd-row">
                                        <span className="bd-row-label">Hạng ghế</span>
                                        <span className="bd-row-value">{SEAT_CLASS_VN[item.seat_class] ?? item.seat_class}</span>
                                    </div>
                                )}
                                <div className="bd-row">
                                    <span className="bd-row-label">Số hành khách</span>
                                    <span className="bd-row-value">{item.quantity} người</span>
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

                    {/* Chính sách */}
                    {policy && (
                        <div className="bd-section">
                            <div className="bd-section-title">
                                {item?.entity_type === "room" ? "Chính sách đặt phòng" : "Chính sách vé"}
                            </div>
                            <div className="bd-policy-row">
                                {policy.allows_refund !== false ? (
                                    <span className="bd-policy-badge ok">✓ Có thể hoàn tiền</span>
                                ) : (
                                    <span className="bd-policy-badge no">⛔ Không hoàn tiền</span>
                                )}
                                {policy.allows_reschedule ? (
                                    <span className="bd-policy-badge ok">✓ Được đổi lịch</span>
                                ) : (
                                    <span className="bd-policy-badge no">🚫 Không được đổi lịch</span>
                                )}
                                {item?.entity_type !== "room" && (
                                    policy.allows_cancel ? (
                                        <span className="bd-policy-badge ok">✓ Được hủy vé</span>
                                    ) : (
                                        <span className="bd-policy-badge no">🚫 Không được hủy</span>
                                    )
                                )}
                                {item?.entity_type !== "room" && (
                                    policy.refund_on_downgrade ? (
                                        <span className="bd-policy-badge ok">✓ Hoàn tiền khi đổi vé rẻ hơn</span>
                                    ) : (
                                        <span className="bd-policy-badge no">🚫 Không hoàn khi đổi vé rẻ hơn</span>
                                    )
                                )}
                                {item?.entity_type !== "room" && (policy.reschedule_fee_percent ?? 0) > 0 && (
                                    <span className="bd-policy-badge" style={{ background: "#fff8e1", color: "#b8762e", border: "1px solid #f9e0a0" }}>
                                        Phí đổi lịch {policy.reschedule_fee_percent}%
                                    </span>
                                )}
                                {item?.entity_type !== "room" && (policy.cancel_fee_percent ?? 0) > 0 && (
                                    <span className="bd-policy-badge" style={{ background: "#fff8e1", color: "#b8762e", border: "1px solid #f9e0a0" }}>
                                        Phí hủy {policy.cancel_fee_percent}%
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tổng */}
                    <div className="bd-total-row">
                        <span className="bd-total-label">Tổng thanh toán</span>
                        <span className="bd-total-value">{(booking.final_amount ?? booking.total_price).toLocaleString("vi-VN")}₫</span>
                    </div>
                </div>

                {/* Lịch sử đổi / hủy */}
                <div className="bd-card">
                    <div className="bd-section">
                        <div className="bd-section-title">Lịch sử đổi / hủy</div>
                        {(!booking.modifications || booking.modifications.length === 0) ? (
                            <div style={{ textAlign: "center", padding: "1.5rem 0", color: "#6b8cbf", fontSize: "0.88rem" }}>
                                <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>📋</div>
                                Chưa có lịch sử đổi / hủy
                            </div>
                        ) : (
                            <div className="bd-timeline">
                                {booking.modifications.map((mod, idx) => {
                                    const isReschedule = mod.type === "reschedule";
                                    const isApproved   = mod.status === "approved";
                                    const isPending    = mod.status === "pending";
                                    const isRejected   = mod.status === "rejected";

                                    const dotBg    = isApproved ? "#e6f9f0" : isPending ? "#fff8e1" : "#fff0f0";
                                    const dotIcon  = isReschedule ? "🔄" : "❌";
                                    const badgeBg  = isApproved ? "#e6f9f0" : isPending ? "#fff8e1" : "#fff0f0";
                                    const badgeClr = isApproved ? "#00875a" : isPending ? "#b8762e" : "#c0392b";
                                    const badgeTxt = isApproved ? "Đã duyệt" : isPending ? "Chờ xử lý" : "Từ chối";

                                    const fmt = (n?: number | null) =>
                                        n != null ? n.toLocaleString("vi-VN") + "₫" : "—";
                                    const fmtD = (d?: string | null) =>
                                        d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : null;
                                    const fmtDT = (d?: string | null) =>
                                        d ? new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

                                    const isLast = idx === booking.modifications!.length - 1;

                                    return (
                                        <div key={mod.mod_id} className="bd-tl-item">
                                            <div className="bd-tl-dot-col">
                                                <div className="bd-tl-dot" style={{ background: dotBg }}>{dotIcon}</div>
                                                {!isLast && <div className="bd-tl-line" />}
                                            </div>
                                            <div className="bd-tl-body">
                                                <div className="bd-tl-header">
                                                    <span className="bd-tl-title">
                                                        {isReschedule ? "Đổi lịch / Đổi hạng ghế" : "Hủy đặt chỗ"}
                                                    </span>
                                                    <span className="bd-tl-badge" style={{ background: badgeBg, color: badgeClr }}>
                                                        {badgeTxt}
                                                    </span>
                                                    <span className="bd-tl-date">{fmtDT(mod.created_at)}</span>
                                                </div>

                                                <div className="bd-tl-grid">
                                                    {mod.old_price != null && (
                                                        <div className="bd-tl-kv">
                                                            <span className="bd-tl-k">Giá cũ</span>
                                                            <span className="bd-tl-v">{fmt(mod.old_price)}</span>
                                                        </div>
                                                    )}
                                                    {mod.new_price != null && isReschedule && (
                                                        <div className="bd-tl-kv">
                                                            <span className="bd-tl-k">Giá mới</span>
                                                            <span className="bd-tl-v">{fmt(mod.new_price)}</span>
                                                        </div>
                                                    )}
                                                    {mod.new_seat_class && (
                                                        <div className="bd-tl-kv">
                                                            <span className="bd-tl-k">Hạng ghế mới</span>
                                                            <span className="bd-tl-v">{SEAT_CLASS_VN[mod.new_seat_class] ?? mod.new_seat_class}</span>
                                                        </div>
                                                    )}
                                                    {(mod.new_check_in || mod.new_check_out) && (
                                                        <div className="bd-tl-kv" style={{ gridColumn: "1 / -1" }}>
                                                            <span className="bd-tl-k">Lịch mới</span>
                                                            <span className="bd-tl-v">
                                                                {fmtD(mod.new_check_in)}
                                                                {mod.new_check_out && mod.new_check_out !== mod.new_check_in && ` → ${fmtD(mod.new_check_out)}`}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {isReschedule && (mod.reschedule_fee ?? 0) > 0 && (
                                                        <div className="bd-tl-kv">
                                                            <span className="bd-tl-k">Phí đổi lịch</span>
                                                            <span className="bd-tl-v" style={{ color: "#e67e22" }}>{fmt(mod.reschedule_fee)}</span>
                                                        </div>
                                                    )}
                                                    {!isReschedule && (mod.cancel_fee ?? 0) > 0 && (
                                                        <div className="bd-tl-kv">
                                                            <span className="bd-tl-k">Phí hủy</span>
                                                            <span className="bd-tl-v" style={{ color: "#c0392b" }}>{fmt(mod.cancel_fee)}</span>
                                                        </div>
                                                    )}
                                                    {(mod.refund_amount ?? 0) > 0 && (
                                                        <div className="bd-tl-kv">
                                                            <span className="bd-tl-k">Hoàn tiền</span>
                                                            <span className="bd-tl-v" style={{ color: "#00875a" }}>{fmt(mod.refund_amount)}</span>
                                                        </div>
                                                    )}
                                                    {mod.refund_method && (mod.refund_amount ?? 0) > 0 && (
                                                        <div className="bd-tl-kv">
                                                            <span className="bd-tl-k">Phương thức hoàn</span>
                                                            <span className="bd-tl-v">
                                                                {mod.refund_method === "wallet" ? "💳 Ví VIVU" : "🏦 Ngân hàng"}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {isPending && (mod.refund_amount ?? 0) > 0 && (
                                                        <div className="bd-tl-kv" style={{ gridColumn: "1 / -1" }}>
                                                            <span className="bd-tl-k" style={{ color: "#b8762e" }}>⏳ Đang chờ admin xử lý hoàn tiền</span>
                                                        </div>
                                                    )}
                                                    {mod.approved_at && (
                                                        <div className="bd-tl-kv" style={{ gridColumn: "1 / -1" }}>
                                                            <span className="bd-tl-k">Thời gian duyệt</span>
                                                            <span className="bd-tl-v">{fmtDT(mod.approved_at)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {mod.admin_note && (
                                                    <div className="bd-tl-note">💬 {mod.admin_note}</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
                        const firstItem  = booking.items?.[0];
                        const isTransport = firstItem?.entity_type !== "room";

                        // Tính giờ còn lại đến khởi hành / nhận phòng
                        const departStr  = isTransport ? firstItem?.depart_time : firstItem?.check_in_date;
                        const hoursLeft  = departStr
                            ? (new Date(departStr).getTime() - Date.now()) / 3_600_000
                            : Infinity;
                        const minHours   = policy?.min_hours_before ?? 2;

                        if (hoursLeft < 0) return null; // đã khởi hành / quá ngày

                        const tooClose        = isTransport && hoursLeft < minHours;
                        const canReschedule   = (policy ? policy.allows_reschedule : true) && !tooClose;
                        const canCancel       = (policy ? policy.allows_cancel     : true) && !tooClose;
                        const tooCloseMsg     = `Còn ${hoursLeft.toFixed(0)}h trước khởi hành (tối thiểu ${minHours}h)`;

                        return (
                            <>
                                {canReschedule ? (
                                    <button
                                        className="bd-btn"
                                        style={{ background: "#fff3e0", color: "#e67e22", border: "1.5px solid #f39c12" }}
                                        onClick={() => setModifyMode("reschedule")}
                                    >
                                        🔄 Đổi lịch
                                    </button>
                                ) : (
                                    <div title={tooClose ? tooCloseMsg : undefined} style={{ flex: 1, textAlign: "center", fontSize: "0.78rem", color: "#6b8cbf", padding: "0.75rem", background: "#f8faff", borderRadius: 10, border: "1px solid #e8f0fe" }}>
                                        🚫 {tooClose ? `Quá gần giờ khởi hành` : "Vé không được đổi lịch"}
                                    </div>
                                )}
                                {canCancel ? (
                                    <button
                                        className="bd-btn"
                                        style={{ background: "#fff0ee", color: "#c0392b", border: "1.5px solid #e74c3c" }}
                                        onClick={() => setModifyMode("cancel")}
                                    >
                                        ❌ Hủy {firstItem?.entity_type === "room" ? "phòng" : "vé"}
                                    </button>
                                ) : (
                                    <div title={tooClose ? tooCloseMsg : undefined} style={{ flex: 1, textAlign: "center", fontSize: "0.78rem", color: "#6b8cbf", padding: "0.75rem", background: "#f8faff", borderRadius: 10, border: "1px solid #e8f0fe" }}>
                                        🚫 {tooClose ? `Quá gần giờ khởi hành` : "Vé không được hủy"}
                                    </div>
                                )}
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
                        reloadBooking();
                    }}
                />
            )}
        </>
    );
}
