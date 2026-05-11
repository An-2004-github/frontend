# VIVU — Hệ thống đặt vé & du lịch trực tuyến

Nền tảng đặt vé du lịch tích hợp: máy bay, khách sạn, xe khách và tàu hỏa. Hỗ trợ thanh toán ví điện tử, QR Banking, gợi ý hành trình bằng AI và hệ thống thành viên tích điểm.

---

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| State | Zustand v5 |
| HTTP | Axios với interceptors tự động |
| Auth | Google OAuth 2.0 + JWT |
| Upload ảnh | Cloudinary |
| AI | Google Gemini API |
| Thanh toán | VietQR + Ví nội bộ |

---

## Yêu cầu hệ thống

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Python** >= 3.10 (cho backend FastAPI)

---

## Cài đặt & Khởi động

### 1. Clone repository

```bash
git clone <repo-url>
cd frontend
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình biến môi trường

Tạo file `.env.local` tại thư mục `frontend/`:

```env
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:8000

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Thông tin ngân hàng nhận thanh toán QR
NEXT_PUBLIC_BANK_ID=MB
NEXT_PUBLIC_BANK_ACCOUNT_NO=your_account_number
NEXT_PUBLIC_BANK_ACCOUNT_NAME=YOUR_NAME
```

> **Lưu ý bảo mật:** Không commit file `.env.local` lên git. File này đã được thêm vào `.gitignore`.

### 4. Khởi động backend (FastAPI)

```bash
cd ../backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 5. (Tùy chọn) Train ML model gợi ý

```bash
cd backend
python -m ml.train
# Restart backend sau khi train xong để model được load
uvicorn main:app --reload
```

### 6. Khởi động frontend

```bash
cd frontend
npm run dev
```

Ứng dụng chạy tại: [http://localhost:3000](http://localhost:3000)

---

## Deploy & Tunnel

Kết nối backend với webhook (local dev):

```bash
# Dùng ngrok
ngrok http 8000

# Hoặc dùng Cloudflare Tunnel
cloudflared tunnel run <tunnel-name>
```

---

## Cấu trúc thư mục

```
frontend/
├── app/                    # Next.js App Router (routes)
│   ├── (auth)/            # Login, register, forgot-password
│   ├── flights/           # Tìm kiếm & đặt vé máy bay
│   ├── hotels/            # Tìm kiếm & đặt khách sạn
│   ├── buses/             # Tìm kiếm & đặt xe khách
│   ├── trains/            # Tìm kiếm & đặt tàu hỏa
│   ├── booking/           # Form thông tin hành khách
│   ├── payment/           # Trang thanh toán
│   ├── invoice/           # Hóa đơn xác nhận
│   ├── profile/           # Tài khoản, ví, lịch sử đặt chỗ
│   ├── travel-planner/    # Gợi ý hành trình AI
│   └── admin/             # Quản trị viên
├── components/            # React components tái sử dụng
│   └── ui/               # UI primitives (button, input, modal...)
├── services/              # Axios API service layer
├── store/                 # Zustand stores (auth, booking, payment, toast)
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript interfaces & types
├── lib/                   # Axios instance, utilities
└── styles/                # CSS modules per-page
```

---

## Tính năng chính

### Tìm kiếm & Đặt chỗ
- Tìm kiếm chuyến bay một chiều / khứ hồi với bộ lọc nâng cao
- Đặt phòng khách sạn theo ngày, lọc theo tiện nghi, giá, sao
- Đặt vé xe khách và tàu hỏa
- Hỗ trợ khách không cần đăng ký (guest checkout)

### Thanh toán
- **Ví VIVU**: Thanh toán bằng số dư nội bộ, cashback theo hạng thành viên
- **QR Banking**: Tích hợp VietQR, tự động xác nhận qua webhook
- Đếm ngược 15 phút, tự hủy đặt chỗ khi hết giờ

### Tài khoản người dùng
- Đăng nhập qua Google hoặc email/mật khẩu
- Quản lý ví: nạp tiền, rút tiền, lịch sử giao dịch
- Lịch sử đặt chỗ, đổi lịch, hủy chỗ
- Hệ thống thành viên: Bronze → Silver → Gold → Diamond
- Thông báo trong ứng dụng

### AI & Personalization
- **Travel Planner**: Gợi ý hành trình bằng Gemini AI theo sở thích
- **Chatbot**: Trợ lý tích hợp hỗ trợ người dùng
- Gợi ý dựa trên lịch sử đặt chỗ (NCF model)

---

## Scripts

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Khởi động dev server |
| `npm run build` | Build production |
| `npm run start` | Chạy production server |
| `npm run lint` | Kiểm tra lỗi ESLint |

---

## Biến môi trường — Tham khảo đầy đủ

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Có | URL backend FastAPI |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Có | Google OAuth Client ID |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Có | Cloudinary cloud name |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Có | Cloudinary upload preset |
| `NEXT_PUBLIC_BANK_ID` | Có | Mã ngân hàng (ví dụ: MB, VCB) |
| `NEXT_PUBLIC_BANK_ACCOUNT_NO` | Có | Số tài khoản nhận tiền |
| `NEXT_PUBLIC_BANK_ACCOUNT_NAME` | Có | Tên chủ tài khoản |

---

## Thành viên nhóm

- **Lê Hoàng An** — Frontend & AI Integration
- **Nghĩa** — Backend & ML Model

---

## Tài liệu thêm

- [ARCHITECTURE.md](ARCHITECTURE.md) — Thiết kế hệ thống chi tiết
- [TECH_STACK.md](TECH_STACK.md) — Chi tiết công nghệ sử dụng
- [SECURITY.md](SECURITY.md) — Bảo mật và xác thực
