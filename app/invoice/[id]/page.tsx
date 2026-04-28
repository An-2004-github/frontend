"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";
import BookingSuggestions from "@/components/booking/BookingSuggestions";

interface BookingItem {
    entity_type: string;
    entity_name: string;
    price: number;
    check_in_date?: string;
    check_out_date?: string;
    from_city?: string;
    to_city?: string;
    from_station?: string;
    to_station?: string;
    depart_time?: string;
    arrive_time?: string;
    quantity: number;
    seat_class?: string;
    adults?: number;
    children?: number;
}

interface InvoiceData {
    booking_id: number;
    booking_date: string;
    status: string;
    total_price: number;
    final_amount: number;
    discount_amount: number;
    promo: { code: string; description?: string } | null;
    items: BookingItem[];
    user: { full_name: string; email: string; phone?: string };
}

const CLASS_LABEL: Record<string, string> = {
    economy: "Phổ thông", business: "Thương gia", first: "Hạng nhất",
    standard: "Ghế thường", vip: "Ghế VIP", sleeper: "Giường nằm",
    hard_seat: "Ngồi cứng", soft_seat: "Ngồi mềm",
    hard_sleeper: "Nằm cứng", soft_sleeper: "Nằm mềm",
};

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
    room:   { icon: "🏨", label: "Khách sạn",  color: "#0052cc" },
    flight: { icon: "✈️", label: "Chuyến bay", color: "#6f42c1" },
    bus:    { icon: "🚌", label: "Xe khách",   color: "#fd7e14" },
    train:  { icon: "🚆", label: "Tàu hỏa",   color: "#003580" },
};

const fmt = (n: number) => n?.toLocaleString("vi-VN") + "₫";

const fmtDate = (s?: string | null) => {
    if (!s) return "—";
    try { return new Date(s).toLocaleDateString("vi-VN"); } catch { return s; }
};
const fmtDateTime = (s?: string | null) => {
    if (!s) return "—";
    try { return new Date(s).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }); } catch { return s; }
};

