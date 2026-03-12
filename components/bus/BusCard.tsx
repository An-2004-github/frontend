// components/bus/BusCard.tsx
import Link from "next/link";
import { Bus } from "@/types/bus";
import { formatPrice, formatTime } from "@/lib/utils";

interface Props {
    bus: Bus;
}

export default function BusCard({ bus }: Props) {
    return (
        <div className="border rounded-lg p-5 shadow hover:shadow-md transition-shadow duration-200 bg-white">

            {/* Nhà xe và Giá vé */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-teal-600">
                    {bus.company}
                </h3>
                <span className="text-lg font-semibold text-orange-500">
                    {formatPrice(bus.price)}
                </span>
            </div>

            {/* Thông tin chuyến xe */}
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md mb-4">
                <div className="text-center w-1/3">
                    <p className="text-sm text-gray-500">Khởi hành</p>
                    <p className="font-bold text-lg">{bus.from_city}</p>
                    <p className="text-sm">{formatTime(bus.depart_time)}</p>
                </div>

                <div className="text-teal-500 font-bold text-2xl w-1/3 text-center">
                    {' 🚌 '}
                </div>

                <div className="text-center w-1/3">
                    <p className="text-sm text-gray-500">Đến nơi</p>
                    <p className="font-bold text-lg">{bus.to_city}</p>
                    <p className="text-sm">{formatTime(bus.arrive_time)}</p>
                </div>
            </div>

            {/* Nút thao tác */}
            <div className="flex justify-end">
                <Link
                    href={`/buses/${bus.bus_id}`}
                    className="bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600 transition-colors"
                >
                    Xem chi tiết
                </Link>
            </div>
        </div>
    );
}