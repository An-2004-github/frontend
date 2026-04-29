"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Đã xảy ra lỗi
            </h2>
            <p className="text-slate-500 mb-6 max-w-md">
                Trang này gặp sự cố không mong muốn. Vui lòng thử lại hoặc quay về trang chủ.
            </p>
            <div className="flex gap-3">
                <button
                    onClick={reset}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                    Thử lại
                </button>
                <link
                    href="/"
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                    Về trang chủ
                </link>
            </div>
            {process.env.NODE_ENV === "development" && (
                <details className="mt-6 text-left max-w-lg">
                    <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-600">
                        Chi tiết lỗi (chỉ hiển thị trong dev)
                    </summary>
                    <pre className="mt-2 p-3 bg-slate-100 rounded text-xs text-red-600 overflow-auto whitespace-pre-wrap">
                        {error.message}
                        {error.stack && `\n\n${error.stack}`}
                    </pre>
                </details>
            )}
        </div>
    );
}
