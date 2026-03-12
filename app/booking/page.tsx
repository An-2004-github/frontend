"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BookingForm from "@/components/booking/BookingForm";
import BookingCard from "@/components/booking/BookingCard";
import { Booking } from "@/types/booking";
import { BookingFormData } from "@/types/bookingForm";

export default function BookingPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Trong thực tế, dữ liệu này sẽ được lấy từ Global Store (Zustand) 
    // khi người dùng bấm "Đặt phòng" từ trang chi tiết
    const mockOrderSummary = {
        serviceName: "InterContinental Hanoi Westlake",
        type: "Khách sạn" as const,
        details: "1 phòng x 2 đêm (15/12 - 17/12/2023)",
        totalPrice: 5000000,
    };

    const handleCheckout = async (formData: BookingFormData) => {
        setIsSubmitting(true);

        // Cấu trúc dữ liệu sẽ gửi xuống API
        const bookingPayload = {
            ...formData,
            entity_type: "hotel", // Tương tự polymorphic như review
            entity_id: 1,
            total_amount: mockOrderSummary.totalPrice
        };

        try {
            console.log("Gửi yêu cầu đặt chỗ:", bookingPayload);
            // Giả lập call API: const res = await bookingService.createBooking(bookingPayload);

            setTimeout(() => {
                setIsSubmitting(false);
                // Giả sử API trả về ID của hóa đơn là "INV-12345"
                const invoiceId = "INV-12345";

                // Chuyển hướng sang trang hóa đơn/thành công
                router.push(`/invoice/${invoiceId}`);
            }, 1500);

        } catch (error) {
            console.error("Lỗi thanh toán", error);
            setIsSubmitting(false);
            alert("Có lỗi xảy ra, vui lòng thử lại!");
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Hoàn tất đặt chỗ</h1>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Cột trái: Form thông tin */}
                <div className="flex-1 order-2 lg:order-1">
                    <BookingForm onSubmit={handleCheckout} isSubmitting={isSubmitting} />
                </div>

                {/* Cột phải: Tóm tắt đơn hàng */}
                <div className="w-full lg:w-[400px] flex-shrink-0 order-1 lg:order-2">
                    <BookingCard summary={mockOrderSummary} />
                </div>
            </div>
        </div>
    );
}