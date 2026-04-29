import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ✅ Đọc token từ đúng key của zustand persist
function getToken(): string | null {
    if (typeof window === 'undefined') return null;

    // Thử đọc từ auth-storage (zustand persist)
    try {
        const raw = localStorage.getItem('auth-storage');
        if (raw) {
            const parsed = JSON.parse(raw);
            const token = parsed?.state?.token;
            if (token) return token;
        }
    } catch { }

    // Fallback: đọc từ key 'token' cũ
    return localStorage.getItem('token');
}

axiosInstance.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            try {
                const raw = localStorage.getItem('auth-storage');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    // Chỉ redirect khi user đang đăng nhập nhưng token hết hạn
                    if (parsed?.state?.token) {
                        parsed.state.token = null;
                        parsed.state.user = null;
                        parsed.state.isAuthenticated = false;
                        localStorage.setItem('auth-storage', JSON.stringify(parsed));

                        // Không redirect nếu đang ở trang auth
                        if (!window.location.pathname.startsWith('/auth')) {
                            window.location.href = '/auth/login?expired=1';
                        }
                    }
                }
            } catch { }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;