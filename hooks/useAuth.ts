"use client"

import { useState } from "react"
import { login } from "@/services/authService"
import { LoginRequest } from "@/types/auth"

export function useAuth() {
    const [loading, setLoading] = useState(false)

    const loginUser = async (data: LoginRequest) => {
        try {
            setLoading(true)

            const res = await login(data)

            localStorage.setItem("token", res.token)

            return res.user
        } finally {
            setLoading(false)
        }
    }

    return {
        loginUser,
        loading,
    }
}