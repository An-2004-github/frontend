"use client";

import { useState } from "react";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { BookingFormData } from "@/types/bookingForm";

interface Props {
    onSubmit: (formData: BookingFormData) => void;
    isSubmitting: boolean;
}

export default function BookingForm({ onSubmit, isSubmitting }: Props) {
    const [formData, setFormData] = useState<BookingFormData>({
        fullName: "",
        email: "",
        phone: "",
        specialRequests: "",
        paymentMethod: "credit_card",
    });

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6"
        >
            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                    1. Thông tin liên hệ
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        name="fullName"
                        label="Họ và tên"
                        placeholder="VD: Nguyễn Văn A"
                        required
                        value={formData.fullName}
                        onChange={handleChange}
                    />

                    <Input
                        name="phone"
                        label="Số điện thoại"
                        type="tel"
                        placeholder="VD: 0901234567"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                    />
                </div>

                <div className="mt-4">
                    <Input
                        name="email"
                        label="Email nhận vé/xác nhận"
                        type="email"
                        placeholder="VD: email@example.com"
                        required
                        value={formData.email}
                        onChange={handleChange}
                    />
                </div>
            </div>

            <div className="border-t pt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                    2. Yêu cầu đặc biệt (Tùy chọn)
                </h3>

                <textarea
                    name="specialRequests"
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="VD: Phòng tầng cao, yêu cầu ghế gần cửa sổ..."
                    value={formData.specialRequests}
                    onChange={handleChange}
                />
            </div>

            <div className="border-t pt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                    3. Phương thức thanh toán
                </h3>

                <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-base"
                >
                    <option value="credit_card">💳 Thẻ Tín dụng / Ghi nợ</option>
                    <option value="momo">📱 Ví MoMo</option>
                    <option value="vnpay">🏦 VNPay</option>
                    <option value="bank_transfer">🏦 Chuyển khoản ngân hàng</option>
                </select>
            </div>

            <div className="border-t pt-6">
                <Button
                    type="submit"
                    size="lg"
                    className="w-full text-lg"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Đang xử lý..." : "Xác nhận & Thanh toán"}
                </Button>

                <p className="text-xs text-center text-gray-500 mt-3">
                    Bằng việc bấm Xác nhận, bạn đồng ý với Điều khoản và Chính sách bảo mật của chúng tôi.
                </p>
            </div>
        </form>
    );
}