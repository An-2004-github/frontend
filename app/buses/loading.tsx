export default function BusesLoading() {
    return (
        <div className="min-h-screen bg-[#f0f4ff] animate-pulse">
            <div className="bg-gradient-to-br from-blue-900 to-blue-600 h-56" />

            <div className="max-w-[1200px] mx-auto px-6 -mt-10 relative z-10 pb-16">
                <div className="bg-white rounded-2xl p-5 shadow-xl mb-6 flex gap-3">
                    <div className="h-12 bg-slate-200 rounded-xl flex-1" />
                    <div className="h-10 w-10 bg-slate-200 rounded-full self-end" />
                    <div className="h-12 bg-slate-200 rounded-xl flex-1" />
                    <div className="h-12 bg-slate-200 rounded-xl w-36" />
                    <div className="h-12 bg-slate-200 rounded-xl w-28" />
                </div>

                <div className="flex gap-5 mt-4">
                    <div className="w-60 flex-shrink-0 bg-white rounded-2xl p-5 border border-slate-100 space-y-3">
                        <div className="h-5 bg-slate-200 rounded w-24" />
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-9 bg-slate-100 rounded-lg" />
                        ))}
                    </div>

                    <div className="flex-1 space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 space-y-3">
                                <div className="flex gap-3 pb-3 border-b border-slate-100">
                                    <div className="h-8 w-8 bg-slate-200 rounded-full" />
                                    <div className="h-5 bg-slate-200 rounded w-40" />
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="space-y-1">
                                        <div className="h-7 bg-slate-200 rounded w-16" />
                                        <div className="h-3 bg-slate-200 rounded w-20" />
                                    </div>
                                    <div className="flex-1 h-1 bg-slate-200 rounded" />
                                    <div className="space-y-1">
                                        <div className="h-7 bg-slate-200 rounded w-16" />
                                        <div className="h-3 bg-slate-200 rounded w-20" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                    <div className="h-6 bg-slate-200 rounded w-28" />
                                    <div className="h-9 bg-slate-200 rounded-xl w-24" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
