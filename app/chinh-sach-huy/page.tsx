import Link from "next/link";

export default function CancelPolicyPage() {
    const hotelRows = [
        { rank: "🥉 Đồng", early: { text: "Miễn phí", cls: "text-emerald-600 bg-emerald-50" }, late: { text: "Phí 30%", cls: "text-orange-600 bg-orange-50" }, sameDay: { text: "Không hoàn", cls: "text-red-600 bg-red-50" } },
        { rank: "🥈 Bạc", early: { text: "Miễn phí", cls: "text-emerald-600 bg-emerald-50" }, late: { text: "Phí 20%", cls: "text-orange-600 bg-orange-50" }, sameDay: { text: "Không hoàn", cls: "text-red-600 bg-red-50" } },
        { rank: "🥇 Vàng", early: { text: "Miễn phí", cls: "text-emerald-600 bg-emerald-50" }, late: { text: "Phí 10%", cls: "text-amber-600 bg-amber-50" }, sameDay: { text: "Không hoàn", cls: "text-red-600 bg-red-50" } },
        { rank: "💎 Kim cương", early: { text: "Miễn phí", cls: "text-emerald-600 bg-emerald-50" }, late: { text: "Miễn phí", cls: "text-emerald-600 bg-emerald-50" }, sameDay: { text: "Không hoàn", cls: "text-red-600 bg-red-50" } },
    ];

    const transportRows = [
        { when: "Hủy trước ≥ 3 ngày", fee: "10%", refund: "90%", feeColor: "text-amber-600 bg-amber-50", refundColor: "text-emerald-600 bg-emerald-50" },
        { when: "Hủy trước 1 – 3 ngày", fee: "30%", refund: "70%", feeColor: "text-orange-600 bg-orange-50", refundColor: "text-emerald-600 bg-emerald-50" },
        { when: "Ngay trong ngày khởi hành", fee: "100%", refund: "Không hoàn", feeColor: "text-red-600 bg-red-50", refundColor: "text-red-600 bg-red-50" },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-gradient-to-br from-[#0052cc] via-[#0065ff] to-[#1a8fff] py-14 px-4">
                <div className="max-w-3xl mx-auto text-center text-white">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 text-3xl">📋</div>
                    <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">Chính sách hủy & hoàn tiền</h1>
                    <p className="text-blue-100 text-sm">Cập nhật lần cuối: 30/04/2026</p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

                {/* Khách sạn */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-blue-50/50">
                        <span className="text-2xl">🏨</span>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Khách sạn</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Phí hủy theo hạng thành viên và thời điểm hủy</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                                    <th className="px-5 py-3 text-left font-semibold">Hạng</th>
                                    <th className="px-5 py-3 text-center font-semibold">Hủy sớm ≥ 3 ngày</th>
                                    <th className="px-5 py-3 text-center font-semibold">Hủy &lt; 3 ngày</th>
                                    <th className="px-5 py-3 text-center font-semibold">Ngay trong ngày</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {hotelRows.map((row) => (
                                    <tr key={row.rank} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-5 py-4 font-semibold text-gray-800">{row.rank}</td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${row.early.cls}`}>{row.early.text}</span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${row.late.cls}`}>{row.late.text}</span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${row.sameDay.cls}`}>{row.sameDay.text}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-3 bg-blue-50/40 text-xs text-blue-700 flex items-center gap-2">
                        <span>💡</span>
                        <span>Hạng Kim cương được miễn phí hủy hoàn toàn trừ ngay trong ngày nhận phòng.</span>
                    </div>
                </div>

                {/* Vé máy bay & xe khách */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-sky-50/50">
                        <span className="text-2xl"></span>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Vé máy bay & Xe khách & Tàu hỏa</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Áp dụng như nhau với mọi hạng thành viên</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                                    <th className="px-5 py-3 text-left font-semibold">Thời điểm hủy</th>
                                    <th className="px-5 py-3 text-center font-semibold">Phí hủy</th>
                                    <th className="px-5 py-3 text-center font-semibold">Hoàn lại</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {transportRows.map((row) => (
                                    <tr key={row.when} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-5 py-4 font-medium text-gray-800">{row.when}</td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${row.feeColor}`}>{row.fee}</span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${row.refundColor}`}>{row.refund}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Phương thức hoàn tiền */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-emerald-50/50">
                        <span className="text-2xl">💰</span>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Phương thức hoàn tiền</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Tiền được hoàn sau khi yêu cầu hủy được duyệt</p>
                        </div>
                    </div>
                    <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { icon: "⚡", title: "Ví ViVu", desc: "Hoàn tức thì trong 5 – 15 phút. Dùng để thanh toán đơn tiếp theo.", color: "border-blue-200 bg-blue-50/40" },
                            { icon: "🏦", title: "Tài khoản ngân hàng", desc: "Xử lý trong 1 – 3 ngày làm việc. Yêu cầu cung cấp thông tin tài khoản.", color: "border-purple-200 bg-purple-50/40" },
                        ].map((item) => (
                            <div key={item.title} className={`rounded-xl border p-4 ${item.color}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">{item.icon}</span>
                                    <span className="font-semibold text-gray-800 text-sm">{item.title}</span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <p className="font-bold text-lg">Cần hỗ trợ về hủy đơn?</p>
                        <p className="text-blue-100 text-sm mt-0.5">Liên hệ ngay để được tư vấn nhanh nhất</p>
                    </div>
                    <div className="flex flex-col gap-1 text-sm shrink-0">
                        <span className="bg-white/20 px-4 py-2 rounded-xl font-semibold">📧 support@vivutravel.com</span>
                        <span className="bg-white/20 px-4 py-2 rounded-xl font-semibold text-center">📞 1900 1234</span>
                    </div>
                </div>

                <div className="flex gap-3 text-sm text-gray-500 justify-center">
                    <Link href="/thanh-vien" className="hover:text-blue-600 transition-colors">Chương trình thành viên →</Link>
                    <span>·</span>
                    <Link href="/dieu-khoan" className="hover:text-blue-600 transition-colors">Điều khoản sử dụng →</Link>
                </div>
            </div>
        </div>
    );
}
