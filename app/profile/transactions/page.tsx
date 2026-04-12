"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/axios";

interface Booking {
    booking_id: number;
    booking_date: string;
    status: string;
    final_amount: number;
    entity_type: string;
    entity_name?: string;
    from_city?: string;
    to_city?: string;
    check_in_date?: string;
    check_out_date?: string;
    depart_time?: string;
    arrive_time?: string;
    quantity?: number;
    guests?: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
    confirmed: { label: "Hoàn thành",          color: "#00875a", bg: "#e6f9f0", border: "#b7dfbb" },
    pending:   { label: "Chờ thanh toán",       color: "#b8860b", bg: "#fffbe6", border: "#ffe082" },
    cancelled: { label: "Quá hạn / Đã hủy",    color: "#c0392b", bg: "#fff0f0", border: "#ffcdd2" },
};

const TYPE_MAP: Record<string, { icon: string; label: string; color: string }> = {
    room:   { icon: "🏨", label: "Khách sạn",  color: "#0052cc" },
    flight: { icon: "✈️", label: "Máy bay",    color: "#7b2d8b" },
    bus:    { icon: "🚌", label: "Xe khách",   color: "#00875a" },
    train:  { icon: "🚆", label: "Tàu hỏa",   color: "#b8860b" },
};

const STATUS_FILTERS = [
    { key: "all",       label: "Tất cả" },
    { key: "confirmed", label: "✅ Hoàn thành" },
    { key: "pending",   label: "⏳ Chờ thanh toán" },
    { key: "cancelled", label: "❌ Đã hủy" },
];

