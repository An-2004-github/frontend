// components/train/TrainCard.tsx
import Link from "next/link";
import { Train } from "@/types/train";
import { formatPrice, formatTime } from "@/lib/utils";

interface Props {
    train: Train;
}

export default function TrainCard({ train }: Props) {
    return (
        <div className="border rounded-lg p-5 shadow hover:shadow-md transition-shadow duration-200 bg-white">

            {/* Mã tàu và Giá vé */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-green-700">
                        Tàu {train.train_number}
                    </span>
                </div>
                <span className="text-lg font-semibold text-orange-500">
                    {formatPrice(train.price)}
                </span>
            </div>

            {/* Thông tin chặng đi */}
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md mb-4">
                <div className="text-center w-1/3">
                    <p className="text-sm text-gray-500">Ga đi</p>
                    <p className="font-bold text-lg">{train.from_station}</p>
                    <p className="text-sm">{formatTime(train.depart_time)}</p>
                </div>

                <div className="text-green-600 font-bold text-2xl w-1/3 text-center">
                    {' 🚆 '}
                </div>

                <div className="text-center w-1/3">
                    <p className="text-sm text-gray-500">Ga đến</p>
                    <p className="font-bold text-lg">{train.to_station}</p>
                    <p className="text-sm">{formatTime(train.arrive_time)}</p>
                </div>
            </div>

            {/* Nút thao tác */}
            <div className="flex justify-end">
                <Link
                    href={`/trains/${train.train_id}`}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                >
                    Xem chi tiết
                </Link>
            </div>
        </div>
    );
}