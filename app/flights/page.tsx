"use client";

import { useState, useEffect } from "react";
import FlightList from "@/components/flight/FlightList";
import { Flight } from "@/types/flight";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";

// Dữ liệu giả lập chuyến bay
const MOCK_FLIGHTS: Flight[] = [
    {
        flight_id: 1,
        airline: "Vietnam Airlines",
        from_city: "Hà Nội (HAN)",
        to_city: "TP. Hồ Chí Minh (SGN)",
        depart_time: "2023-12-20T08:00:00",
        arrive_time: "2023-12-20T10:15:00",
        price: 1850000
    },
    {
        flight_id: 2,
        airline: "Vietjet Air",
        from_city: "Hà Nội (HAN)",
        to_city: "TP. Hồ Chí Minh (SGN)",
        depart_time: "2023-12-20T09:30:00",
        arrive_time: "2023-12-20T11:40:00",
        price: 1250000
    },
    {
        flight_id: 3,
        airline: "Bamboo Airways",
        from_city: "Đà Nẵng (DAD)",
        to_city: "Hà Nội (HAN)",
        depart_time: "2023-12-21T14:00:00",
        arrive_time: "2023-12-21T15:20:00",
        price: 950000
    }
];

export default function FlightsPage() {
    const [flights, setFlights] = useState<Flight[]>([]);
    const [loading, setLoading] = useState(true);

    // State cho bộ lọc
    const [filter, setFilter] = useState({
        from: "",
        to: "",
        date: ""
    });

    useEffect(() => {
        // Mô phỏng gọi API
        const fetchFlights = async () => {
            setLoading(true);
            try {
                // Sau này gọi API thật: 
                // const res = await axiosInstance.get('/flights', { params: filter });
                setTimeout(() => {
                    setFlights(MOCK_FLIGHTS);
                    setLoading(false);
                }, 800);
            } catch (error) {
                console.error("Lỗi khi tải chuyến bay", error);
                setLoading(false);
            }
        };

        fetchFlights();
    }, []); // Chạy 1 lần khi load trang. Trong thực tế sẽ thêm filter vào dependency array

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Trigger lại useEffect hoặc gọi lại API ở đây
        alert(`Đang tìm vé từ ${filter.from} đến ${filter.to}`);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">

            {/* Thanh Tìm Kiếm Chuyến Bay Riêng Biệt */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Tìm chuyến bay</h1>
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <Input
                        label="Điểm đi"
                        placeholder="VD: Hà Nội"
                        value={filter.from}
                        onChange={(e) => setFilter({ ...filter, from: e.target.value })}
                    />
                    <Input
                        label="Điểm đến"
                        placeholder="VD: TP. Hồ Chí Minh"
                        value={filter.to}
                        onChange={(e) => setFilter({ ...filter, to: e.target.value })}
                    />
                    <Input
                        type="date"
                        label="Ngày đi"
                        value={filter.date}
                        onChange={(e) => setFilter({ ...filter, date: e.target.value })}
                    />
                    <Button type="submit" size="lg" className="h-10 w-full">
                        Tìm vé ngay
                    </Button>
                </form>
            </div>

            <div className="flex flex-col md:flex-row gap-8 pt-4">
                {/* Cột trái: Bộ lọc nâng cao (Sidebar) */}
                <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-lg mb-4 border-b pb-2">Lọc kết quả</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-2">Hãng hàng không</label>
                                <div className="space-y-2">
                                    {["Vietnam Airlines", "Vietjet Air", "Bamboo Airways"].map(airline => (
                                        <label key={airline} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span className="text-sm text-gray-600">{airline}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Cột phải: Danh sách kết quả */}
                <div className="flex-1">
                    <div className="mb-4 flex justify-between items-center">
                        <p className="text-gray-500">Hiển thị <span className="font-bold text-gray-900">{flights.length}</span> kết quả</p>
                        <select className="border-gray-300 rounded-md text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white px-3 py-2">
                            <option>Sắp xếp: Giá thấp nhất</option>
                            <option>Sắp xếp: Giờ cất cánh</option>
                        </select>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <FlightList flights={flights} />
                    )}
                </div>
            </div>
        </div>
    );
}