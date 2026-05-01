"use client";

import { useState } from "react";
import Link from "next/link";

const faqs = [
    {
        cat: "Đặt phòng & Vé",
        icon: "🎫",
        color: "bg-blue-50 border-blue-200",
        accent: "text-blue-600",
        items: [
            {
                q: "Làm thế nào để đặt phòng khách sạn?",
                a: "Tìm kiếm theo điểm đến, chọn ngày nhận – trả phòng và số khách. Sau đó chọn khách sạn, chọn loại phòng và nhấn Đặt ngay. Thanh toán bằng ví ViVu hoặc chuyển khoản QR là xong.",
            },
            {
                q: "Tôi có thể đặt vé máy bay, tàu và xe trên cùng một nền tảng không?",
                a: "Có. ViVu Travel hỗ trợ đặt vé máy bay, vé tàu hỏa và vé xe khách ngay trên website. Tất cả đơn hàng được quản lý tập trung trong mục Đơn của tôi.",
            },
            {
                q: "Tôi có thể đặt cho nhiều người không?",
                a: "Có, bạn có thể chọn số lượng hành khách/phòng khi tìm kiếm. Mỗi booking sẽ ghi rõ số lượng người trong chi tiết đơn.",
            },
            {
                q: "Đơn đặt chỗ có hiệu lực ngay không?",
                a: "Đơn được xác nhận ngay sau khi thanh toán thành công. Bạn sẽ nhận email xác nhận và thấy đơn trong mục Đơn của tôi.",
            },
        ],
    },
    {
        cat: "Thanh toán",
        icon: "💳",
        color: "bg-emerald-50 border-emerald-200",
        accent: "text-emerald-600",
        items: [
            {
                q: "Có những phương thức thanh toán nào?",
                a: "Hiện tại ViVu hỗ trợ 2 phương thức: (1) Ví ViVu – thanh toán tức thì từ số dư ví, (2) Chuyển khoản QR ngân hàng – quét mã và chuyển trong 15 phút. Bạn cũng có thể kết hợp cả hai.",
            },
            {
                q: "Chuyển khoản QR mất bao lâu để được xác nhận?",
                a: "Sau khi chuyển khoản thành công, hệ thống xác nhận qua webhook SePay trong vài giây đến 1 phút. Nếu quá 15 phút chưa được xác nhận, đơn sẽ bị hủy tự động và bạn cần đặt lại.",
            },
            {
                q: "Tôi có thể dùng mã giảm giá không?",
                a: "Có. Nhập mã khuyến mãi tại bước thanh toán. Mã giảm giá có thể áp dụng cho khách sạn, vé máy bay hoặc các dịch vụ cụ thể — kiểm tra điều kiện sử dụng trên trang Khuyến mãi.",
            },
            {
                q: "Hóa đơn của tôi ở đâu?",
                a: "Sau khi thanh toán thành công, hóa đơn điện tử được gửi về email đăng ký và có thể xem lại trong Đơn của tôi → chi tiết đơn.",
            },
        ],
    },
    {
        cat: "Ví ViVu",
        icon: "👛",
        color: "bg-yellow-50 border-yellow-200",
        accent: "text-yellow-700",
        items: [
            {
                q: "Làm thế nào để nạp tiền vào ví?",
                a: "Vào mục Ví trong hồ sơ, chọn Nạp tiền, quét mã QR và chuyển khoản theo nội dung chuyển khoản quy định. Số dư cộng tự động sau khi giao dịch được xác nhận (thường trong vài giây).",
            },
            {
                q: "Rút tiền từ ví về ngân hàng mất bao lâu?",
                a: "Yêu cầu rút tiền được xử lý trong 1 – 3 ngày làm việc. Bạn cần nhập đúng thông tin tài khoản ngân hàng thụ hưởng.",
            },
            {
                q: "Cashback là gì?",
                a: "Sau mỗi đơn đặt chỗ được xác nhận thành công, hệ thống tự động hoàn lại một % giá trị đơn vào ví của bạn. Tỷ lệ cashback từ 0.5% đến 2% tùy hạng thành viên.",
            },
        ],
    },
    {
        cat: "Hủy & Đổi lịch",
        icon: "🔄",
        color: "bg-orange-50 border-orange-200",
        accent: "text-orange-600",
        items: [
            {
                q: "Tôi hủy đơn như thế nào?",
                a: "Vào Đơn của tôi → chọn đơn cần hủy → nhấn Yêu cầu hủy. Admin sẽ xem xét và duyệt trong thời gian sớm nhất. Sau khi duyệt, tiền hoàn về ví hoặc tài khoản ngân hàng theo yêu cầu của bạn.",
            },
            {
                q: "Phí hủy được tính như thế nào?",
                a: "Phí hủy phụ thuộc vào loại dịch vụ, thời điểm hủy và hạng thành viên. Hạng càng cao, phí hủy càng thấp. Xem chi tiết tại trang Chính sách hủy & hoàn tiền.",
            },
            {
                q: "Tôi có thể đổi ngày không?",
                a: "Có. Với khách sạn và một số vé, bạn có thể gửi yêu cầu đổi lịch qua trang chi tiết đơn hàng. Nếu giá mới cao hơn, bạn cần thanh toán thêm phần chênh lệch.",
            },
        ],
    },
    {
        cat: "Tài khoản & Hạng thành viên",
        icon: "🏅",
        color: "bg-purple-50 border-purple-200",
        accent: "text-purple-600",
        items: [
            {
                q: "Hạng thành viên được tính như thế nào?",
                a: "Hạng được xác định tự động dựa trên tổng chi tiêu tích lũy: Đồng (0–5tr), Bạc (5–20tr), Vàng (20–50tr), Kim cương (50tr+). Hạng cập nhật ngay sau mỗi đơn thành công.",
            },
            {
                q: "Tôi quên mật khẩu thì làm gì?",
                a: "Nhấn Quên mật khẩu ở trang đăng nhập, nhập email đăng ký. Hệ thống sẽ gửi link đặt lại mật khẩu về email của bạn.",
            },
            {
                q: "Tôi có thể đăng nhập bằng Google không?",
                a: "Có. ViVu Travel hỗ trợ đăng nhập bằng tài khoản Google qua OAuth 2.0. Nhấn Tiếp tục với Google ở trang đăng nhập.",
            },
        ],
    },
];

