import { formatPrice } from "@/lib/utils";

interface OrderSummary {
    serviceName: string;
    type: "Khách sạn" | "Máy bay" | "Tàu hỏa" | "Xe khách";
    details: string; // VD: "2 đêm, 1 phòng" hoặc "Hà Nội - TP.HCM"
    totalPrice: number;
}

export default function BookingCard({ summary }: { summary: OrderSummary }) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-24">
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-4">
                Tóm tắt đơn hàng
            </h3>

            <div className="space-y-4">
                <div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wide">
                        {summary.type}
                    </span>
                    <h4 className="font-bold text-lg text-gray-800 mt-2">{summary.serviceName}</h4>
                    <p className="text-sm text-gray-500 mt-1">{summary.details}</p>
                </div>

                <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                        <span>Giá gốc</span>
                        <span>{formatPrice(summary.totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                        <span>Khuyến mãi</span>
                        <span>- {formatPrice(0)}</span>
                    </div>
                </div>

                <div className="border-t pt-4 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Tổng thanh toán</span>
                    <span className="text-2xl font-bold text-orange-500">
                        {formatPrice(summary.totalPrice)}
                    </span>
                </div>
            </div>
        </div>
    );
}