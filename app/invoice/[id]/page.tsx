import Link from "next/link";
import Button from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

// Giả lập lấy dữ liệu hóa đơn từ API dựa vào ID
const getInvoiceDetails = async (id: string) => {
    // Thực tế: const res = await axiosInstance.get(`/invoices/${id}`); return res.data;
    return {
        invoiceId: id,
        date: new Date().toLocaleDateString('vi-VN'),
        customerName: "Nguyễn Văn A",
        serviceName: "InterContinental Hanoi Westlake",
        serviceType: "Khách sạn",
        checkIn: "15/12/2023",
        checkOut: "17/12/2023",
        totalAmount: 5000000,
        status: "PAID" // Đã thanh toán
    };
};

export default async function InvoicePage({ params }: { params: { id: string } }) {
    const invoice = await getInvoiceDetails(params.id);

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Header hóa đơn */}
                <div className="bg-green-500 p-6 text-center text-white">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">✓</span>
                    </div>
                    <h1 className="text-2xl font-bold">Thanh toán thành công!</h1>
                    <p className="opacity-90 mt-1">Mã hóa đơn: {invoice.invoiceId}</p>
                </div>

                {/* Chi tiết biên lai */}
                <div className="p-8 space-y-6">
                    <div className="flex justify-between border-b pb-4">
                        <span className="text-gray-500">Ngày giao dịch</span>
                        <span className="font-medium text-gray-900">{invoice.date}</span>
                    </div>

                    <div className="flex justify-between border-b pb-4">
                        <span className="text-gray-500">Khách hàng</span>
                        <span className="font-medium text-gray-900">{invoice.customerName}</span>
                    </div>

                    <div className="border-b pb-4">
                        <span className="text-gray-500 block mb-2">Chi tiết dịch vụ</span>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="font-bold text-gray-900">{invoice.serviceName}</p>
                            <p className="text-sm text-gray-600 mt-1">
                                {invoice.serviceType} • Nhận phòng: {invoice.checkIn} - Trả phòng: {invoice.checkOut}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <span className="text-lg font-bold text-gray-900">Tổng cộng</span>
                        <span className="text-2xl font-bold text-orange-500">
                            {formatPrice(invoice.totalAmount)}
                        </span>
                    </div>
                </div>

                {/* Các nút hành động */}
                <div className="p-6 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-center">
                    <Button variant="outline" className="w-full sm:w-auto" >
                        🖨️ In hóa đơn
                    </Button>
                    <Link href="/profile/bookings" className="w-full sm:w-auto">
                        <Button variant="primary" className="w-full">
                            📋 Xem lịch sử đặt chỗ
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}