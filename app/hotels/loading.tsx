export default function HotelsLoading() {
    return (
        <div className="min-h-screen bg-[#f0f4ff] animate-pulse">
            {/* Hero skeleton */}
            <div className="bg-gradient-to-br from-blue-800 to-blue-600 h-64" />

            <div className="max-width-[1200px] mx-auto px-6 -mt-10 relative z-10 pb-16">
                {/* Search box skeleton */}
                <div className="bg-white rounded-2xl p-5 shadow-xl mb-8 flex gap-3">
                    <div className="h-12 bg-slate-200 rounded-xl flex-1" />
                    <div className="h-12 bg-slate-200 rounded-xl w-36" />
                    <div className="h-12 bg-slate-200 rounded-xl w-36" />
                    <div className="h-12 bg-slate-200 rounded-xl w-28" />
                </div>

                {/* Section title */}
                <div className="h-6 bg-slate-200 rounded w-52 mb-5 mt-6" />

                {/* Hotel grid skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100">
                            <div className="h-44 bg-slate-200" />
                            <div className="p-4 space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-3/4" />
                                <div className="h-3 bg-slate-200 rounded w-1/2" />
                                <div className="h-3 bg-slate-200 rounded w-2/3" />
                                <div className="flex justify-between items-center mt-3">
                                    <div className="h-5 bg-slate-200 rounded w-24" />
                                    <div className="h-8 bg-slate-200 rounded-lg w-20" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
