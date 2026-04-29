export default function Loading() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Đang tải...</p>
        </div>
    );
}
