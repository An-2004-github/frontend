"use client";

import { useEffect } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { User } from "@/types/user";

export const useAuthInit = () => {
    const token = useAuthStore((state) => state.token);
    const hasHydrated = useAuthStore((state) => state.hasHydrated);
    const login = useAuthStore((state) => state.login);
    const logout = useAuthStore((state) => state.logout);

    useEffect(() => {
        // Chờ Zustand rehydrate từ localStorage xong mới kiểm tra
        if (!hasHydrated) return;
        // Không có token → không cần validate
        if (!token) return;

        // Validate token với backend để lấy user data mới nhất
        api.get<User>("/api/auth/me")
            .then((res) => {
                login(res.data, token);
            })
            .catch(() => {
                // Token không hợp lệ hoặc hết hạn → clear auth state
                logout();
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasHydrated]); // chỉ chạy 1 lần sau khi hydration hoàn tất
};
