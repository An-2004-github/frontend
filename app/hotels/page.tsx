"use client";

import { useState, useEffect } from "react";
import HotelList from "@/components/hotel/HotelList";
import { Hotel } from "@/types/hotel";
import Input from "@/components/ui/input";

// Dữ liệu giả lập để test giao diện
const MOCK_HOTELS: Hotel[] = [
    { hotel_id: 1, destination_id: 101, name: "InterContinental Hanoi", address: "Tây Hồ, Hà Nội", avg_rating: 4.8, review_count: 120 },
    { hotel_id: 2, destination_id: 102, name: "Muong Thanh Luxury", address: "Sơn Trà, Đà Nẵng", avg_rating: 4.5, review_count: 85 },
    { hotel_id: 3, destination_id: 103, name: "Vinpearl Resort", address: "Nha Trang, Khánh Hòa", avg_rating: 4.9, review_count: 300 },
    { hotel_id: 4, destination_id: 104, name: "The Reverie Saigon", address: "Quận 1, TP.HCM", avg_rating: 4.7, review_count: 210 },
];

export default function HotelsPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mô phỏng gọi API mất 1 giây
        const fetchHotels = async () => {
            try {
                // Sau này bạn gọi API thật ở đây: 
                // const res = await axiosInstance.get('/hotels');
                // setHotels(res.data);

                setTimeout(() => {
                    setHotels(MOCK_HOTELS);
                    setLoading(false);
                }, 1000);
            } catch (error) {
                console.error("Lỗi khi tải danh sách khách sạn:", error);
                setLoading(false);
            }
        };

        fetchHotels();
    }, []);

    return (
        <div className="flex flex-col md:flex-row gap-8">
            {/* Cột bên trái: Bộ lọc (Sidebar Filter) */}
            <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
                <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <h3 className="font-bold text-lg mb-4 border-b pb-2">Bộ lọc tìm kiếm</h3>
                    <div className="space-y-4">
                        <Input label="Tên khách sạn" placeholder="VD: InterContinental..." />

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Mức giá</label>
                            <select className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3 border bg-white">
                                <option>Tất cả mức giá</option>
                                <option>Dưới 1 triệu</option>
                                <option>1 - 3 triệu</option>
                                <option>Trên 3 triệu</option>
                            </select>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Cột bên phải: Danh sách kết quả */}
            <div className="flex-1">
                <div className="mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Khách sạn phổ biến</h1>
                        <p className="text-gray-500 mt-1">Tìm thấy {hotels.length} chỗ nghỉ</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <HotelList hotels={hotels} />
                )}
            </div>
        </div>
    );
}