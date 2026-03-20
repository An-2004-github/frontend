export interface User {
    user_id: number
    email: string

    full_name?: string
    name?: string
    phone?: string
    avatar?: string
    date_of_birth?: string
    gender?: "male" | "female" | "other"
    address?: string

    role?: "USER" | "ADMIN"
    provider?: "local" | "google"
    password?: string
    wallet?: number
    created_at?: string
}