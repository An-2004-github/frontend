"use client";
import Link from "next/link";

export default function Navbar() {
    return (
        <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                {/* Logo */}
                <Link href="/" className="text-2xl font-extrabold text-blue-600 tracking-tight">
                    TravelApp
                </Link>

                {/* Main Navigation - Ẩn trên mobile, hiện trên màn hình to */}
                <div className="hidden md:flex space-x-8">
                    <Link href="/hotels" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                        Khách sạn
                    </Link>
                    <Link href="/flights" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                        Máy bay
                    </Link>
                    <Link href="/trains" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                        Tàu hỏa
                    </Link>
                    <Link href="/buses" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                        Xe khách
                    </Link>
                </div>

                {/* Auth Buttons */}
                <div className="flex space-x-3">
                    <Link
                        href="/login"
                        className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                    >
                        Đăng nhập
                    </Link>
                    <Link
                        href="/register"
                        className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                    >
                        Đăng ký
                    </Link>
                </div>
            </div>
        </nav>
    );
}