"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useBookingStore } from "@/store/bookingStore";
import { Hotel, RoomType } from "@/types/hotel";
import { logInteraction } from "@/lib/logInteraction";
import ReviewForm from "@/components/review/ReviewForm";
import ReviewList from "@/components/review/ReviewList";

interface Review {
    review_id: number;
    user_id: number;
    full_name: string;
    rating: number;
    comment: string;
    created_at: string;
}

interface AvailableRoom extends RoomType {
    available_rooms: number;
}

const TODAY = new Date().toISOString().split("T")[0];
const TOMORROW = new Date(Date.now() + 86400000).toISOString().split("T")[0];

const AMENITY_ICONS: Record<string, string> = {
    "WiFi miễn phí": "📶", "Hồ bơi": "🏊", "Spa": "💆", "Nhà hàng": "🍽",
    "Bar": "🍸", "Phòng gym": "🏋", "Bãi đậu xe": "🅿", "Bãi biển riêng": "🏖",
    "Kids club": "🎠", "Butler": "🤵", "Sân golf": "⛳", "Casino": "🎰",
};

export default function HotelDetailPage() {
    const { hotel_id } = useParams<{ hotel_id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();
    const { setBooking } = useBookingStore();

    const [hotel, setHotel] = useState<(Hotel & { reviews: Review[] }) | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeImg, setActiveImg] = useState(0);
    const [reviewRefreshKey, setReviewRefreshKey] = useState(0);

    const [checkIn, setCheckIn] = useState(TODAY);
    const [checkOut, setCheckOut] = useState(TOMORROW);
    const [guests, setGuests] = useState(2);
    const [availRooms, setAvailRooms] = useState<AvailableRoom[]>([]);
    const [checkLoading, setCheckLoading] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);

    useEffect(() => {
        api.get(`/api/hotels/${hotel_id}`)
            .then(res => {
                const data = res.data;
                if (!data.reviews) data.reviews = [];
                setHotel(data);
                logInteraction("hotel", Number(hotel_id), "view_detail");
            })
            .catch(() => router.push("/hotels"))
            .finally(() => setLoading(false));
    }, [hotel_id, router]);

    const [availError, setAvailError] = useState<string | null>(null);

    const handleCheckAvailability = async () => {
        if (!checkIn || !checkOut || checkIn >= checkOut) return;
        setCheckLoading(true);
        setSelectedRoom(null);
        setAvailError(null);
        try {
            const res = await api.get(`/api/hotels/${hotel_id}/availability`, {
                params: { check_in: checkIn, check_out: checkOut },
            });
            setAvailRooms(res.data);
            if (res.data.length === 0) {
                setAvailError("Không còn phòng trống trong khoảng thời gian này.");
            }
        } catch {
            setAvailError("Không thể kiểm tra phòng trống. Vui lòng thử lại.");
        } finally {
            setCheckLoading(false);
        }
    };

    const nights = Math.max(1, Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    ));

    const handleBook = () => {
        if (!selectedRoom || !hotel) return;
        const basePrice = selectedRoom.price_per_night * nights;
        const taxAndFees = Math.round(basePrice * 0.21);

        setBooking({
            type: "hotel",
            hotelId: Number(hotel_id),
            hotelName: hotel.name,
            roomTypeId: selectedRoom.room_type_id,
            roomName: selectedRoom.name,
            quantity: 1,
            checkIn,
            checkOut,
            nights,
            guests,
            basePrice,
            taxAndFees,
            totalPrice: basePrice + taxAndFees,
            checkInTime: selectedRoom.check_in_time || hotel.check_in_time || "14:00",
            checkOutTime: selectedRoom.check_out_time || hotel.check_out_time || "12:00",
        });

        router.push("/booking");
    };

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
            <div className="hdp-spinner" />
        </div>
    );
    if (!hotel) return null;

    const amenities: string[] = (() => {
        try { return JSON.parse(hotel.amenities as unknown as string) || []; }
        catch { return []; }
    })();

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
                * { box-sizing: border-box; }
                .hdp-root { min-height: 100vh; background: #f0f4ff; font-family: 'DM Sans', sans-serif; }

                .hdp-breadcrumb { background: #fff; border-bottom: 1px solid #e8f0fe; padding: 0.75rem 1.5rem; font-size: 0.82rem; color: #6b8cbf; }
                .hdp-breadcrumb a { color: #0052cc; text-decoration: none; }
                .hdp-breadcrumb a:hover { text-decoration: underline; }
                .hdp-breadcrumb span { margin: 0 0.4rem; }

                .hdp-content { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }

                /* Gallery */
                .hdp-gallery { display: flex; gap: 0.75rem; margin-bottom: 2rem; border-radius: 16px; overflow: hidden; height: 420px; }
                .hdp-gallery-main { flex: 2; position: relative; }
                .hdp-gallery-thumbs { flex: 1; display: flex; flex-direction: column; gap: 0.75rem; }
                .hdp-gallery-thumb { flex: 1; position: relative; border-radius: 8px; overflow: hidden; opacity: 0.7; transition: opacity 0.2s; cursor: pointer; }
                .hdp-gallery-thumb:hover, .hdp-gallery-thumb.active { opacity: 1; }
                .hdp-gallery-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg,#003580,#0065ff); display: flex; align-items: center; justify-content: center; font-size: 5rem; opacity: 0.4; }

                /* Layout */
                .hdp-layout { display: flex; gap: 2rem; align-items: flex-start; }
                .hdp-left { flex: 1; min-width: 0; }
                .hdp-right { width: 340px; flex-shrink: 0; position: sticky; top: 80px; }

                /* Section */
                .hdp-section { background: #fff; border-radius: 16px; border: 1px solid #e8f0fe; padding: 1.5rem; margin-bottom: 1.25rem; }
                .hdp-section-title { font-family: 'Nunito', sans-serif; font-size: 1.1rem; font-weight: 700; color: #1a3c6b; margin: 0 0 1.1rem; padding-bottom: 0.75rem; border-bottom: 2px solid #e8f0fe; display: flex; align-items: center; gap: 0.5rem; }

                /* Info */
                .hdp-name { font-family: 'Nunito', sans-serif; font-size: 1.6rem; font-weight: 800; color: #1a3c6b; margin-bottom: 0.5rem; }
                .hdp-meta { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
                .hdp-rating-badge { background: #0052cc; color: #fff; font-size: 0.9rem; font-weight: 700; padding: 0.3rem 0.7rem; border-radius: 8px; }
                .hdp-rating-label { font-size: 0.88rem; font-weight: 500; color: #1a3c6b; }
                .hdp-review-count { font-size: 0.82rem; color: #6b8cbf; }
                .hdp-location { font-size: 0.9rem; color: #6b8cbf; }
                .hdp-desc { color: #4a5568; line-height: 1.75; font-size: 0.95rem; }

                /* Amenities */
                .hdp-amenities { display: flex; flex-wrap: wrap; gap: 0.6rem; }
                .hdp-amenity { display: flex; align-items: center; gap: 0.4rem; background: #f0f4ff; border: 1px solid #e8f0fe; padding: 0.4rem 0.85rem; border-radius: 99px; font-size: 0.82rem; color: #1a3c6b; }

                /* Reviews */
                .hdp-review { padding: 1rem 0; border-bottom: 1px solid #f0f4ff; }
                .hdp-review:last-child { border-bottom: none; }
                .hdp-review-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
                .hdp-review-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg,#0052cc,#0065ff); color: #fff; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .hdp-review-name { font-size: 0.88rem; font-weight: 600; color: #1a3c6b; }
                .hdp-review-date { font-size: 0.75rem; color: #6b8cbf; }
                .hdp-review-comment { font-size: 0.88rem; color: #4a5568; line-height: 1.6; }

                /* Booking */
                .hdp-book-card { background: #fff; border-radius: 16px; border: 1px solid #e8f0fe; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0,82,204,0.08); }
                .hdp-book-title { font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700; color: #1a3c6b; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 2px solid #e8f0fe; }
                .hdp-date-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 0.75rem; }
                .hdp-field { display: flex; flex-direction: column; gap: 0.3rem; }
                .hdp-field-label { font-size: 0.72rem; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.4px; }
                .hdp-field-input { border: 1.5px solid #dde3f0; border-radius: 10px; padding: 0.65rem 0.75rem; font-size: 0.88rem; font-family: 'DM Sans',sans-serif; color: #1a3c6b; outline: none; width: 100%; transition: border-color 0.2s; }
                .hdp-field-input:focus { border-color: #0052cc; }
                .hdp-check-btn { width: 100%; padding: 0.75rem; background: #f0f4ff; color: #0052cc; border: 1.5px solid #c8d8ff; border-radius: 10px; font-family: 'DM Sans',sans-serif; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: background 0.15s; margin-bottom: 1rem; }
                .hdp-check-btn:hover { background: #dde9ff; }
                .hdp-room { border: 1.5px solid #e8f0fe; border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem; cursor: pointer; transition: border-color 0.18s, background 0.18s; }
                .hdp-room:hover { border-color: #0052cc; background: #fafbff; }
                .hdp-room.selected { border-color: #0052cc; background: #e8f0fe; }
                .hdp-room-name { font-size: 0.9rem; font-weight: 600; color: #1a3c6b; margin-bottom: 0.3rem; }
                .hdp-room-meta { display: flex; justify-content: space-between; align-items: center; }
                .hdp-room-guests { font-size: 0.78rem; color: #6b8cbf; }
                .hdp-room-price { font-family: 'Nunito',sans-serif; font-size: 1rem; font-weight: 800; color: #0052cc; }
                .hdp-room-avail { font-size: 0.72rem; color: #00875a; margin-top: 0.2rem; }
                .hdp-room-avail.low { color: #c0392b; }
                .hdp-total { background: #f0f4ff; border-radius: 10px; padding: 0.85rem 1rem; margin-top: 0.75rem; font-size: 0.88rem; color: #1a3c6b; display: flex; justify-content: space-between; align-items: center; }
                .hdp-total-price { font-family: 'Nunito',sans-serif; font-size: 1.1rem; font-weight: 800; color: #0052cc; }
                .hdp-book-btn { width: 100%; padding: 0.85rem; background: linear-gradient(135deg,#0052cc,#0065ff); color: #fff; border: none; border-radius: 10px; font-family: 'Nunito',sans-serif; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: opacity 0.15s, transform 0.15s; margin-top: 0.75rem; }
                .hdp-book-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
                .hdp-book-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .hdp-book-msg { padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.85rem; margin-top: 0.75rem; text-align: center; }
                .hdp-book-msg.success { background: #d4edda; color: #00875a; border: 1px solid #b7dfbb; }
                .hdp-book-msg.error   { background: #fff0ee; color: #bf2600; border: 1px solid #ffbdad; }

                .hdp-spinner { width: 40px; height: 40px; border: 3px solid #e8f0fe; border-top-color: #0052cc; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                @media (max-width: 900px) {
                    .hdp-layout { flex-direction: column; }
                    .hdp-right { width: 100%; position: static; }
                    .hdp-gallery { height: 260px; }
                    .hdp-gallery-thumbs { display: none; }
                }
            `}</style>

            <div className="hdp-root">
                <div className="hdp-breadcrumb">
                    <Link href="/">Trang chủ</Link><span>›</span>
                    <Link href="/hotels">Khách sạn</Link><span>›</span>
                    {hotel.name}
                </div>

                <div className="hdp-content">
                    {/* Gallery */}
                    <div className="hdp-gallery">
                        <div className="hdp-gallery-main">
                            {hotel.images && hotel.images.length > 0 ? (
                                <Image src={hotel.images[activeImg]} alt={hotel.name} fill style={{ objectFit: "cover" }} sizes="60vw" priority />
                            ) : (
                                <div className="hdp-gallery-placeholder">🏨</div>
                            )}
                        </div>
                        {hotel.images && hotel.images.length > 1 && (
                            <div className="hdp-gallery-thumbs">
                                {hotel.images.slice(0, 3).map((img, i) => (
                                    <div key={i} className={`hdp-gallery-thumb${activeImg === i ? " active" : ""}`} onClick={() => setActiveImg(i)}>
                                        <Image src={img} alt="" fill style={{ objectFit: "cover" }} sizes="200px" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="hdp-layout">
                        {/* LEFT */}
                        <div className="hdp-left">
                            <div className="hdp-section">
                                {(hotel.star_rating ?? 0) > 0 && (
                                    <div style={{ display: "flex", gap: 2, marginBottom: "0.5rem" }}>
                                        {Array.from({ length: hotel.star_rating ?? 0 }).map((_, i) => (
                                            <span key={i} style={{ color: "#ffb800", fontSize: "1rem" }}>★</span>
                                        ))}
                                    </div>
                                )}
                                <div className="hdp-name">{hotel.name}</div>
                                <div className="hdp-meta">
                                    {(hotel.avg_rating ?? 0) > 0 && <>
                                        <span className="hdp-rating-badge">{(hotel.avg_rating ?? 0).toFixed(1)}</span>
                                        <span className="hdp-rating-label">{(hotel.avg_rating ?? 0) >= 4.8 ? "Xuất sắc" : (hotel.avg_rating ?? 0) >= 4.5 ? "Rất tốt" : "Tốt"}</span>
                                        <span className="hdp-review-count">({(hotel.review_count ?? 0).toLocaleString()} đánh giá)</span>
                                    </>}
                                    <span className="hdp-location">📍 {hotel.address}</span>
                                </div>
                                {hotel.description && <p className="hdp-desc">{hotel.description}</p>}
                            </div>

                            {amenities.length > 0 && (
                                <div className="hdp-section">
                                    <div className="hdp-section-title">✨ Tiện nghi</div>
                                    <div className="hdp-amenities">
                                        {amenities.map((a, i) => (
                                            <div key={i} className="hdp-amenity">
                                                <span>{AMENITY_ICONS[a] ?? "•"}</span>{a}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="hdp-section">
                                <div className="hdp-section-title">⭐ Đánh giá khách hàng</div>
                                <ReviewList
                                    entityType="hotel"
                                    entityId={Number(hotel_id)}
                                    refreshKey={reviewRefreshKey}
                                />
                                <ReviewForm
                                    entityType="hotel"
                                    entityId={Number(hotel_id)}
                                    onSuccess={() => setReviewRefreshKey(k => k + 1)}
                                />
                            </div>
                        </div>

                        {/* RIGHT */}
                        <div className="hdp-right">
                            <div className="hdp-book-card">
                                <div className="hdp-book-title">📅 Chọn ngày & đặt phòng</div>

                                <div className="hdp-date-row">
                                    <div className="hdp-field">
                                        <label className="hdp-field-label">Nhận phòng</label>
                                        <input type="date" className="hdp-field-input" value={checkIn} min={TODAY}
                                            onChange={(e) => { setCheckIn(e.target.value); setAvailRooms([]); setSelectedRoom(null); }} />
                                    </div>
                                    <div className="hdp-field">
                                        <label className="hdp-field-label">Trả phòng</label>
                                        <input type="date" className="hdp-field-input" value={checkOut} min={checkIn}
                                            onChange={(e) => { setCheckOut(e.target.value); setAvailRooms([]); setSelectedRoom(null); }} />
                                    </div>
                                </div>

                                <div className="hdp-field" style={{ marginBottom: "0.75rem" }}>
                                    <label className="hdp-field-label">Số khách</label>
                                    <input type="number" min={1} max={10} className="hdp-field-input" value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
                                </div>

                                <button className="hdp-check-btn" onClick={handleCheckAvailability} disabled={checkLoading}>
                                    {checkLoading ? "⏳ Đang kiểm tra..." : "🔍 Kiểm tra phòng trống"}
                                </button>

                                {availRooms.length > 0 && (
                                    <>
                                        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6b778c", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "0.6rem" }}>
                                            Chọn loại phòng ({nights} đêm)
                                        </div>
                                        {availRooms.map((room) => (
                                            <div key={room.room_type_id}
                                                className={`hdp-room${selectedRoom?.room_type_id === room.room_type_id ? " selected" : ""}`}
                                                onClick={() => setSelectedRoom(room)}
                                            >
                                                <div className="hdp-room-name">{room.name}</div>
                                                <div className="hdp-room-meta">
                                                    <span className="hdp-room-guests">👤 Tối đa {room.max_guests} khách</span>
                                                    <span className="hdp-room-price">{Number(room.price_per_night).toLocaleString("vi-VN")}₫/đêm</span>
                                                </div>
                                                <div className={`hdp-room-avail${room.available_rooms <= 2 ? " low" : ""}`}>
                                                    {room.available_rooms <= 2 ? `🔥 Chỉ còn ${room.available_rooms} phòng` : `✅ Còn ${room.available_rooms} phòng`}
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {availError && (
                                    <div style={{ background: "#fff0ee", color: "#bf2600", border: "1px solid #ffbdad", borderRadius: 10, padding: "0.65rem 1rem", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                                        {availError}
                                    </div>
                                )}

                                {availRooms.length === 0 && !checkLoading && !availError && (
                                    <div style={{ textAlign: "center", color: "#6b8cbf", fontSize: "0.85rem", padding: "0.5rem 0" }}>
                                        Nhấn kiểm tra để xem phòng trống
                                    </div>
                                )}

                                {selectedRoom && (
                                    <div className="hdp-total">
                                        <span>Tổng {nights} đêm</span>
                                        <span className="hdp-total-price">{(selectedRoom.price_per_night * nights).toLocaleString("vi-VN")}₫</span>
                                    </div>
                                )}

                                <button className="hdp-book-btn" onClick={handleBook} disabled={!selectedRoom}>
                                    {selectedRoom ? "🏨 Đặt phòng ngay" : "Chọn loại phòng"}
                                </button>

                                {!user && (
                                    <p style={{ fontSize: "0.78rem", color: "#6b8cbf", textAlign: "center", marginTop: "0.75rem" }}>
                                        <Link href="/login" style={{ color: "#0052cc" }}>Đăng nhập</Link> để đặt phòng
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}