"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/button";

// Mock data: Danh sách đơn hàng đa hình (có cả Khách sạn và Máy bay)
const MOCK_BOOKINGS = [
    {
        id: "BK-1001",
        serviceType: "hotel",
        serviceName: "InterContinental Hanoi Westlake",
        date: "15/12/2023 - 17/12/2023",
        amount: 5000000,
        status: "upcoming" // Sắp tới
    },
    {
        id: "BK-1002",
        serviceType: "flight",
        serviceName: "Vietnam Airlines (VN123)",
        date: "10/11/2023 (Hà Nội - TP.HCM)",
        amount: 1500000,
        status: "completed" // Đã hoàn thành
    }
];

export default function BookingsHistoryPage() {
    const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all");

    const filteredBookings = MOCK_BOOKINGS.filter(b => filter === "all" || b.status === filter);

    return (
        <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto">
            {/* Sidebar Profile */}
            <aside className="w-full md:w-64 flex-shrink-0">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b text-center bg-gray-50">
                        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full mx-auto flex items-center justify-center text-2xl font-bold mb-3">
                            A
                        </div>
                        <h2 className="font-bold text-lg">Nguyễn Văn A</h2>
                        <p className="text-sm text-gray-500">test@gmail.com</p>
                    </div>
                    <nav className="flex flex-col p-2">
                        <Link href="/profile" className="px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
                            👤 Thông tin cá nhân
                        </Link>
                        <Link href="/profile/bookings" className="px-4 py-3 text-blue-600 bg-blue-50 font-medium rounded-lg">
                            📋 Lịch sử đặt chỗ
                        </Link>
                        <Link href="/profile/reviews" className="px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
                            ⭐ Đánh giá của tôi
                        </Link>
                    </nav>
                </div>
            </aside>

            {/* Nội dung chính: Danh sách Booking */}
            <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Lịch sử chuyến đi</h1>

                {/* Tabs Lọc */}
                <div className="flex gap-4 mb-6 border-b">
                    <button
                        onClick={() => setFilter("all")}
                        className={`pb-3 px-2 font-medium ${filter === "all" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
                    >
                        Tất cả
                    </button>
                    <button
                        onClick={() => setFilter("upcoming")}
                        className={`pb-3 px-2 font-medium ${filter === "upcoming" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
                    >
                        Sắp tới
                    </button>
                    <button
                        onClick={() => setFilter("completed")}
                        className={`pb-3 px-2 font-medium ${filter === "completed" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
                    >
                        Đã hoàn thành
                    </button>
                </div>

                {/* Danh sách thẻ Booking */}
                <div className="space-y-4">
                    {filteredBookings.map((booking) => (
                        <div key={booking.id} className="bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between gap-4 items-start md:items-center hover:shadow-md transition-shadow">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-600 uppercase">
                                        {booking.serviceType === "hotel" ? "🏨 Khách sạn" : "✈️ Máy bay"}
                                    </span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${booking.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                                        {booking.status === "completed" ? "Hoàn thành" : "Sắp tới"}
                                    </span>
                                    <span className="text-xs text-gray-400">Mã: {booking.id}</span>
                                </div>
                                <h3 className="font-bold text-lg text-gray-900">{booking.serviceName}</h3>
                                <p className="text-sm text-gray-500 mt-1">🗓 {booking.date}</p>
                            </div>

                            <div className="text-left md:text-right w-full md:w-auto flex flex-row md:flex-col justify-between items-center md:items-end gap-3">
                                <p className="text-lg font-bold text-orange-500">{formatPrice(booking.amount)}</p>
                                <Button variant="outline" size="sm">Xem chi tiết</Button>
                            </div>
                        </div>
                    ))}

                    {filteredBookings.length === 0 && (
                        <div className="text-center py-10 text-gray-500 bg-white rounded-xl border">
                            Không có chuyến đi nào trong danh mục này.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}