"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useBookingStore } from "@/store/bookingStore";
import { usePaymentStore } from "@/store/paymentStore";
import BookingForm, { ContactForm } from "@/components/booking/BookingForm";
import BookingCard from "@/components/booking/BookingCard";
import api from "@/lib/axios";

export default function BookingPage() {
    const router = useRouter();
    const { user, login } = useAuthStore();
    const { booking, clearBooking } = useBookingStore();
    const { setPayment } = usePaymentStore();
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [form, setForm] = useState<ContactForm>({
        contactName: "",
        contactPhone: "",
        contactEmail: "",
        bookingForSelf: true,
        guestName: "",
        specialRequests: [],
        passengerGender: "",
        passengerLastName: "",
        passengerFirstName: "",
        passengerBirthDay: "",
        passengerBirthMonth: "",
        passengerBirthYear: "",
        passengerNationality: "",
        passportNumber: "",
        passportExpDay: "",
        passportExpMonth: "",
        passportExpYear: "",
    });

    // Pre-fill from user
    useEffect(() => {
        if (user) {
            setForm(f => ({
                ...f,
                contactName: user.full_name ?? "",
                contactPhone: user.phone ?? "",
                contactEmail: user.email ?? "",
            }));
        }
    }, [user]);

    // Redirect if no booking data (only on mount)
    useEffect(() => {
        if (!booking) router.replace("/");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = <K extends keyof ContactForm>(field: K, value: ContactForm[K]) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: "" }));
    };

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!form.contactName.trim())
            e.contactName = "Họ tên không được để trống";
        else if (!/^[\p{L}\s]+$/u.test(form.contactName.trim()))
            e.contactName = "Rất tiếc, vui lòng chỉ nhập chữ (a-z)";

        if (!form.contactPhone.trim())
            e.contactPhone = "Điện thoại di động là phần bắt buộc";
        else if (!/^[0-9]{8,12}$/.test(form.contactPhone.replace(/\s/g, "")))
            e.contactPhone = "Số điện thoại không hợp lệ";

        if (!form.contactEmail.trim())
            e.contactEmail = "Email không được để trống";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail))
            e.contactEmail = "Email không hợp lệ";

        if (!form.bookingForSelf && !form.guestName.trim())
            e.guestName = "Vui lòng nhập tên người được đặt";

        if (booking?.type === "flight") {
            if (!form.passengerGender) e.passengerGender = "Vui lòng chọn giới tính";
            if (!form.passengerLastName.trim()) e.passengerLastName = "Vui lòng nhập họ";
            if (!form.passengerFirstName.trim()) e.passengerFirstName = "Vui lòng nhập tên";
            if (!form.passengerNationality) e.passengerNationality = "Vui lòng chọn quốc tịch";
            if (!form.passportNumber.trim()) e.passportNumber = "Vui lòng nhập số hộ chiếu";
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleContinue = async () => {
        if (!validate() || !booking) return;
        setSubmitting(true);
        try {
            // Nếu chưa đăng nhập → tạo guest account rồi lấy token
            if (!user) {
                const guestRes = await api.post("/api/auth/guest", {
                    email: form.contactEmail,
                    full_name: form.contactName,
                    phone: form.contactPhone,
                });
                const token = guestRes.data.access_token;
                const meRes = await api.get("/api/auth/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                login(meRes.data, token);
            }

            let payload: Record<string, unknown> = {
                guest_name: form.bookingForSelf
                    ? form.contactName
                    : form.guestName,
                contact_name: form.contactName,
                contact_phone: form.contactPhone,
                contact_email: form.contactEmail,
                special_requests: form.specialRequests.join(","),
                total_price: booking.totalPrice,
            };

            if (booking.type === "hotel") {
                payload = {
                    ...payload,
                    entity_type: "room",
                    entity_id: booking.roomTypeId,
                    check_in_date: booking.checkIn,
                    check_out_date: booking.checkOut,
                    guests: booking.guests,
                };
            } else if (booking.type === "flight") {
                payload = {
                    ...payload,
                    entity_type: "flight",
                    entity_id: booking.flightId,
                    passengers: booking.passengers,
                    seat_class: booking.seatClass,
                };
            } else if (booking.type === "bus") {
                payload = {
                    ...payload,
                    entity_type: "bus",
                    entity_id: booking.busId,
                    passengers: booking.passengers,
                };
            }

            const res = await api.post("/api/bookings", payload);
            const bookingId = res.data?.booking_id ?? res.data?.id;

            let description = "";
            if (booking.type === "hotel") description = `${booking.hotelName} - ${booking.roomName}`;
            else if (booking.type === "flight") description = `${booking.airline}: ${booking.fromCity} → ${booking.toCity}`;
            else if (booking.type === "bus") description = `${booking.company}: ${booking.fromCity} → ${booking.toCity}`;

            setPayment({
                bookingId,
                totalAmount: booking.totalPrice,
                description,
                entityType: booking.type,
            });

            router.push(`/payment/${bookingId}`);
            clearBooking();
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })
                ?.response?.data?.detail;
            alert(`❌ ${detail || "Đặt chỗ thất bại, vui lòng thử lại"}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (!booking) return null;

    return (
        <>
            <style>{`
                .bk-root { min-height: 100vh; background: #f0f4ff; font-family: 'DM Sans', sans-serif; }
                .bk-content { max-width: 1100px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
                .bk-title { font-size: 1.3rem; font-weight: 800; color: #1a3c6b; margin-bottom: 1.25rem; font-family: 'Nunito', sans-serif; }
                .bk-layout { display: grid; grid-template-columns: 1fr 380px; gap: 1.5rem; align-items: start; }
                @media (max-width: 860px) {
                    .bk-layout { grid-template-columns: 1fr; }
                }
            `}</style>

            <div className="bk-root">
                <div className="bk-content">
                    <div className="bk-title">Hoàn tất đặt chỗ</div>
                    <div className="bk-layout">
                        <div>
                            <BookingForm
                                form={form}
                                errors={errors}
                                bookingType={booking.type}
                                flightRoute={booking.type === "flight" ? { fromCity: booking.fromCity, toCity: booking.toCity } : undefined}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <BookingCard
                                booking={booking}
                                onContinue={handleContinue}
                                submitting={submitting}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
