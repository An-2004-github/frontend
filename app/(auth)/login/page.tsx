"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
    const router = useRouter();
    const login = useAuthStore((state) => state.login);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            // Giả lập gọi API đăng nhập:
            // const res = await authService.login(email, password);

            setTimeout(() => {
                if (email === "test@gmail.com" && password === "123456") {
                    // Dữ liệu giả lập trả về từ API
                    const mockUser = { user_id: 1, name: "Nguyễn Văn A", email: "test@gmail.com" };
                    const mockToken = "fake-jwt-token-12345";

                    // Cập nhật global state
                    login(mockUser, mockToken);

                    // Chuyển hướng về trang chủ hoặc trang trước đó
                    router.push("/");
                } else {
                    setError("Email hoặc mật khẩu không đúng. (Gợi ý: test@gmail.com / 123456)");
                }
                setIsLoading(false);
            }, 1000);
        } catch (err) {
            setError("Đã xảy ra lỗi, vui lòng thử lại.");
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 md:p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Chào mừng trở lại!</h1>
                <p className="text-gray-500 mt-2">Đăng nhập để quản lý đặt phòng của bạn</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                    {error}
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
                <Input
                    label="Email"
                    type="email"
                    placeholder="VD: test@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <Input
                    label="Mật khẩu"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <div className="flex justify-end">
                    <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                        Quên mật khẩu?
                    </Link>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? "Đang xử lý..." : "Đăng nhập"}
                </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
                Chưa có tài khoản?{" "}
                <Link href="/register" className="text-blue-600 font-semibold hover:underline">
                    Đăng ký ngay
                </Link>
            </div>
        </div>
    );
}