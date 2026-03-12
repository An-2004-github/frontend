export interface User {
    user_id: number

    name: string
    email: string
    password?: string

    avatar?: string

    created_at?: string
}