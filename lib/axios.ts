import axios from "axios"

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api",
    headers: {
        "Content-Type": "application/json",
    },
})

axiosInstance.interceptors.request.use(
    (config) => {
        const token =
            typeof window !== "undefined"
                ? localStorage.getItem("token")
                : null

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`
        }

        return config
    },
    (error) => Promise.reject(error)
)

export default axiosInstance