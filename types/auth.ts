export interface LoginRequest {
    email: string
    password: string
}

export interface RegisterRequest {
    name: string
    email: string
    password: string
}

export interface AuthResponse {
    token: string
    user: {
        user_id: number
        name: string
        email: string
    }
}
export interface LoginResponse {
    access_token: string;
}

export interface ErrorResponse {
    detail?: string;
}
export interface User {
    email: string;
    user_id?: number;
    full_name?: string;
    wallet: number;
}