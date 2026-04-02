"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { logSearch } from "@/lib/logInteraction";

type ServiceType = "hotel" | "flight" | "train" | "bus";

export default function SearchBar() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<ServiceType>("hotel");
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        logSearch(searchQuery);
        if (activeTab === "hotel") {
            router.push(`/hotels?search=${searchQuery}`);
        } else {
            router.push(`/${activeTab}s?search=${searchQuery}`);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-2 md:p-4 border border-gray-100 max-w-4xl mx-auto w-full">
            {/* Tabs chọn dịch vụ */}
            <div className="flex border-b mb-4 overflow-x-auto">
                {[
                    { id: "hotel", label: "🏨 Khách sạn" },
                    { id: "flight", label: "✈️ Máy bay" },
                    { id: "train", label: "🚆 Tàu hỏa" },
                    { id: "bus", label: "🚌 Xe khách" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as ServiceType)}
                        className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.id
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Form tìm kiếm */}
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 p-2">
                <div className="flex-1">
                    <Input
                        placeholder={
                            activeTab === "hotel"
                                ? "Nhập tên khách sạn, thành phố..."
                                : "Nhập điểm đi, điểm đến..."
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-12 text-base"
                    />
                </div>
                {/* Thêm ô chọn ngày tháng nếu cần (sau này bạn có thể dùng thư viện react-datepicker) */}
                <Button type="submit" variant="primary" size="lg" className="h-12 px-8">
                    Tìm kiếm
                </Button>
            </form>
        </div>
    );
}