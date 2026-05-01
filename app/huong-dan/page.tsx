import Link from "next/link";

const services = [
    {
        icon: "🏨",
        title: "Đặt phòng khách sạn",
        color: "from-blue-600 to-blue-400",
        lightBg: "bg-blue-50 border-blue-100",
        accent: "bg-blue-600",
        steps: [
            { label: "Tìm kiếm", desc: "Nhập điểm đến, chọn ngày nhận phòng – trả phòng và số khách." },
            { label: "Chọn khách sạn", desc: "Xem danh sách, lọc theo giá, tiện nghi, đánh giá và chọn nơi phù hợp." },
            { label: "Chọn loại phòng", desc: "So sánh các loại phòng, xem ảnh và tiện nghi, sau đó nhấn Đặt ngay." },
            { label: "Thanh toán", desc: "Dùng ví ViVu hoặc QR chuyển khoản. Có thể nhập mã giảm giá trước khi thanh toán." },
            { label: "Xác nhận", desc: "Đơn xác nhận ngay sau thanh toán. Email gửi về hộp thư đăng ký." },
        ],
    },
    {
        icon: "✈️",
        title: "Đặt vé máy bay",
        color: "from-sky-600 to-sky-400",
        lightBg: "bg-sky-50 border-sky-100",
        accent: "bg-sky-600",
        steps: [
            { label: "Tìm kiếm", desc: "Chọn điểm đi, điểm đến, ngày bay và số hành khách." },
            { label: "Chọn chuyến bay", desc: "Lọc theo giờ bay, hãng hàng không, hạng ghế và chọn chuyến phù hợp." },
            { label: "Điền thông tin", desc: "Nhập thông tin hành khách đúng với giấy tờ tùy thân." },
            { label: "Thanh toán", desc: "Dùng ví ViVu hoặc QR chuyển khoản trong vòng 15 phút." },
            { label: "Nhận vé", desc: "Vé điện tử gửi qua email, có thể xem lại trong Đơn của tôi." },
        ],
    },
    {
        icon: "🚆",
        title: "Đặt vé tàu hỏa",
        color: "from-emerald-600 to-emerald-400",
        lightBg: "bg-emerald-50 border-emerald-100",
        accent: "bg-emerald-600",
        steps: [
            { label: "Tìm kiếm", desc: "Chọn ga đi, ga đến, ngày đi và số hành khách." },
            { label: "Chọn tàu & toa", desc: "Xem các chuyến tàu, chọn loại toa (ngồi cứng, nằm mềm...) phù hợp." },
            { label: "Chọn ghế", desc: "Chọn ghế trống trên sơ đồ chỗ ngồi." },
            { label: "Thanh toán", desc: "Thanh toán bằng ví hoặc QR. Đơn xác nhận ngay sau đó." },
            { label: "Nhận vé", desc: "Vé gửi về email và lưu trong Đơn của tôi." },
        ],
    },
    {
        icon: "🚌",
        title: "Đặt vé xe khách",
        color: "from-teal-600 to-teal-400",
        lightBg: "bg-teal-50 border-teal-100",
        accent: "bg-teal-600",
        steps: [
            { label: "Tìm kiếm", desc: "Chọn điểm đi, điểm đến, ngày khởi hành và số lượng vé." },
            { label: "Chọn chuyến", desc: "So sánh nhà xe, giờ xuất bến, giá vé và loại ghế/giường." },
            { label: "Chọn chỗ ngồi", desc: "Chọn vị trí trên sơ đồ xe." },
            { label: "Thanh toán", desc: "Thanh toán bằng ví hoặc QR trong 15 phút." },
            { label: "Nhận vé", desc: "Vé xác nhận gửi về email và lưu trong hồ sơ." },
        ],
    },
];

const paymentMethods = [
    {
        icon: "👛",
        title: "Ví ViVu",
        desc: "Thanh toán tức thì từ số dư ví. Nạp tiền qua QR chuyển khoản. Nhận cashback sau mỗi đơn.",
        tag: "Nhanh nhất",
        tagColor: "bg-emerald-100 text-emerald-700",
    },
    {
        icon: "📱",
        title: "QR chuyển khoản",
        desc: "Quét mã QR và chuyển khoản ngân hàng. Hoàn tất trong 15 phút để giữ đơn.",
        tag: "Phổ biến",
        tagColor: "bg-blue-100 text-blue-700",
    },
    {
        icon: "🔗",
        title: "Kết hợp",
        desc: "Dùng ví ViVu thanh toán một phần, phần còn lại chuyển khoản QR.",
        tag: "Linh hoạt",
        tagColor: "bg-purple-100 text-purple-700",
    },
];

