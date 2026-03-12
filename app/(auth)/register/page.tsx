"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            alert("Mật khẩu xác nhận không khớp!");
            return;
        }

        setIsLoading(true);
        // Giả lập gọi API đăng ký
        setTimeout(() => {
            alert("Đăng ký thành công! Vui lòng đăng nhập.");
            router.push("/login");
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 md:p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Tạo tài khoản mới</h1>
                <p className="text-gray-500 mt-2">Tham gia TravelApp để nhận nhiều ưu đãi</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
                <Input
                    id="name"
                    label="Họ và tên"
                    placeholder="VD: Nguyễn Văn A"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />

                <Input
                    id="email"
                    label="Email"
                    type="email"
                    placeholder="VD: email@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />

                <Input
                    id="password"
                    label="Mật khẩu"
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />

                <Input
                    id="confirmPassword"
                    label="Xác nhận mật khẩu"
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                />

                <Button type="submit" className="w-full mt-2" size="lg" disabled={isLoading}>
                    {isLoading ? "Đang tạo tài khoản..." : "Đăng ký"}
                </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
                Đã có tài khoản?{" "}
                <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                    Đăng nhập
                </Link>
            </div>
        </div>
    );
}