export default function InvoicePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [invoice, setInvoice] = useState<InvoiceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/api/bookings/${id}`)
            .then(res => setInvoice(res.data))
            .catch(() => router.replace("/profile/bookings"))
            .finally(() => setLoading(false));
    }, [id, router]);

    if (loading) return (
        <div style={{ minHeight: "100vh", background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 40, height: 40, border: "3px solid #c8d8ff", borderTopColor: "#0052cc", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (!invoice) return null;

    const item = invoice.items?.[0];
    const cfg = TYPE_CONFIG[item?.entity_type] ?? { icon: "🎫", label: "Dịch vụ", color: "#0052cc" };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
                * { box-sizing: border-box; }
                body { margin: 0; background: #f0f4ff; }
                .inv-root { min-height: 100vh; background: #f0f4ff; font-family: 'DM Sans', sans-serif; padding: 2rem 1rem 4rem; }
                .inv-wrap { max-width: 600px; margin: 0 auto; }

                /* Success header */
                .inv-hero {
                    background: linear-gradient(135deg, #003580, #0052cc, #0065ff);
                    border-radius: 20px 20px 0 0;
                    padding: 2.5rem 2rem; text-align: center; position: relative; overflow: hidden;
                }
                .inv-hero-bg {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px);
                    background-size: 22px 22px;
                }
                .inv-check {
                    width: 72px; height: 72px; border-radius: 50%;
                    background: rgba(255,255,255,0.15); border: 3px solid rgba(255,255,255,0.4);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 2rem; margin: 0 auto 1rem; position: relative;
                    animation: popIn 0.4s ease;
                }
                @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .inv-hero-title { font-family: 'Nunito', sans-serif; font-size: 1.5rem; font-weight: 800; color: #fff; margin: 0 0 0.3rem; position: relative; }
                .inv-hero-sub { color: rgba(255,255,255,0.75); font-size: 0.88rem; position: relative; }
                .inv-booking-id {
                    display: inline-block; margin-top: 0.9rem;
                    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
                    color: #fff; border-radius: 99px; padding: 0.3rem 1.1rem;
                    font-size: 0.85rem; font-weight: 600; position: relative;
                }

                /* Body card */
                .inv-card { background: #fff; border-radius: 0 0 20px 20px; border: 1px solid #e8f0fe; border-top: none; }

                /* Service banner */
                .inv-service {
                    padding: 1.5rem 2rem; border-bottom: 1px solid #f0f4ff;
                    display: flex; align-items: center; gap: 1rem;
                }
                .inv-service-icon {
                    width: 52px; height: 52px; border-radius: 14px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.6rem; flex-shrink: 0;
                }
                .inv-service-name { font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700; color: #1a3c6b; }
                .inv-service-type { font-size: 0.78rem; font-weight: 600; margin-top: 0.2rem; }

                /* Info rows */
                .inv-section { padding: 1.25rem 2rem; border-bottom: 1px solid #f0f4ff; }
                .inv-section-title { font-size: 0.72rem; font-weight: 700; color: #6b8cbf; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.85rem; }
                .inv-row { display: flex; justify-content: space-between; align-items: center; padding: 0.45rem 0; }
                .inv-row:not(:last-child) { border-bottom: 1px solid #f8faff; }
                .inv-label { font-size: 0.84rem; color: #6b8cbf; }
                .inv-value { font-size: 0.88rem; font-weight: 600; color: #1a3c6b; text-align: right; }

                /* Total */
                .inv-total {
                    padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center;
                }
                .inv-total-label { font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700; color: #1a3c6b; }
                .inv-total-value { font-family: 'Nunito', sans-serif; font-size: 1.6rem; font-weight: 800; color: #0052cc; }

                /* Status badge */
                .inv-status-paid { display: inline-flex; align-items: center; gap: 0.4rem; background: #d4edda; color: #00875a; border: 1px solid #b7dfbb; border-radius: 99px; padding: 0.25rem 0.85rem; font-size: 0.78rem; font-weight: 700; }

                /* Actions */
                .inv-actions { padding: 1.5rem 2rem; background: #f8faff; border-top: 1px solid #e8f0fe; border-radius: 0 0 20px 20px; display: flex; gap: 0.75rem; flex-wrap: wrap; }
                .inv-btn-print {
                    flex: 1; min-width: 140px; padding: 0.75rem; border: 1.5px solid #c8d8ff; border-radius: 10px;
                    background: #fff; color: #0052cc; font-size: 0.88rem; font-weight: 600;
                    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
                    transition: background 0.15s;
                }
                .inv-btn-print:hover { background: #f0f4ff; }
                .inv-btn-primary {
                    flex: 1; min-width: 140px; padding: 0.75rem; border: none; border-radius: 10px;
                    background: linear-gradient(135deg, #0052cc, #0065ff); color: #fff; font-size: 0.88rem; font-weight: 600;
                    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
                    text-decoration: none; transition: opacity 0.15s;
                }
                .inv-btn-primary:hover { opacity: 0.9; }

                @media print {
                    .inv-actions { display: none; }
                    .inv-root { padding: 0; background: #fff; }
                    .inv-hero { border-radius: 0; }
                    .inv-card { border-radius: 0; border: none; }
                }
            `}</style>

            <div className="inv-root">
                <div className="inv-wrap">
                    {/* Header */}
                    <div className="inv-hero">
                        <div className="inv-hero-bg" />
                        <div className="inv-check">✓</div>
                        <div className="inv-hero-title">Thanh toán thành công!</div>
                        <div className="inv-hero-sub">Cảm ơn bạn đã sử dụng dịch vụ VIVU Travel</div>
                        <div className="inv-booking-id">Mã đặt chỗ: #{invoice.booking_id}</div>
                    </div>

                    <div className="inv-card">
                        {/* Service info */}
                        {item && (
                            <div className="inv-service">
                                <div className="inv-service-icon" style={{ background: `${cfg.color}15` }}>
                                    {cfg.icon}
                                </div>
                                <div>
                                    <div className="inv-service-name">{item.entity_name}</div>
                                    <div className="inv-service-type" style={{ color: cfg.color }}>
                                        {cfg.label}
                                    </div>
                                </div>
                                <div style={{ marginLeft: "auto" }}>
                                    <div className="inv-status-paid">✓ Đã thanh toán</div>
                                </div>
                            </div>
                        )}

                        {/* Thông tin khách hàng */}
                        <div className="inv-section">
                            <div className="inv-section-title">👤 Thông tin khách hàng</div>
                            <div className="inv-row">
                                <span className="inv-label">Họ tên</span>
                                <span className="inv-value">{invoice.user?.full_name || "—"}</span>
                            </div>
                            <div className="inv-row">
                                <span className="inv-label">Email</span>
                                <span className="inv-value" style={{ fontSize: "0.82rem" }}>{invoice.user?.email || "—"}</span>
                            </div>
                            {invoice.user?.phone && (
                                <div className="inv-row">
                                    <span className="inv-label">Số điện thoại</span>
                                    <span className="inv-value">{invoice.user.phone}</span>
                                </div>
                            )}
                        </div>

                        {/* Chi tiết dịch vụ */}
                        {item && (
                            <div className="inv-section">
                                <div className="inv-section-title">📋 Chi tiết dịch vụ</div>

                                {/* Khách sạn */}
                                {item.entity_type === "room" && (
                                    <>
                                        <div className="inv-row">
                                            <span className="inv-label">🛏 Số phòng</span>
                                            <span className="inv-value">{item.quantity} phòng</span>
                                        </div>
                                        {(item.adults ?? 0) > 0 && (
                                            <div className="inv-row">
                                                <span className="inv-label">👤 Người lớn</span>
                                                <span className="inv-value">{item.adults} người</span>
                                            </div>
                                        )}
                                        {(item.children ?? 0) > 0 && (
                                            <div className="inv-row">
                                                <span className="inv-label">🧒 Trẻ em</span>
                                                <span className="inv-value">{item.children} trẻ em</span>
                                            </div>
                                        )}
                                        {item.check_in_date && (
                                            <div className="inv-row">
                                                <span className="inv-label">📅 Nhận phòng</span>
                                                <span className="inv-value">{fmtDate(item.check_in_date)}</span>
                                            </div>
                                        )}
                                        {item.check_out_date && (
                                            <div className="inv-row">
                                                <span className="inv-label">📅 Trả phòng</span>
                                                <span className="inv-value">{fmtDate(item.check_out_date)}</span>
                                            </div>
                                        )}
                                        {item.check_in_date && item.check_out_date && (
                                            <div className="inv-row">
                                                <span className="inv-label">🌙 Số đêm</span>
                                                <span className="inv-value">
                                                    {Math.max(1, Math.round((new Date(item.check_out_date).getTime() - new Date(item.check_in_date).getTime()) / 86400000))} đêm
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Chuyến bay / Xe khách / Tàu hỏa */}
                                {(item.entity_type === "flight" || item.entity_type === "bus" || item.entity_type === "train") && (
                                    <>
                                        {item.from_city && item.to_city && (
                                            <div className="inv-row">
                                                <span className="inv-label">🗺 Tuyến đường</span>
                                                <span className="inv-value">{item.from_city} → {item.to_city}</span>
                                            </div>
                                        )}
                                        {item.entity_type === "train" && item.from_station && item.to_station && (
                                            <div className="inv-row">
                                                <span className="inv-label">🚉 Ga đi / Ga đến</span>
                                                <span className="inv-value">{item.from_station} → {item.to_station}</span>
                                            </div>
                                        )}
                                        {item.depart_time && (
                                            <div className="inv-row">
                                                <span className="inv-label">🛫 Khởi hành</span>
                                                <span className="inv-value">{fmtDateTime(item.depart_time)}</span>
                                            </div>
                                        )}
                                        {item.arrive_time && (
                                            <div className="inv-row">
                                                <span className="inv-label">🛬 Đến nơi</span>
                                                <span className="inv-value">{fmtDateTime(item.arrive_time)}</span>
                                            </div>
                                        )}
                                        <div className="inv-row">
                                            <span className="inv-label">👥 Số hành khách</span>
                                            <span className="inv-value">{item.quantity} người</span>
                                        </div>
                                        {item.seat_class && (
                                            <div className="inv-row">
                                                <span className="inv-label">💺 Hạng ghế</span>
                                                <span className="inv-value">{CLASS_LABEL[item.seat_class] ?? item.seat_class}</span>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="inv-row">
                                    <span className="inv-label">📆 Ngày đặt</span>
                                    <span className="inv-value">{fmtDate(invoice.booking_date)}</span>
                                </div>
                            </div>
                        )}

                        {/* Tổng tiền */}
                        <div style={{ padding: "1.25rem 2rem", borderTop: "2px dashed #e8f0fe" }}>
                            <div className="inv-row">
                                <span className="inv-label">Giá gốc</span>
                                <span className="inv-value">{fmt(invoice.total_price)}</span>
                            </div>
                            {invoice.promo && (
                                <div className="inv-row">
                                    <span className="inv-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        🎟️ Mã giảm giá
                                        <span style={{ background: "#e8f0fe", color: "#0052cc", borderRadius: 99, padding: "1px 8px", fontSize: "0.75rem", fontWeight: 700 }}>
                                            {invoice.promo.code}
                                        </span>
                                    </span>
                                    <span className="inv-value" style={{ color: "#00875a" }}>
                                        -{fmt(invoice.discount_amount)}
                                    </span>
                                </div>
                            )}
                            <div className="inv-total" style={{ padding: "1rem 0 0", borderTop: "1px solid #f0f4ff", marginTop: "0.5rem" }}>
                                <div>
                                    <div className="inv-total-label">Tổng thanh toán</div>
                                    <div style={{ fontSize: "0.78rem", color: "#6b8cbf", marginTop: "0.2rem" }}>Đã bao gồm tất cả phí dịch vụ</div>
                                </div>
                                <div className="inv-total-value">{fmt(invoice.final_amount ?? invoice.total_price)}</div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="inv-actions">
                            <button className="inv-btn-print" onClick={() => window.print()}>
                                🖨️ In hóa đơn
                            </button>
                            <Link href="/profile/bookings" className="inv-btn-primary">
                                📋 Xem lịch sử đặt chỗ
                            </Link>
                            <Link href="/" className="inv-btn-primary" style={{ background: "linear-gradient(135deg, #00875a, #00a86b)" }}>
                                🏠 Về trang chủ
                            </Link>
                        </div>
                    </div>
                </div>

                <BookingSuggestions
                    entityType={item?.entity_type as "room" | "flight" | "bus" | "train"}
                    toCity={item?.to_city}
                    checkIn={item?.check_in_date}
                />
            </div>
        </>
    );
}
