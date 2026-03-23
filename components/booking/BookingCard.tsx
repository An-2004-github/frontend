"use client";

import { useState } from "react";
import { BookingData } from "@/store/bookingStore";

const fmt = (n: number) => n.toLocaleString("vi-VN") + " VND";

const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const fmtDate = (s: string) => {
    const d = new Date(s);
    const wd = WEEKDAYS[d.getDay()];
    const day = String(d.getDate()).padStart(2, "0");
    const mon = String(d.getMonth() + 1).padStart(2, "0");
    return `${wd}, ${day} tháng ${mon} ${d.getFullYear()}`;
};

interface Props {
    booking: BookingData;
    onContinue: () => void;
    submitting: boolean;
}

export default function BookingCard({ booking, onContinue, submitting }: Props) {
    const [priceOpen, setPriceOpen] = useState(true);

    return (
        <>
            <style>{`
                .bc-wrap { background: #fff; border-radius: 12px; border: 1px solid #dde3f0; overflow: hidden; position: sticky; top: 80px; }
                .bc-banner { background: #e8f4fd; padding: 0.6rem 1rem; font-size: 0.8rem; color: #1a3c6b; font-weight: 600; border-bottom: 1px solid #bee3f8; }
                .bc-body { padding: 1rem 1.25rem; }
                .bc-room-name { font-size: 1rem; font-weight: 700; color: #1a3c6b; margin-bottom: 0.2rem; }
                .bc-popular { font-size: 0.78rem; color: #e05c00; font-weight: 600; margin-bottom: 1rem; }
                .bc-dates { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0.5rem; align-items: start; margin-bottom: 1rem; }
                .bc-date-col {}
                .bc-date-label { font-size: 0.72rem; color: #6b8cbf; margin-bottom: 0.15rem; }
                .bc-date-val { font-size: 0.85rem; font-weight: 700; color: #1a3c6b; }
                .bc-date-time { font-size: 0.75rem; color: #6b8cbf; margin-top: 0.15rem; }
                .bc-nights { text-align: center; font-size: 0.78rem; color: #6b8cbf; padding-top: 0.8rem; }
                .bc-nights strong { display: block; font-size: 0.9rem; color: #1a3c6b; }
                .bc-info-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #444; margin-bottom: 0.45rem; }
                .bc-info-icon { color: #6b8cbf; }
                .bc-policy { font-size: 0.78rem; color: #6b8cbf; display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.35rem; }
                .bc-policy-icon { width: 15px; height: 15px; border-radius: 50%; border: 1px solid #aaa; display: inline-flex; align-items: center; justify-content: center; font-size: 0.6rem; color: #777; flex-shrink: 0; }
                .bc-divider { border: none; border-top: 1px solid #eef0f8; margin: 0.85rem 0; }
                .bc-price-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
                .bc-price-title { font-size: 0.88rem; font-weight: 700; color: #1a3c6b; }
                .bc-chevron { font-size: 0.85rem; color: #6b8cbf; transition: transform 0.2s; }
                .bc-price-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 0.75rem; }
                .bc-price-label { font-size: 0.84rem; color: #444; }
                .bc-price-sub { font-size: 0.72rem; color: #999; margin-top: 0.1rem; }
                .bc-price-val { font-size: 0.84rem; color: #1a3c6b; font-weight: 600; text-align: right; }
                .bc-total-label { font-size: 0.88rem; font-weight: 700; color: #1a3c6b; }
                .bc-total-sub { font-size: 0.72rem; color: #999; margin-top: 0.1rem; }
                .bc-total-val { text-align: right; }
                .bc-total-original { font-size: 0.78rem; color: #aaa; text-decoration: line-through; }
                .bc-total-final { font-size: 1.05rem; font-weight: 800; color: #d32f2f; }
                .bc-btn { width: 100%; padding: 0.9rem; background: linear-gradient(135deg, #0052cc, #0065ff); color: #fff; border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: opacity 0.15s; margin-top: 1rem; font-family: inherit; }
                .bc-btn:hover:not(:disabled) { opacity: 0.9; }
                .bc-btn:disabled { opacity: 0.55; cursor: not-allowed; }
                .bc-terms { font-size: 0.72rem; color: #999; text-align: center; margin-top: 0.6rem; line-height: 1.4; }
                .bc-terms a { color: #0052cc; text-decoration: none; }
            `}</style>

            <div className="bc-wrap">
                {booking.type === "hotel" && (
                    <div className="bc-banner">
                        🌟 Chỗ ở phổ biến! Ngày bạn chọn đang được nhiều người đặt.
                    </div>
                )}

                <div className="bc-body">
                    {/* Tên phòng / chuyến */}
                    {booking.type === "hotel" && (
                        <>
                            <div className="bc-room-name">
                                ({booking.quantity}x) {booking.roomName}
                            </div>
                            <div className="bc-popular">Được nhiều người chọn!</div>

                            {/* Ngày check-in / check-out */}
                            <div className="bc-dates">
                                <div className="bc-date-col">
                                    <div className="bc-date-label">Nhận phòng</div>
                                    <div className="bc-date-val">{fmtDate(booking.checkIn)}</div>
                                    <div className="bc-date-time">Từ {booking.checkInTime || "14:00"}</div>
                                </div>
                                <div className="bc-nights">
                                    <strong>{booking.nights}</strong>
                                    đêm →
                                </div>
                                <div className="bc-date-col">
                                    <div className="bc-date-label">Trả phòng</div>
                                    <div className="bc-date-val">{fmtDate(booking.checkOut)}</div>
                                    <div className="bc-date-time">Trước {booking.checkOutTime || "12:00"}</div>
                                </div>
                            </div>

                            {/* Khách */}
                            <div className="bc-info-row">
                                <span>👥 {booking.guests} khách</span>
                                <span className="bc-info-icon">🛏</span>
                                <span className="bc-info-icon">📶</span>
                            </div>

                            {/* Chính sách */}
                            <div className="bc-policy">
                                <span className="bc-policy-icon">i</span>
                                Đặt phòng này không được hoàn tiền.
                            </div>
                            <div className="bc-policy">
                                <span className="bc-policy-icon">i</span>
                                Non-reschedulable
                            </div>
                        </>
                    )}

                    {booking.type === "flight" && (
                        <>
                            <div className="bc-room-name">{booking.airline}</div>
                            <div className="bc-popular">{booking.fromCity} → {booking.toCity}</div>
                            <div className="bc-info-row">✈ Khởi hành: {new Date(booking.departTime).toLocaleString("vi-VN")}</div>
                            <div className="bc-info-row">✈ Đến: {new Date(booking.arriveTime).toLocaleString("vi-VN")}</div>
                            <div className="bc-info-row">👥 {booking.passengers} hành khách · {booking.seatClass === "business" ? "Thương gia" : "Phổ thông"}</div>
                        </>
                    )}

                    {booking.type === "bus" && (
                        <>
                            <div className="bc-room-name">{booking.company}</div>
                            <div className="bc-popular">{booking.fromCity} → {booking.toCity}</div>
                            <div className="bc-info-row">🚌 Khởi hành: {new Date(booking.departTime).toLocaleString("vi-VN")}</div>
                            <div className="bc-info-row">👥 {booking.passengers} hành khách</div>
                        </>
                    )}

                    <hr className="bc-divider" />

                    {/* Chi tiết giá */}
                    <div className="bc-price-header" onClick={() => setPriceOpen(o => !o)}>
                        <span className="bc-price-title">Chi tiết giá</span>
                        <span className="bc-chevron" style={{ transform: priceOpen ? "rotate(0)" : "rotate(180deg)" }}>∧</span>
                    </div>

                    {priceOpen && (
                        <>
                            <div className="bc-price-row">
                                <div>
                                    <div className="bc-price-label">Giá {booking.type === "hotel" ? "phòng" : "vé"}</div>
                                    {booking.type === "hotel" && (
                                        <div className="bc-price-sub">({booking.quantity}x) {booking.roomName} ({booking.nights} đêm)</div>
                                    )}
                                </div>
                                <div className="bc-price-val">{fmt(booking.basePrice)}</div>
                            </div>
                            <div className="bc-price-row">
                                <div className="bc-price-label">Thuế và phí</div>
                                <div className="bc-price-val">{fmt(booking.taxAndFees)}</div>
                            </div>

                            <hr className="bc-divider" />

                            <div className="bc-price-row">
                                <div>
                                    <div className="bc-total-label">Tổng cộng</div>
                                    <div className="bc-total-sub">
                                        {booking.type === "hotel"
                                            ? `${booking.quantity} phòng, ${booking.nights} đêm`
                                            : booking.type === "flight"
                                            ? `${booking.passengers} hành khách`
                                            : `${booking.passengers} hành khách`
                                        }
                                    </div>
                                </div>
                                <div className="bc-total-val">
                                    {booking.type === "hotel" && booking.originalPrice && booking.originalPrice > booking.totalPrice && (
                                        <div className="bc-total-original">{fmt(booking.originalPrice)}</div>
                                    )}
                                    <div className="bc-total-final">{fmt(booking.totalPrice)}</div>
                                </div>
                            </div>
                        </>
                    )}

                    <button className="bc-btn" onClick={onContinue} disabled={submitting}>
                        {submitting ? "Đang xử lý..." : "Tiếp tục"}
                    </button>

                    <div className="bc-terms">
                        Bằng cách tiến hành thanh toán, bạn đã đồng ý với{" "}
                        <a href="#">Điều khoản và Điều kiện</a>,{" "}
                        <a href="#">Chính sách Bảo mật</a>, và{" "}
                        <a href="#">Quy trình Hoàn tiền Lưu trú</a>.
                    </div>
                </div>
            </div>
        </>
    );
}
