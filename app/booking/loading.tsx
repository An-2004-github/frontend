export default function BookingLoading() {
    return (
        <div className="min-h-screen bg-[#f0f4ff] animate-pulse">
            <div className="max-w-[1100px] mx-auto px-5 py-8">
                <div className="h-7 bg-slate-200 rounded w-52 mb-6" />

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                    {/* Form skeleton */}
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
                                <div className="h-5 bg-slate-200 rounded w-40" />
                                <div className="h-11 bg-slate-100 rounded-lg" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-11 bg-slate-100 rounded-lg" />
                                    <div className="h-11 bg-slate-100 rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary card skeleton */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4 h-fit">
                        <div className="h-5 bg-slate-200 rounded w-32" />
                        <div className="h-24 bg-slate-100 rounded-xl" />
                        <div className="space-y-2">
                            <div className="h-4 bg-slate-100 rounded w-full" />
                            <div className="h-4 bg-slate-100 rounded w-4/5" />
                            <div className="h-4 bg-slate-100 rounded w-3/5" />
                        </div>
                        <div className="h-11 bg-slate-200 rounded-xl mt-2" />
                    </div>
                </div>
            </div>
        </div>
    );
}
