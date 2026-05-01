import Link from "next/link";

const sections = [
    {
        icon: "🛎️",
        title: "1. Phạm vi dịch vụ",
        color: "bg-blue-50 border-blue-200 text-blue-700",
        iconBg: "bg-blue-100",
        content: [
            "ViVu Travel cung cấp nền tảng đặt dịch vụ du lịch trực tuyến: đặt phòng khách sạn, vé máy bay, vé tàu hỏa và vé xe khách.",
            "Người dùng có thể thanh toán bằng ví điện tử ViVu hoặc chuyển khoản ngân hàng qua mã QR.",
        ],
    },
    {
        icon: "👤",
        title: "2. Tài khoản người dùng",
        color: "bg-purple-50 border-purple-200 text-purple-700",
        iconBg: "bg-purple-100",
        content: [
            "Người dùng phải đăng ký tài khoản để sử dụng đầy đủ tính năng.",
            "Thông tin đăng ký phải chính xác và thuộc về chính người đăng ký.",
            "Bảo mật mật khẩu là trách nhiệm của người dùng.",
            "Đăng nhập bằng Google được hỗ trợ qua Google OAuth 2.0.",
        ],
    },
    {
        icon: "💳",
        title: "3. Đặt chỗ & Thanh toán",
        color: "bg-emerald-50 border-emerald-200 text-emerald-700",
        iconBg: "bg-emerald-100",
        content: [
            "Đơn đặt chỗ chỉ được xác nhận sau khi thanh toán thành công.",
            "Thanh toán bằng ví ViVu được xử lý tức thì.",
            "Thanh toán QR chuyển khoản phải hoàn thành trong vòng 15 phút. Quá thời gian, đơn tự động bị hủy.",
            "Người dùng có thể kết hợp ví ViVu và chuyển khoản để thanh toán.",
        ],
    },
    {
        icon: "🔄",
        title: "4. Hủy & Đổi lịch",
        color: "bg-orange-50 border-orange-200 text-orange-700",
        iconBg: "bg-orange-100",
        content: [
            "Phí hủy áp dụng theo loại dịch vụ và hạng thành viên.",
            "Yêu cầu hủy hoặc đổi lịch gửi qua trang quản lý đơn hàng và cần admin duyệt.",
            "Tiền hoàn được cộng vào ví ViVu trong 5–15 phút hoặc về tài khoản ngân hàng trong 1–3 ngày làm việc.",
        ],
    },
    {
        icon: "👛",
        title: "5. Ví ViVu",
        color: "bg-yellow-50 border-yellow-200 text-yellow-700",
        iconBg: "bg-yellow-100",
        content: [
            "Nạp tiền bằng chuyển khoản ngân hàng qua SePay — số dư cộng tự động sau khi xác nhận.",
            "Rút tiền về tài khoản ngân hàng xử lý trong 1–3 ngày làm việc.",
            "Cashback từ chương trình thành viên cộng tự động vào ví sau mỗi đơn thành công.",
        ],
    },
    {
        icon: "🏅",
        title: "6. Chương trình thành viên",
        color: "bg-sky-50 border-sky-200 text-sky-700",
        iconBg: "bg-sky-100",
        content: [
            "Hạng thành viên (Đồng → Bạc → Vàng → Kim cương) tính theo tổng chi tiêu tích lũy.",
            "Hạng cao hơn mang lại cashback lớn hơn và phí hủy thấp hơn.",
            "Chi tiết xem tại trang Chương trình thành viên.",
        ],
        link: { href: "/thanh-vien", label: "Xem chi tiết →" },
    },
    {
        icon: "⚠️",
        title: "7. Giới hạn trách nhiệm",
        color: "bg-red-50 border-red-200 text-red-700",
        iconBg: "bg-red-100",
        content: [
            "ViVu Travel là nền tảng trung gian kết nối người dùng với nhà cung cấp dịch vụ.",
            "Chúng tôi không chịu trách nhiệm về thay đổi lịch trình, hủy chuyến từ phía nhà cung cấp.",
            "Trong trường hợp đó, chúng tôi hỗ trợ người dùng liên hệ và xử lý theo chính sách nhà cung cấp.",
        ],
    },
];

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-linear-to-br from-[#1a3c6b] to-[#0052cc] py-14 px-4">
                <div className="max-w-3xl mx-auto text-center text-white">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 text-3xl">📜</div>
                    <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">Điều khoản sử dụng</h1>
                    <p className="text-blue-100 text-sm">Cập nhật lần cuối: 30/04/2026 · Áp dụng cho tất cả người dùng ViVu Travel</p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-10 space-y-5">

                {sections.map((s) => (
                    <div key={s.title} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Section header */}
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${s.iconBg}`}>
                                {s.icon}
                            </div>
                            <h2 className="font-bold text-gray-900">{s.title}</h2>
                        </div>
                        {/* Content */}
                        <ul className="px-6 py-5 space-y-2.5">
                            {s.content.map((item, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                                    <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${s.color.includes("blue") ? "bg-blue-400" : s.color.includes("purple") ? "bg-purple-400" : s.color.includes("emerald") ? "bg-emerald-400" : s.color.includes("orange") ? "bg-orange-400" : s.color.includes("yellow") ? "bg-yellow-400" : s.color.includes("sky") ? "bg-sky-400" : "bg-red-400"}`} />
                                    <span>{item}</span>
                                </li>
                            ))}
                            {s.link && (
                                <li>
                                    <Link href={s.link.href} className="text-blue-600 text-sm font-medium hover:underline ml-4">
                                        {s.link.label}
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </div>
                ))}

                {/* Liên hệ */}
                <div className="bg-linear-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <p className="font-bold text-lg">Câu hỏi về điều khoản?</p>
                        <p className="text-blue-100 text-sm mt-0.5">Liên hệ đội ngũ hỗ trợ ViVu Travel</p>
                    </div>
                    <div className="flex flex-col gap-1 text-sm shrink-0">
                        <span className="bg-white/20 px-4 py-2 rounded-xl font-semibold">📧 support@vivutravel.com</span>
                        <span className="bg-white/20 px-4 py-2 rounded-xl font-semibold text-center">📞 1900 1234</span>
                    </div>
                </div>

                <div className="flex gap-3 text-sm text-gray-500 justify-center">
                    <Link href="/chinh-sach-huy" className="hover:text-blue-600 transition-colors">← Chính sách hủy</Link>
                    <span>·</span>
                    <Link href="/thanh-vien" className="hover:text-blue-600 transition-colors">Thành viên →</Link>
                </div>
            </div>
        </div>
    );
}
