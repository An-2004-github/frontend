"use client";

import { useEffect } from "react";

export default function FlightsError({ error, reset }: { error: Error; reset: () => void }) {
    useEffect(() => { console.error(error); }, [error]);
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
            <div className="text-5xl mb-4">✈️</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Không thể tải danh sách chuyến bay</h2>
            <p className="text-slate-500 mb-6">Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.</p>
            <button onClick={reset} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
                Thử lại
            </button>
        </div>
    );
}
