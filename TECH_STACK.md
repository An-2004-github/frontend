# Công nghệ sử dụng trong dự án VIVU

## Frontend

| Công nghệ | Phiên bản | Vai trò |
|---|---|---|
| Next.js | 15 | Framework React, App Router, SSR/CSR |
| React | 19 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Styling utility |
| Zustand | 5 | State management (auth, booking, payment) |
| Axios | 1.x | HTTP client gọi API |
| @react-oauth/google | 0.x | Đăng nhập Google OAuth |

## Backend

| Công nghệ | Vai trò |
|---|---|
| FastAPI (Python) | REST API framework |
| Uvicorn | ASGI server |
| SQLAlchemy | ORM kết nối database |
| PyMySQL | MySQL driver |
| Python-jose | Tạo và xác thực JWT token |
| Passlib + bcrypt | Hash mật khẩu người dùng |
| FastMail | Gửi email xác nhận đặt chỗ (Gmail SMTP) |
| Pydantic | Validate dữ liệu request/response |
| Python-dotenv | Quản lý biến môi trường |
| openpyxl | Xuất/nhập file Excel trong trang admin |

## Database

| Công nghệ | Vai trò |
|---|---|
| MySQL | Cơ sở dữ liệu chính |

## AI / ML

| Công nghệ | Vai trò |
|---|---|
| Google Gemini API (gemini-2.5-flash) | Chatbot hỗ trợ + gợi ý lịch trình du lịch |
| PyTorch | Training mô hình NCF (Neural Collaborative Filtering) |
| NeuMF (GMF + MLP) | Gợi ý khách sạn/điểm đến theo hành vi người dùng |
| NumPy | Xử lý dữ liệu số |
| Pandas | Xử lý và phân tích dữ liệu huấn luyện |
| Scikit-learn | Tiện ích đánh giá mô hình (metrics, split) |

## Dịch vụ bên thứ ba

| Dịch vụ | Vai trò |
|---|---|
| Google OAuth 2.0 | Đăng nhập bằng tài khoản Google |
| VietQR API | Tạo mã QR thanh toán ngân hàng |
| Cloudinary | Lưu trữ và tối ưu ảnh |
| Unsplash | Nguồn ảnh minh hoạ |

## DevTools

| Công nghệ | Vai trò |
|---|---|
| Git | Version control |
| Node.js / npm | Quản lý package frontend |
| Python pip | Quản lý package backend |
| ESLint | Kiểm tra và lint code TypeScript |

---

## Bảo mật

### Xác thực & Phân quyền

| Cơ chế | Chi tiết |
|---|---|
| JWT (JSON Web Token) | Token có thời hạn 7 ngày, tự động đính kèm vào mọi request qua Axios interceptor |
| bcrypt | Hash mật khẩu người dùng, không lưu plaintext |
| OAuth2 (Google) | Đăng nhập bằng tài khoản Google, không cần mật khẩu |
| RBAC | Phân quyền theo role: `USER` / `ADMIN`, các endpoint admin đều kiểm tra quyền |
| OTP 2FA | Mã 6 số gửi qua email, hết hạn sau 10 phút |

### Bảo vệ API

| Cơ chế | Chi tiết |
|---|---|
| CORS | Chỉ cho phép các domain: `localhost:3000`, `vivuvuive.io.vn` |
| Parameterized Query | Toàn bộ SQL dùng `:param` (SQLAlchemy text), tránh SQL Injection |
| Pydantic Validation | Validate kiểu dữ liệu và định dạng email ở tầng request |
| 401 Auto Logout | Khi token hết hạn, frontend tự xóa auth state và chuyển về login |

### Quản lý mật khẩu

| Cơ chế | Chi tiết |
|---|---|
| Độ dài tối thiểu | 6 ký tự |
| Xác minh mật khẩu cũ | Bắt buộc nhập mật khẩu hiện tại khi đổi mật khẩu mới |
| Tài khoản Google | Không có password hash (lưu chuỗi rỗng) |

### Điểm cần cải thiện (production)

| Vấn đề | Khuyến nghị |
|---|---|
| `SECRET_KEY` hardcoded | Chuyển sang biến môi trường `.env` |
| OTP lưu in-memory | Nên dùng Redis để persistent và scalable |
| Chưa có rate limiting | Thêm giới hạn số request/phút để chống brute-force |
| Chưa bắt buộc HTTPS | Cấu hình redirect HTTP → HTTPS trên server |