export default function TransactionsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState("all");
    const [monthFilter, setMonthFilter] = useState("");   // "YYYY-MM"
    const [typeFilter, setTypeFilter] = useState("all");

    // Detail modal
    const [detail, setDetail] = useState<Booking | null>(null);

    useEffect(() => {
        api.get("/api/bookings/my")
            .then(res => setBookings(res.data))
            .catch(() => setBookings([]))
            .finally(() => setLoading(false));
    }, []);

    // Tháng có giao dịch (cho dropdown)
    const months = useMemo(() => {
        const set = new Set<string>();
        bookings.forEach(b => {
            if (b.booking_date) set.add(b.booking_date.slice(0, 7));
        });
        return Array.from(set).sort().reverse();
    }, [bookings]);

    const filtered = useMemo(() => bookings.filter(b => {
        if (statusFilter !== "all" && b.status !== statusFilter) return false;
        if (monthFilter && !b.booking_date?.startsWith(monthFilter)) return false;
        if (typeFilter !== "all" && b.entity_type !== typeFilter) return false;
        return true;
    }), [bookings, statusFilter, monthFilter, typeFilter]);

    const totalConfirmed = bookings.filter(b => b.status === "confirmed").length;
    const totalAmount    = bookings.filter(b => b.status === "confirmed")
                                   .reduce((s, b) => s + Number(b.final_amount || 0), 0);

    const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString("vi-VN") : "—";
    const fmtDateTime = (s?: string) => s ? new Date(s).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=DM+Sans:wght@400;500&display=swap');

                .txn-title { font-family:'Nunito',sans-serif; font-size:1.2rem; font-weight:800; color:#1a3c6b; margin-bottom:1.25rem; }

                .txn-summary { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.75rem; margin-bottom:1.5rem; }
                @media(max-width:600px){ .txn-summary { grid-template-columns:1fr 1fr; } }
                .txn-sum-card { background:#fff; border-radius:12px; border:1px solid #e8f0fe; padding:1rem 1.25rem; }
                .txn-sum-label { font-size:0.73rem; color:#6b8cbf; font-weight:600; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:0.35rem; }
                .txn-sum-value { font-family:'Nunito',sans-serif; font-size:1.15rem; font-weight:800; }

                .txn-filters { display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem; align-items:center; }
                .txn-filter-btn { padding:0.35rem 0.9rem; border-radius:99px; border:1.5px solid #e8f0fe; background:#fff; color:#6b8cbf; font-size:0.8rem; font-weight:600; cursor:pointer; transition:all 0.15s; white-space:nowrap; }
                .txn-filter-btn.active { background:#0052cc; color:#fff; border-color:#0052cc; }
                .txn-filter-btn:hover:not(.active) { border-color:#0052cc; color:#0052cc; }
                .txn-filter-select { padding:0.38rem 0.85rem; border-radius:99px; border:1.5px solid #e8f0fe; background:#fff; color:#1a3c6b; font-size:0.8rem; font-weight:600; cursor:pointer; outline:none; }

                .txn-list { display:flex; flex-direction:column; gap:0.75rem; }

                .txn-card { background:#fff; border-radius:14px; border:1px solid #e8f0fe; padding:1rem 1.25rem; display:flex; align-items:center; gap:1rem; transition:box-shadow 0.15s, border-color 0.15s; }
                .txn-card:hover { box-shadow:0 4px 16px rgba(0,82,204,0.08); border-color:#c8d8ff; }

                .txn-type-icon { width:46px; height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.35rem; flex-shrink:0; background:#f0f4ff; }
                .txn-body { flex:1; min-width:0; }
                .txn-id-row { display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem; }
                .txn-id { font-size:0.72rem; font-weight:700; color:#6b8cbf; letter-spacing:0.3px; }
                .txn-type-badge { font-size:0.68rem; font-weight:700; padding:0.1rem 0.5rem; border-radius:99px; }
                .txn-name { font-size:0.9rem; font-weight:600; color:#1a3c6b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:320px; }
                .txn-date { font-size:0.73rem; color:#6b8cbf; margin-top:0.2rem; }

                .txn-right { display:flex; flex-direction:column; align-items:flex-end; gap:0.4rem; flex-shrink:0; }
                .txn-amount { font-family:'Nunito',sans-serif; font-size:1rem; font-weight:800; color:#1a3c6b; }
                .txn-status { font-size:0.72rem; font-weight:700; padding:0.2rem 0.6rem; border-radius:99px; white-space:nowrap; }
                .txn-detail-btn { font-size:0.75rem; font-weight:600; color:#0052cc; background:none; border:none; cursor:pointer; padding:0; text-decoration:underline; }

                .txn-empty { text-align:center; padding:3rem; background:#fff; border-radius:14px; border:1px solid #e8f0fe; color:#6b8cbf; }
                .txn-spinner { width:32px; height:32px; margin:3rem auto; border:3px solid #e8f0fe; border-top-color:#0052cc; border-radius:50%; animation:spin 0.8s linear infinite; }
                @keyframes spin { to { transform:rotate(360deg); } }

                /* Modal */
                .txn-modal-overlay { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; padding:1rem; }
                .txn-modal { background:#fff; border-radius:18px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.2); }
                .txn-modal-header { padding:1.5rem 1.5rem 0; display:flex; justify-content:space-between; align-items:center; }
                .txn-modal-title { font-family:'Nunito',sans-serif; font-size:1.05rem; font-weight:800; color:#1a3c6b; }
                .txn-modal-close { background:none; border:none; font-size:1.4rem; cursor:pointer; color:#6b8cbf; line-height:1; }
                .txn-modal-body { padding:1.25rem 1.5rem 1.5rem; }
                .txn-modal-row { display:flex; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid #f0f4ff; font-size:0.88rem; }
                .txn-modal-row:last-child { border-bottom:none; }
                .txn-modal-label { color:#6b8cbf; font-weight:500; }
                .txn-modal-value { font-weight:600; color:#1a3c6b; text-align:right; max-width:60%; }
                .txn-modal-invoice { display:block; width:100%; margin-top:1rem; padding:0.75rem; background:linear-gradient(135deg,#0052cc,#0065ff); color:#fff; text-align:center; border-radius:10px; font-weight:700; font-size:0.9rem; text-decoration:none; }
            `}</style>

            <div className="txn-title">📋 Quản lý giao dịch</div>

            {/* Summary */}
            <div className="txn-summary">
                <div className="txn-sum-card">
                    <div className="txn-sum-label">Tổng giao dịch</div>
                    <div className="txn-sum-value" style={{ color: "#1a3c6b" }}>{bookings.length}</div>
                </div>
                <div className="txn-sum-card">
                    <div className="txn-sum-label">Hoàn thành</div>
                    <div className="txn-sum-value" style={{ color: "#00875a" }}>{totalConfirmed}</div>
                </div>
                <div className="txn-sum-card">
                    <div className="txn-sum-label">Tổng chi tiêu</div>
                    <div className="txn-sum-value" style={{ color: "#0052cc" }}>{totalAmount.toLocaleString("vi-VN")}₫</div>
                </div>
            </div>

            {/* Filters */}
            <div className="txn-filters">
                {/* Status filter */}
                {STATUS_FILTERS.map(f => (
                    <button key={f.key} className={`txn-filter-btn${statusFilter === f.key ? " active" : ""}`} onClick={() => setStatusFilter(f.key)}>
                        {f.label}
                    </button>
                ))}

                {/* Type filter */}
                <select className="txn-filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                    <option value="all">🗂 Tất cả dịch vụ</option>
                    <option value="room">🏨 Khách sạn</option>
                    <option value="flight">✈️ Máy bay</option>
                    <option value="bus">🚌 Xe khách</option>
                    <option value="train">🚆 Tàu hỏa</option>
                </select>

                {/* Month filter */}
                <select className="txn-filter-select" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
                    <option value="">📅 Tất cả thời gian</option>
                    {months.map(m => (
                        <option key={m} value={m}>
                            {new Date(m + "-01").toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
                        </option>
                    ))}
                </select>
            </div>

            {/* List */}
            {loading ? (
                <div className="txn-spinner" />
            ) : filtered.length === 0 ? (
                <div className="txn-empty">
                    <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
                    <p style={{ fontWeight: 600, color: "#1a3c6b" }}>
                        {bookings.length === 0 ? "Bạn chưa có giao dịch nào." : "Không có giao dịch nào phù hợp bộ lọc."}
                    </p>
                </div>
            ) : (
                <div className="txn-list">
                    {filtered.map(b => {
                        const st  = STATUS_MAP[b.status] ?? STATUS_MAP.cancelled;
                        const tp  = TYPE_MAP[b.entity_type] ?? { icon: "🎫", label: b.entity_type, color: "#6b8cbf" };
                        return (
                            <div key={b.booking_id} className="txn-card">
                                <div className="txn-type-icon">{tp.icon}</div>
                                <div className="txn-body">
                                    <div className="txn-id-row">
                                        <span className="txn-id">#{b.booking_id}</span>
                                        <span className="txn-type-badge" style={{ background: tp.color + "18", color: tp.color }}>{tp.label}</span>
                                    </div>
                                    <div className="txn-name">{b.entity_name || `${tp.label} #${b.entity_type}`}</div>
                                    <div className="txn-date">🕐 {fmtDateTime(b.booking_date)}</div>
                                </div>
                                <div className="txn-right">
                                    <span className="txn-amount">{Number(b.final_amount || 0).toLocaleString("vi-VN")}₫</span>
                                    <span className="txn-status" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                                        {st.label}
                                    </span>
                                    <button className="txn-detail-btn" onClick={() => setDetail(b)}>Xem chi tiết →</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detail Modal */}
            {detail && (() => {
                const st = STATUS_MAP[detail.status] ?? STATUS_MAP.cancelled;
                const tp = TYPE_MAP[detail.entity_type] ?? { icon: "🎫", label: detail.entity_type, color: "#6b8cbf" };
                return (
                    <div className="txn-modal-overlay" onClick={() => setDetail(null)}>
                        <div className="txn-modal" onClick={e => e.stopPropagation()}>
                            <div className="txn-modal-header">
                                <div className="txn-modal-title">{tp.icon} Chi tiết giao dịch #{detail.booking_id}</div>
                                <button className="txn-modal-close" onClick={() => setDetail(null)}>×</button>
                            </div>
                            <div className="txn-modal-body">
                                <div className="txn-modal-row">
                                    <span className="txn-modal-label">Mã giao dịch</span>
                                    <span className="txn-modal-value" style={{ color: "#0052cc", fontWeight: 800 }}>#{detail.booking_id}</span>
                                </div>
                                <div className="txn-modal-row">
                                    <span className="txn-modal-label">Loại dịch vụ</span>
                                    <span className="txn-modal-value">{tp.icon} {tp.label}</span>
                                </div>
                                <div className="txn-modal-row">
                                    <span className="txn-modal-label">Tên dịch vụ</span>
                                    <span className="txn-modal-value">{detail.entity_name || "—"}</span>
                                </div>
                                {detail.check_in_date && (
                                    <div className="txn-modal-row">
                                        <span className="txn-modal-label">{detail.entity_type === "room" ? "Nhận phòng" : "Khởi hành"}</span>
                                        <span className="txn-modal-value">{fmtDate(detail.check_in_date)}</span>
                                    </div>
                                )}
                                {detail.check_out_date && (
                                    <div className="txn-modal-row">
                                        <span className="txn-modal-label">{detail.entity_type === "room" ? "Trả phòng" : "Đến nơi"}</span>
                                        <span className="txn-modal-value">{fmtDate(detail.check_out_date)}</span>
                                    </div>
                                )}
                                <div className="txn-modal-row">
                                    <span className="txn-modal-label">Phương thức TT</span>
                                    <span className="txn-modal-value">Ví VIVU / Chuyển khoản</span>
                                </div>
                                <div className="txn-modal-row">
                                    <span className="txn-modal-label">Tổng tiền</span>
                                    <span className="txn-modal-value" style={{ color: "#0052cc", fontSize: "1.05rem" }}>
                                        {Number(detail.final_amount || 0).toLocaleString("vi-VN")}₫
                                    </span>
                                </div>
                                <div className="txn-modal-row">
                                    <span className="txn-modal-label">Trạng thái</span>
                                    <span style={{ padding: "0.2rem 0.7rem", borderRadius: 99, fontSize: "0.78rem", fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                                        {st.label}
                                    </span>
                                </div>
                                <div className="txn-modal-row">
                                    <span className="txn-modal-label">Ngày giờ giao dịch</span>
                                    <span className="txn-modal-value">{fmtDateTime(detail.booking_date)}</span>
                                </div>

                                {detail.status === "confirmed" && (
                                    <Link href={`/invoice/${detail.booking_id}`} className="txn-modal-invoice">
                                        🧾 Xem hoá đơn chi tiết
                                    </Link>
                                )}
                                {detail.status === "pending" && (
                                    <Link href={`/payment/${detail.booking_id}`} className="txn-modal-invoice" style={{ background: "linear-gradient(135deg,#b8760b,#d4a050)" }}>
                                        💳 Tiếp tục thanh toán
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
}
