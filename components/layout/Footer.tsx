import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-white pt-12 pb-6 mt-auto">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Cột 1: Giới thiệu */}
                <div>
                    <h3 className="text-2xl font-bold mb-4 text-blue-400">ViVu Travel</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Nền tảng đặt dịch vụ du lịch toàn diện. Chúng tôi giúp bạn dễ dàng tìm kiếm và đặt phòng khách sạn, vé máy bay, vé tàu và xe khách chỉ với vài cú click.
                    </p>
                </div>

                {/* Cột 2: Dịch vụ */}
                <div>
                    <h4 className="font-semibold text-lg mb-4">Dịch vụ</h4>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li><Link href="/hotels" className="hover:text-white transition-colors">Đặt Khách sạn</Link></li>
                        <li><Link href="/flights" className="hover:text-white transition-colors">Vé Máy bay</Link></li>
                        <li><Link href="/trains" className="hover:text-white transition-colors">Vé Tàu hỏa</Link></li>
                        <li><Link href="/buses" className="hover:text-white transition-colors">Vé Xe khách</Link></li>
                    </ul>
                </div>

                {/* Cột 3: Hỗ trợ */}
                <div>
                    <h4 className="font-semibold text-lg mb-4">Hỗ trợ</h4>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li><Link href="/faq" className="hover:text-white transition-colors">Câu hỏi thường gặp</Link></li>
                        <li><Link href="/huong-dan" className="hover:text-white transition-colors">Hướng dẫn đặt vé</Link></li>
                        <li><Link href="/profile/bookings" className="hover:text-white transition-colors">Quản lý đặt chỗ</Link></li>
                    </ul>
                </div>

                {/* Cột 4: Chính sách */}
                <div>
                    <h4 className="font-semibold text-lg mb-4">Chính sách</h4>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li><Link href="/chinh-sach-huy" className="hover:text-white transition-colors">Chính sách hủy & hoàn tiền</Link></li>
                        <li><Link href="/thanh-vien" className="hover:text-white transition-colors">Chương trình thành viên</Link></li>
                        <li><Link href="/dieu-khoan" className="hover:text-white transition-colors">Điều khoản sử dụng</Link></li>
                    </ul>
                    <div className="mt-6">
                        <p className="text-gray-400 text-sm mb-1">Email: support@vivutravel.com</p>
                        <p className="text-gray-400 text-sm">Hotline: 1900 1234</p>
                    </div>
                </div>
            </div>

            {/* Bản quyền */}
            <div className="text-center text-gray-500 text-sm mt-10 border-t border-gray-800 pt-6">
                © {new Date().getFullYear()}ViVu Travel. Đồ án tốt nghiệp. All rights reserved.
            </div>
        </footer>
    );
}