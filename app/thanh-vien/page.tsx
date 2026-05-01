import Link from "next/link";

export default function MembershipPolicyPage() {
    const tiers = [
        {
            rank: "bronze",
            label: "🥉 Đồng",
            threshold: "0 – 4.999.999₫",
            cashback: "0.5%",
            gradient: "from-amber-700 to-yellow-500",
            lightBg: "bg-amber-50 border-amber-200",
            textColor: "text-amber-800",
            benefits: [
                "Hoàn 0.5% vào ví sau mỗi đơn thành công",
                "Miễn phí hủy khách sạn nếu hủy sớm ≥ 3 ngày",
                "Phí hủy 30% nếu hủy trước dưới 3 ngày",
            ],
        },
        {
            rank: "silver",
            label: "🥈 Bạc",
            threshold: "5.000.000 – 19.999.999₫",
            cashback: "1%",
            gradient: "from-slate-500 to-slate-400",
            lightBg: "bg-slate-50 border-slate-200",
            textColor: "text-slate-700",
            benefits: [
                "Hoàn 1% vào ví sau mỗi đơn thành công",
                "Miễn phí hủy khách sạn nếu hủy sớm ≥ 3 ngày",
                "Phí hủy 20% nếu hủy trước dưới 3 ngày",
                "Hỗ trợ khách hàng ưu tiên",
            ],
        },
        {
            rank: "gold",
            label: "🥇 Vàng",
            threshold: "20.000.000 – 49.999.999₫",
            cashback: "1.5%",
            gradient: "from-yellow-600 to-yellow-400",
            lightBg: "bg-yellow-50 border-yellow-200",
            textColor: "text-yellow-800",
            benefits: [
                "Hoàn 1.5% vào ví sau mỗi đơn thành công",
                "Miễn phí hủy khách sạn nếu hủy sớm ≥ 3 ngày",
                "Phí hủy 10% nếu hủy trước dưới 3 ngày",
                "Ưu đãi khi đổi lịch trình",
            ],
        },
        {
            rank: "diamond",
            label: "💎 Kim cương",
            threshold: "Từ 50.000.000₫",
            cashback: "2%",
            gradient: "from-blue-900 to-blue-500",
            lightBg: "bg-blue-50 border-blue-200",
            textColor: "text-blue-800",
            benefits: [
                "Hoàn 2% vào ví sau mỗi đơn thành công",
                "Miễn phí hủy khách sạn hoàn toàn (trừ ngay trong ngày)",
                "Hỗ trợ VIP 24/7",
                "Ưu tiên xử lý đổi lịch",
                "Phòng nâng hạng khi có sẵn",
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-linear-to-br from-[#1a3c6b] via-[#0052cc] to-[#0065ff] py-14 px-4">
                <div className="max-w-3xl mx-auto text-center text-white">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 text-3xl">🏅</div>
                    <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">Chương trình thành viên</h1>
                    <p className="text-blue-100 text-sm mb-6">Chi tiêu càng nhiều — quyền lợi càng cao</p>
                    {/* Progress bar minh hoạ */}
                    <div className="max-w-md mx-auto bg-white/20 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full bg-white/80 w-1/4" />
                    </div>
                    <div className="flex justify-between max-w-md mx-auto text-xs text-blue-100 mt-2">
                        <span>🥉 Đồng</span><span>🥈 Bạc</span><span>🥇 Vàng</span><span>💎 KimCương</span>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

                {/* Thẻ 4 hạng */}
                {tiers.map((tier) => (
                    <div key={tier.rank} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Header gradient */}
                        <div className={`bg-linear-to-r ${tier.gradient} px-6 py-5 flex items-center justify-between`}>
                            <div>
                                <p className="text-white font-extrabold text-xl">{tier.label}</p>
                                <p className="text-white/75 text-xs mt-0.5">Tổng chi tiêu: {tier.threshold}</p>
                            </div>
                            <div className="text-right">
                                <span className="bg-white/25 text-white text-sm font-bold px-4 py-1.5 rounded-full">
                                    Cashback {tier.cashback}
                                </span>
                            </div>
                        </div>
                        {/* Benefits */}
                        <ul className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {tier.benefits.map((b, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                    <span className="mt-0.5 text-emerald-500 shrink-0 font-bold">✓</span>
                                    <span>{b}</span>
                                </li>
                            ))}
                        </ul>
                        <div className={`px-6 py-2 border-t ${tier.lightBg} text-xs ${tier.textColor} font-medium`}>
                            Ngưỡng tích lũy: {tier.threshold}
                        </div>
                    </div>
                ))}

                {/* So sánh nhanh cashback */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">So sánh cashback</h3>
                    <div className="grid grid-cols-4 gap-3">
                        {tiers.map((t) => (
                            <div key={t.rank} className="text-center">
                                <div className={`bg-linear-to-b ${t.gradient} rounded-xl py-4 mb-2`}>
                                    <p className="text-white font-extrabold text-xl">{t.cashback}</p>
                                </div>
                                <p className="text-xs text-gray-500">{t.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ghi chú */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-800 space-y-2">
                    <p className="font-bold">📌 Lưu ý</p>
                    <ul className="space-y-1.5 list-disc list-inside text-blue-700">
                        <li>Cashback cộng tự động vào ví ngay sau khi đơn được xác nhận.</li>
                        <li>Hạng thành viên cập nhật tức thì sau mỗi lần thanh toán thành công.</li>
                        <li>Tiền ví dùng để thanh toán một phần hoặc toàn bộ đơn tiếp theo.</li>
                    </ul>
                </div>

                <div className="flex gap-3 text-sm text-gray-500 justify-center">
                    <Link href="/chinh-sach-huy" className="hover:text-blue-600 transition-colors">← Chính sách hủy</Link>
                    <span>·</span>
                    <Link href="/dieu-khoan" className="hover:text-blue-600 transition-colors">Điều khoản sử dụng →</Link>
                </div>
            </div>
        </div>
    );
}
