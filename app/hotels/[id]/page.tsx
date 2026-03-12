import { notFound } from "next/navigation";
import Button from "@/components/ui/button";
import ReviewForm from "@/components/review/ReviewForm";

// Mô phỏng hàm fetch dữ liệu từ Database dựa trên ID
const getHotelDetails = async (id: string) => {
    // Dữ liệu giả lập. Sau này đổi thành: 
    // const res = await axiosInstance.get(`/hotels/${id}`); return res.data;
    const mockHotels = [
        {
            hotel_id: 1,
            name: "InterContinental Hanoi",
            address: "Từ Hoa, Tây Hồ, Hà Nội",
            description: "Nằm hoàn toàn trên mặt nước Hồ Tây tĩnh lặng, khách sạn mang đến không gian nghỉ dưỡng sang trọng bậc nhất giữa lòng thủ đô. Các phòng đều có ban công riêng nhìn ra hồ.",
            avg_rating: 4.8,
            review_count: 120,
            price_per_night: 2500000
        },
        {
            hotel_id: 2,
            name: "Muong Thanh Luxury",
            address: "Võ Nguyên Giáp, Sơn Trà, Đà Nẵng",
            description: "Khách sạn 5 sao với tầm nhìn tuyệt đẹp ra bãi biển Mỹ Khê. Tiện nghi hiện đại bao gồm hồ bơi vô cực, spa và các nhà hàng cao cấp.",
            avg_rating: 4.5,
            review_count: 85,
            price_per_night: 1800000
        },
    ];

    return mockHotels.find(h => h.hotel_id.toString() === id) || null;
};

// Next.js truyền params vào component
export default async function HotelDetailPage({ params }: { params: { id: string } }) {
    const hotel = await getHotelDetails(params.id);

    // Nếu ID không tồn tại trong DB, chuyển hướng sang trang 404 của Next.js
    if (!hotel) {
        notFound();
    }

    // Format tiền tệ
    const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(hotel.price_per_night);

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">

            {/* Phần 1: Header - Tên, Địa chỉ, Giá và Nút đặt phòng */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                Khách sạn
                            </span>
                            <div className="flex items-center text-yellow-400 text-sm">
                                ★ {hotel.avg_rating} <span className="text-gray-400 ml-1">({hotel.review_count} đánh giá)</span>
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">{hotel.name}</h1>
                        <p className="text-gray-500 mt-2 flex items-center gap-2">
                            📍 {hotel.address}
                        </p>
                    </div>

                    <div className="w-full md:w-auto text-left md:text-right bg-gray-50 p-4 rounded-xl border">
                        <p className="text-sm text-gray-500 mb-1">Giá mỗi đêm từ</p>
                        <p className="text-2xl font-bold text-orange-500 mb-3">
                            {formattedPrice}
                        </p>
                        <Button className="w-full shadow-md" size="lg">Đặt phòng ngay</Button>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t">
                    <h2 className="text-xl font-bold mb-3">Giới thiệu chỗ nghỉ</h2>
                    <p className="text-gray-700 leading-relaxed">{hotel.description}</p>
                </div>
            </div>

            {/* Phần 2: Khu vực Đánh giá (Sử dụng Polymorphic Component) */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold mb-6">Đánh giá từ khách hàng</h2>

                {/* Ở đây bạn truyền type là "hotel" và truyền ID của khách sạn hiện tại */}
                <ReviewForm entityType="hotel" entityId={hotel.hotel_id} />
            </div>

        </div>
    );
}