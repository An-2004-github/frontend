// components/flight/FlightCard.tsx
import Link from "next/link"
import { Flight } from "@/types/flight"
import { formatPrice, formatTime } from "@/lib/utils";

interface Props {
    flight: Flight
}

export default function FlightCard({ flight }: Props) {
    return (
        <div className="border rounded-lg p-5 shadow hover:shadow-md transition-shadow duration-200 bg-white">

            {/* Hãng bay và Giá vé */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-blue-600">
                    {flight.airline}
                </h3>
                <span className="text-lg font-semibold text-orange-500">
                    {formatPrice(flight.price)}
                </span>
            </div>

            {/* Thông tin chuyến bay */}
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md mb-4">
                {/* Điểm đi */}
                <div className="text-center">
                    <p className="text-sm text-gray-500">Khởi hành</p>
                    <p className="font-bold text-lg">{flight.from_city}</p>
                    <p className="text-sm">{formatTime(flight.depart_time)}</p>
                </div>

                {/* Biểu tượng máy bay ở giữa (dùng text hoặc icon SVG) */}
                <div className="text-gray-400 font-bold">
                    {' ✈️ '}
                </div>

                {/* Điểm đến */}
                <div className="text-center">
                    <p className="text-sm text-gray-500">Đến nơi</p>
                    <p className="font-bold text-lg">{flight.to_city}</p>
                    <p className="text-sm">{formatTime(flight.arrive_time)}</p>
                </div>
            </div>

            {/* Nút xem chi tiết / Đặt vé */}
            <div className="flex justify-end">
                <Link
                    href={`/flights/${flight.flight_id}`}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                    Xem chi tiết
                </Link>
            </div>

        </div>
    )
}