export default function FAQPage() {
    const [open, setOpen] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-linear-to-br from-[#0052cc] to-[#0065ff] py-14 px-4">
                <div className="max-w-3xl mx-auto text-center text-white">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 text-3xl">💬</div>
                    <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">Câu hỏi thường gặp</h1>
                    <p className="text-blue-100 text-sm">Tìm nhanh câu trả lời cho các thắc mắc phổ biến nhất</p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
                {faqs.map((cat) => (
                    <div key={cat.cat}>
                        {/* Category header */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">{cat.icon}</span>
                            <h2 className={`font-bold text-base ${cat.accent}`}>{cat.cat}</h2>
                        </div>

                        <div className="space-y-2">
                            {cat.items.map((item) => {
                                const id = `${cat.cat}-${item.q}`;
                                const isOpen = open === id;
                                return (
                                    <div key={item.q} className={`rounded-xl border overflow-hidden transition-all ${isOpen ? cat.color : "bg-white border-gray-100"}`}>
                                        <button
                                            className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
                                            onClick={() => setOpen(isOpen ? null : id)}
                                        >
                                            <span className="font-medium text-gray-800 text-sm">{item.q}</span>
                                            <span className={`text-lg transition-transform shrink-0 ${isOpen ? "rotate-45" : ""} ${cat.accent}`}>+</span>
                                        </button>
                                        {isOpen && (
                                            <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-white/60">
                                                <p className="pt-3">{item.a}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Không tìm thấy câu trả lời */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                    <p className="text-2xl mb-2">🤔</p>
                    <p className="font-bold text-gray-800 mb-1">Không tìm thấy câu trả lời?</p>
                    <p className="text-sm text-gray-500 mb-4">Hãy liên hệ trực tiếp với đội ngũ hỗ trợ ViVu Travel</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <span className="bg-blue-50 text-blue-700 font-semibold text-sm px-4 py-2 rounded-xl">📧 support@vivutravel.com</span>
                        <span className="bg-blue-50 text-blue-700 font-semibold text-sm px-4 py-2 rounded-xl">📞 1900 1234</span>
                    </div>
                </div>

                <div className="flex gap-3 text-sm text-gray-500 justify-center">
                    <Link href="/huong-dan" className="hover:text-blue-600 transition-colors">Hướng dẫn đặt vé →</Link>
                    <span>·</span>
                    <Link href="/chinh-sach-huy" className="hover:text-blue-600 transition-colors">Chính sách hủy →</Link>
                </div>
            </div>
        </div>
    );
}