export default function GuidePage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-linear-to-br from-[#1a3c6b] via-[#0052cc] to-[#0065ff] py-14 px-4">
                <div className="max-w-4xl mx-auto text-center text-white">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 text-3xl">🗺️</div>
                    <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">Hướng dẫn đặt vé & dịch vụ</h1>
                    <p className="text-blue-100 text-sm">Chỉ vài bước đơn giản để hoàn thành đặt chỗ trên ViVu Travel</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

                {/* 4 loại dịch vụ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {services.map((svc) => (
                        <div key={svc.title} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* Header */}
                            <div className={`bg-linear-to-r ${svc.color} px-6 py-4 flex items-center gap-3`}>
                                <span className="text-2xl">{svc.icon}</span>
                                <h2 className="text-white font-bold text-base">{svc.title}</h2>
                            </div>
                            {/* Steps */}
                            <ol className="px-6 py-5 space-y-4">
                                {svc.steps.map((step, i) => (
                                    <li key={i} className="flex gap-3">
                                        <div className={`w-6 h-6 rounded-full ${svc.accent} text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{step.label}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.desc}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    ))}
                </div>

                {/* Thanh toán */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-emerald-50/40">
                        <span className="text-2xl">💳</span>
                        <div>
                            <h2 className="font-bold text-gray-900">Phương thức thanh toán</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Hỗ trợ nhiều hình thức, linh hoạt và an toàn</p>
                        </div>
                    </div>
                    <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {paymentMethods.map((pm) => (
                            <div key={pm.title} className="border border-gray-100 rounded-xl p-4 hover:border-blue-200 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-2xl">{pm.icon}</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pm.tagColor}`}>{pm.tag}</span>
                                </div>
                                <p className="font-semibold text-gray-800 text-sm mb-1">{pm.title}</p>
                                <p className="text-xs text-gray-500 leading-relaxed">{pm.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mẹo */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                    <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                        <span>💡</span> Mẹo để có trải nghiệm tốt nhất
                    </h3>
                    <ul className="space-y-2 text-sm text-amber-700">
                        {[
                            "Đặt sớm để có giá tốt hơn và nhiều lựa chọn phòng/chỗ hơn.",
                            "Nạp tiền vào ví ViVu trước để thanh toán nhanh hơn và nhận cashback.",
                            "Kiểm tra chính sách hủy trước khi đặt, đặc biệt với đơn có giá trị lớn.",
                            "Dùng mã giảm giá từ trang Khuyến mãi để tiết kiệm thêm.",
                            "Hoàn thành QR chuyển khoản trong 15 phút để giữ đơn hàng.",
                        ].map((tip, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-amber-500 font-bold shrink-0">•</span>
                                <span>{tip}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Link sang FAQ */}
                <div className="bg-linear-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <p className="font-bold text-lg">Vẫn còn thắc mắc?</p>
                        <p className="text-blue-100 text-sm mt-0.5">Xem thêm câu hỏi thường gặp hoặc liên hệ hỗ trợ</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                        <Link href="/faq" className="bg-white text-blue-600 font-semibold text-sm px-5 py-2 rounded-xl hover:bg-blue-50 transition-colors text-center">
                            Xem FAQ →
                        </Link>
                        <span className="bg-white/20 text-white font-semibold text-sm px-5 py-2 rounded-xl text-center">📞 1900 1234</span>
                    </div>
                </div>

                <div className="flex gap-3 text-sm text-gray-500 justify-center">
                    <Link href="/faq" className="hover:text-blue-600 transition-colors">← FAQ</Link>
                    <span>·</span>
                    <Link href="/chinh-sach-huy" className="hover:text-blue-600 transition-colors">Chính sách hủy →</Link>
                </div>
            </div>
        </div>
    );
}
