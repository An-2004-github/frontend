import { api } from "./api"
import { LoginRequest, RegisterRequest, AuthResponse } from "@/types/auth"

export const login = async (data: LoginRequest) => {
    return api.post<AuthResponse, LoginRequest>("/auth/login", data)
}

export const register = async (data: RegisterRequest) => {
    return api.post<AuthResponse, RegisterRequest>("/auth/register", data)
}