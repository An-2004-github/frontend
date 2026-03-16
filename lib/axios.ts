import axios from 'axios';

// Khởi tạo instance của axios
const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
    timeout: 10000, // Timeout sau 10 giây nếu API không phản hồi
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor: Chạy trước khi gửi mọi request
axiosInstance.interceptors.request.use(
    (config) => {
        // Chỉ lấy token khi chạy ở môi trường Client (trình duyệt)
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// (Tùy chọn) Interceptor: Xử lý lỗi trả về từ API (như lỗi 401 hết hạn token)
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error("Token hết hạn hoặc không hợp lệ!");
            // Có thể thêm logic tự động đăng xuất ở đây
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;