"use client";

import { useEffect } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { User } from "@/types/auth";

export const useAuthInit = () => {
    const login = useAuthStore((state) => state.login);

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) return;

        api.get<User>("/api/auth/me")
            .then((res) => {
                login(res.data, token);
            })
            .catch(() => {
                localStorage.removeItem("token");
            });
    }, [login]);
};