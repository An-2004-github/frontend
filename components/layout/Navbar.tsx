"use client";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";

export default function Navbar() {
    const { user, logout } = useAuthStore();

    return (
        <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">

                {/* Logo */}
                <Link href="/">
                    <Image
                        src="/images/Logo-removebg.png"
                        alt="VIVU Logo"
                        width={100}
                        height={40}
                        className="object-contain"
                    />
                </Link>

                {/* Menu */}
                <div className="hidden md:flex space-x-8">
                    <Link href="/hotels">Khách sạn</Link>
                    <Link href="/flights">Máy bay</Link>
                    <Link href="/buses">Xe khách</Link>
                </div>

                {/* Auth */}
                {!user ? (
                    <div className="flex space-x-3">
                        <Link href="/login" className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-md">
                            Đăng nhập
                        </Link>
                        <Link href="/register" className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-md">
                            Đăng ký
                        </Link>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">

                        {/* 💰 Wallet */}
                        <div className="bg-gray-100 px-3 py-1 rounded">
                            💰 {user.wallet?.toLocaleString?.() || 0} đ
                        </div>

                        {/* 👤 Avatar */}
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                                {user.email?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm">{user.email}</span>
                        </div>

                        {/* Logout */}
                        <button
                            onClick={logout}
                            className="text-red-500 text-sm"
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}