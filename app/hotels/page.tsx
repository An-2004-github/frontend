"use client";

import { useState, useEffect } from "react";
import HotelList from "@/components/hotel/HotelList";
import { Hotel } from "@/types/hotel";
import Input from "@/components/ui/input";
import { hotelService } from "@/services/hotelService"; // Import Service

export default function HotelsPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dùng useEffect để gọi API ngay khi vào trang
    useEffect(() => {
        const fetchHotels = async () => {
            try {
                setLoading(true);
                // Lấy data THẬT từ FastAPI
                const data = await hotelService.getHotels();
                setHotels(data);
                setError(null);
            } catch (err) {
                console.error(err);
                setError("Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại sau.");
            } finally {
                setLoading(false);
            }
        };

        fetchHotels();
    }, []);

    return (
        <div className="flex flex-col md:flex-row gap-8 max-w-7xl mx-auto py-8 px-4">
            {/* Cột bên trái: Bộ lọc (Tạm thời giữ giao diện tĩnh) */}
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
                        <p className="text-gray-500 mt-1">
                            {!loading && !error && `Tìm thấy ${hotels.length} chỗ nghỉ`}
                        </p>
                    </div>
                </div>

                {/* Xử lý các trạng thái: Đang tải, Lỗi, Có dữ liệu */}
                {loading ? (
                    <div className="flex flex-col justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-500">Đang lấy dữ liệu từ máy chủ...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 text-center">
                        <p className="font-bold mb-2">⚠️ Đã xảy ra lỗi</p>
                        <p>{error}</p>
                    </div>
                ) : hotels.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-xl border shadow-sm">
                        Không có khách sạn nào trong cơ sở dữ liệu.
                    </div>
                ) : (
                    <HotelList hotels={hotels} />
                )}
            </div>
        </div>
    );
}