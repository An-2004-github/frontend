import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-[65vh] flex flex-col items-center justify-center px-4 text-center">
            <div className="text-8xl font-extrabold text-blue-600 mb-2 leading-none">404</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Trang không tồn tại
            </h2>
            <p className="text-slate-500 mb-8 max-w-md">
                Đường dẫn bạn truy cập không tồn tại hoặc đã bị xóa. Hãy kiểm tra lại URL hoặc quay về trang chủ.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
                <Link
                    href="/"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                    🏠 Về trang chủ
                </Link>
                <Link
                    href="/hotels"
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                    🏨 Khách sạn
                </Link>
                <Link
                    href="/flights"
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                    ✈️ Máy bay
                </Link>
            </div>
        </div>
    );
}
