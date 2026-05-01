# VIVU — Tài liệu kiến trúc & cách hoạt động của hệ thống

> Hệ thống đặt vé du lịch trực tuyến: chuyến bay, khách sạn, xe khách, tàu hỏa.  
> Frontend: Next.js 16 + React 19 + TypeScript.  
> Backend: FastAPI (Python) + MySQL.

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Frontend — Cấu trúc thư mục](#2-frontend--cấu-trúc-thư-mục)
3. [Frontend — Luồng dữ liệu & State](#3-frontend--luồng-dữ-liệu--state)
4. [Frontend — Các trang (App Router)](#4-frontend--các-trang-app-router)
5. [Frontend — Components](#5-frontend--components)
6. [Frontend — Services & API Layer](#6-frontend--services--api-layer)
7. [Backend — Cấu trúc & Khởi động](#7-backend--cấu-trúc--khởi-động)
8. [Backend — Xác thực (JWT)](#8-backend--xác-thực-jwt)
9. [Backend — Các Router](#9-backend--các-router)
10. [Backend — Luồng đặt vé chi tiết](#10-backend--luồng-đặt-vé-chi-tiết)
11. [Backend — Đổi lịch & Hủy booking](#11-backend--đổi-lịch--hủy-booking)
12. [Backend — Ví điện tử & Thanh toán](#12-backend--ví-điện-tử--thanh-toán)
13. [Backend — ML Recommendation (NCF)](#13-backend--ml-recommendation-ncf)
14. [Backend — Travel Planner (Gemini AI)](#14-backend--travel-planner-gemini-ai)
15. [Backend — Chatbot](#15-backend--chatbot)
16. [Backend — Booking Expiry Scheduler](#16-backend--booking-expiry-scheduler)
17. [Database — Mô hình dữ liệu chính](#17-database--mô-hình-dữ-liệu-chính)
18. [Luồng người dùng end-to-end](#18-luồng-người-dùng-end-to-end)

---

## 1. Tổng quan kiến trúc

```
Người dùng (Browser)
        │
        ▼
┌─────────────────────────────────────┐
│  Next.js 16 Frontend (React 19)     │
│  - App Router (31+ routes)          │
│  - Zustand (global state)           │
│  - Axios interceptors (JWT auto)    │
│  - Tailwind CSS + Module CSS        │
└─────────────┬───────────────────────┘
              │ HTTPS REST API
              ▼
┌─────────────────────────────────────┐
│  FastAPI Backend (Python)           │
│  - 18 routers                       │
│  - JWT (python-jose, HS256)         │
│  - SQLAlchemy raw SQL (text())      │
│  - Asyncio background scheduler     │
│  - SMTP email service               │
└─────────────┬───────────────────────┘
              │ SQLAlchemy + PyMySQL
              ▼
┌─────────────────────────────────────┐
│  MySQL Database (DATN)              │
│  - ~30+ tables                      │
│  - Polymorphic bookings             │
│  - InnoDB SELECT...FOR UPDATE       │
└─────────────────────────────────────┘

Dịch vụ ngoài:
  - Google OAuth 2.0 (đăng nhập)
  - Google Gemini API (travel planner, chatbot)
  - Cloudinary (upload ảnh)
  - VietQR API (mã QR thanh toán)
  - SMTP (email xác nhận booking / đổi lịch)
```

**Điểm đặc biệt về kiến trúc:**
- Backend không dùng ORM model class — toàn bộ query viết bằng `text()` của SQLAlchemy (raw SQL).
- Frontend không có server-side rendering thực sự — toàn bộ là Client Components (`"use client"`), kể cả root layout.
- State xác thực lưu trong Zustand + `localStorage` (key `auth-storage`), Axios tự đọc token trước mỗi request.
- Race condition cho booking khách sạn được xử lý bằng `SELECT ... FOR UPDATE` (MySQL InnoDB X-lock).

---

## 2. Frontend — Cấu trúc thư mục

```
frontend/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout: Navbar, Footer, ChatBot
│   │                             #   (ẩn khi chưa đăng nhập + đang ở /booking, /payment)
│   ├── page.tsx                  # Trang chủ
│   ├── error.tsx                 # Global error boundary
│   ├── not-found.tsx             # 404 page
│   ├── loading.tsx               # Global loading skeleton
│   │
│   ├── (auth)/                   # Route group xác thực
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   │
│   ├── flights/                  # Tìm kiếm chuyến bay
│   ├── hotels/                   # Tìm kiếm khách sạn
│   │   └── [hotel_id]/page.tsx   # Chi tiết khách sạn
│   ├── buses/                    # Tìm kiếm xe khách
│   ├── trains/                   # Tìm kiếm tàu hỏa
│   │
│   ├── booking/page.tsx          # Form đặt vé (ẩn Navbar nếu chưa login)
│   ├── payment/[booking_id]/     # Thanh toán (ẩn Navbar nếu chưa login)
│   ├── invoice/[id]/             # Hóa đơn
│   │
│   ├── profile/                  # Khu vực cá nhân
│   │   ├── layout.tsx            # Profile sidebar layout
│   │   ├── page.tsx              # Thông tin cá nhân
│   │   ├── bookings/             # Đặt chỗ (+ [booking_id]/)
│   │   ├── wallet/               # Ví điện tử
│   │   ├── transactions/         # Lịch sử giao dịch
│   │   ├── notifications/        # Thông báo
│   │   └── membership/           # Hạng thành viên
│   │
│   ├── travel-planner/           # Lập kế hoạch du lịch AI
│   ├── promotion/                # Khuyến mãi
│   ├── admin/                    # Quản trị
│   │
│   ├── chinh-sach-huy/           # Trang chính sách hủy
│   ├── dieu-khoan/               # Trang điều khoản dịch vụ
│   ├── faq/                      # Câu hỏi thường gặp
│   ├── huong-dan/                # Hướng dẫn sử dụng
│   └── thanh-vien/               # Thông tin hạng thành viên
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── booking/
│   │   ├── BookingCard.tsx        # Tóm tắt giỏ hàng + promo (yêu cầu đăng nhập để dùng promo)
│   │   ├── BookingForm.tsx
│   │   └── BookingSuggestions.tsx
│   ├── flight/
│   │   ├── FlightCard.tsx
│   │   ├── FlightList.tsx
│   │   └── FlightTicketModal.tsx
│   ├── hotel/
│   │   ├── HotelCard.tsx
│   │   └── HotelList.tsx
│   ├── bus/
│   │   ├── BusCard.tsx
│   │   ├── BusList.tsx
│   │   └── BusTicketModal.tsx
│   ├── train/
│   │   ├── TrainCard.tsx
│   │   └── TrainTicketModal.tsx
│   ├── ui/
│   │   ├── DestinationInput.tsx
│   │   ├── ToastContainer.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── modal.tsx
│   ├── wallet/
│   │   ├── WalletDeposit.tsx
│   │   └── WalletWithdraw.tsx
│   ├── review/
│   │   ├── ReviewForm.tsx
│   │   └── ReviewList.tsx
│   ├── search/
│   │   ├── SearchBar.tsx
│   │   └── SearchResults.tsx
│   ├── promotion/
│   │   ├── promotionCard.tsx
│   │   └── promotionList.tsx
│   ├── profile/
│   │   ├── OTPVerify.tsx
│   │   └── ProfileLayout.tsx
│   ├── gallery/
│   │   └── ImageGallery.tsx
│   ├── recommendation/
│   │   └── DestinationRecommendations.tsx  # Điểm đến phổ biến (trang chủ)
│   ├── BannerSlider.tsx
│   ├── BookingModifyModal.tsx
│   ├── ChatBot.tsx
│   ├── CloudinaryUpload.tsx
│   ├── CloudinaryMultiUpload.tsx
│   ├── DestinationsSection.tsx
│   ├── HeroBackground.tsx
│   └── PromoSection.tsx
│
├── services/                     # API service layer
├── store/                        # Zustand stores
├── hooks/                        # Custom React hooks
├── types/                        # TypeScript type definitions
├── lib/                          # axios instance, utils
├── styles/                       # CSS per page
│   ├── booking.css
│   ├── booking-form.css
│   ├── buses.css
│   ├── flights.css
│   ├── hotels.css
│   ├── search-bar.css
│   └── trains.css
└── backend/                      # FastAPI Python backend
```

---

## 3. Frontend — Luồng dữ liệu & State

### Zustand Stores

**`store/authStore.ts` — Xác thực người dùng**
```
useAuthStore
  ├── user: User | null        — thông tin user (id, name, email, wallet, role...)
  ├── token: string | null     — JWT token
  ├── isAuthenticated: boolean
  ├── login(user, token)       — lưu vào store + localStorage (persist)
  ├── logout()                 — xóa toàn bộ
  ├── updateUser(partial)      — cập nhật 1 phần thông tin user
  └── refreshWallet()          — gọi /api/auth/me để lấy số dư ví mới nhất
```

Store dùng middleware `persist` của Zustand → tự serialize vào `localStorage` với key `auth-storage`.

**`store/bookingStore.ts` — Trạng thái đặt vé**  
Lưu thông tin item đang được đặt (entity_type, entity_id, seat_class, v.v.) để truyền sang trang `/booking`.

**`store/paymentStore.ts` — Trạng thái thanh toán**  
Lưu booking_id và phương thức thanh toán đang xử lý.

**`store/toastStore.ts` — Thông báo toast**  
Quản lý hàng đợi toast notification (success / error / info).

### Axios Interceptor (`lib/axios.ts`)

Mỗi HTTP request tự động:
1. Đọc JWT token từ `localStorage` (key `auth-storage` → `state.token`)
2. Thêm header `Authorization: Bearer <token>`
3. Nếu response 401 → tự xóa token khỏi localStorage

### Custom Hooks

| Hook | Chức năng |
|------|-----------|
| `useAuth` | Lấy `user`, `token`, `isAuthenticated` từ authStore |
| `useAuthInit` | Khởi tạo auth state khi app load (gọi trong root layout) |
| `useBooking` | Quản lý state form đặt vé |
| `useSearch` | Quản lý state tìm kiếm (query, loading, results) |

---

## 4. Frontend — Các trang (App Router)

### Trang chủ (`app/page.tsx`)
Hiển thị: Hero banner, BannerSlider, DestinationsSection (top destinations), `DestinationRecommendations` (popular cities), `PromoSection`, gợi ý recommendation từ ML nếu user đã login.

### Tìm kiếm dịch vụ

**`app/flights/page.tsx`**  
- Form tìm kiếm (điểm đi, điểm đến, ngày bay, hành khách, hạng ghế)
- Gọi `GET /api/flights?from=...&to=...&date=...`
- Hiển thị `FlightList` → `FlightCard`
- Click card → mở `FlightTicketModal` → chọn hạng ghế → redirect `/booking`
- Phần dưới: **Điểm đến phổ biến** (5 card) + **Khách sạn nổi bật** (tabs theo thành phố + 4 hotel card)

**`app/hotels/page.tsx`**  
- Hero search box + **Popular destinations** (5 card, 5 cột) + Filter sidebar
- Auto-search khi có URL params `?search=...&destination_id=...`
- Filter: giá/đêm, đánh giá, tiện nghi, hoàn tiền
- Gọi `GET /api/hotels?search=...`

**`app/buses/page.tsx`**  
- Form tìm kiếm, list kết quả, modal chọn ghế
- Phần dưới: **Điểm đến phổ biến** (5 card) + **Khách sạn nổi bật** (tabs + 4 hotel card)

**`app/trains/page.tsx`**  
- Tương tự buses
- Phần dưới: **Điểm đến phổ biến** (5 card) + **Khách sạn nổi bật** (tabs + 4 hotel card)

### Đặt vé (`app/booking/page.tsx`)
- Đọc state từ `bookingStore`
- Form điền thông tin hành khách
- `BookingCard`: chọn mã khuyến mãi — **yêu cầu đăng nhập** (hiện hint đăng nhập nếu chưa login)
- Submit → `POST /api/bookings` → nhận `booking_id` → redirect `/payment/{booking_id}`
- Nếu email đã có tài khoản: hiển thị lỗi inline tại field email

> **Ẩn Navbar/Footer/ChatBot:** khi user chưa đăng nhập và đang ở `/booking` hoặc `/payment/*`

### Thanh toán (`app/payment/[booking_id]/page.tsx`)
- Hiển thị tóm tắt booking
- Chọn phương thức: Ví nội bộ / QR Banking
- Ví nội bộ: `POST /api/bookings/{id}/pay`
- QR Banking: hiển thị mã QR VietQR, polling kiểm tra trạng thái

### Profile — Đặt chỗ (`app/profile/bookings/`)
- `page.tsx`: danh sách booking (tab theo loại, filter)
- `[booking_id]/page.tsx`: chi tiết + nút đổi lịch/hủy + timeline lịch sử thay đổi

### Profile — Giao dịch (`app/profile/transactions/page.tsx`)
Gọi `GET /api/bookings/history` — hiển thị tất cả booking kể cả đã hết hạn.

### Travel Planner (`app/travel-planner/page.tsx`)
- Form: ngân sách, thời gian, phong cách, **phương tiện ưu tiên** (✈️ Máy bay / 🚆 Tàu hỏa / 🚌 Xe khách / 🚗 Tự lái)
- Gọi `POST /api/travel-planner/suggest` → Gemini AI
- Nút "Đặt vé / Xem vé" trỏ đúng trang tương ứng:
  - flight → `/flights?to={city}`
  - train → `/trains?to={city}`
  - bus → `/buses?to={city}`
  - self_drive → ẩn nút phương tiện

### Trang thông tin tĩnh
- `app/chinh-sach-huy/` — Chính sách hủy
- `app/dieu-khoan/` — Điều khoản dịch vụ
- `app/faq/` — Câu hỏi thường gặp
- `app/huong-dan/` — Hướng dẫn sử dụng
- `app/thanh-vien/` — Thông tin hạng thành viên

---

## 5. Frontend — Components

### Layout
- **`Navbar.tsx`**: Navigation bar, dropdown profile; ẩn khi user chưa login + đang ở checkout
- **`Footer.tsx`**: Footer với links đến chinh-sach-huy, dieu-khoan, faq, huong-dan

### Booking Components
- **`BookingCard.tsx`**: Tóm tắt giỏ hàng + phần mã giảm giá
  - Khi chưa đăng nhập: hiện hint "🔒 Đăng nhập để dùng mã giảm giá"
  - Khi đã đăng nhập: hiện input + nút Áp dụng + dropdown danh sách mã
- **`BookingForm.tsx`**: Form thông tin hành khách, số lượng, ghi chú
- **`BookingModifyModal.tsx`**: Modal đổi lịch/hủy — 4 bước
- **`BookingSuggestions.tsx`**: Gợi ý đặt thêm sau booking

### Transport Components
- **`FlightCard/BusCard/TrainCard`**: Card chuyến đi với thông tin chi tiết
- **`FlightTicketModal/BusTicketModal/TrainTicketModal`**: Modal chọn hạng ghế + số lượng

### Hotel Components
- **`HotelCard.tsx`**: Card với ảnh, rating, giá từ, tiện nghi
- **`HotelList.tsx`**: Grid khách sạn

### UI Components
- **`DestinationInput.tsx`**: Input autocomplete địa điểm
- **`ToastContainer.tsx`**: Hệ thống toast notification
- **`modal.tsx`**, **`card.tsx`**, **`button.tsx`**, **`input.tsx`**: UI primitives

### Tiện ích
- **`ChatBot.tsx`**: Chatbot nổi góc dưới phải, gọi `/api/chat`; ẩn ở trang checkout (chưa login)
- **`BannerSlider.tsx`**: Slider banner trang chủ
- **`DestinationsSection.tsx`**: Grid điểm đến (trang chủ)
- **`DestinationRecommendations.tsx`**: Popular cities với ảnh nền, hover effect
- **`PromoSection.tsx`**: Banner khuyến mãi nổi bật
- **`CloudinaryUpload.tsx`** / **`CloudinaryMultiUpload.tsx`**: Upload ảnh
- **`ImageGallery.tsx`**: Gallery ảnh khách sạn

---

## 6. Frontend — Services & API Layer

Mỗi service là một object với các async function gọi `axiosInstance`:

```
services/
├── api.ts               — base axios config + interceptors
├── authService.ts       — login, register, loginGoogle, forgotPassword, resetPassword
├── flightService.ts     — searchFlights, getFlightById, getClasses
├── hotelService.ts      — getHotels, getHotelById
├── busService.ts        — searchBuses, getBusById
├── trainService.ts      — searchTrains, getTrainById
├── bookingService.ts    — createBooking, getMyBookings, cancelBooking
├── promotionService.ts  — getPromotions, applyPromotion
├── reviewService.ts     — getReviews, submitReview
├── invoiceService.ts    — getInvoice
├── searchService.ts     — globalSearch
├── imageService.ts      — uploadImage (Cloudinary)
└── detinationService.ts — getDestinations (typo trong tên file)
```

---

## 7. Backend — Cấu trúc & Khởi động

**Entry point: `backend/main.py`**

Khi `uvicorn main:app --reload` chạy:

1. Load biến môi trường từ `.env`
2. Khởi tạo FastAPI app
3. Cấu hình CORS
4. `lifespan` context manager:
   - Load ML model NCF (nếu PyTorch đã cài và model đã train)
   - Khởi động `booking_expire_loop` background task (asyncio)
5. Register 18 routers

**Kết nối database (`backend/database.py`)**  
```
mysql+pymysql://root:123456@localhost/DATN
```
Toàn bộ backend dùng `engine.begin()` + `text()` — không dùng ORM models.

**Email service (`backend/email_service.py`)**  
SMTP gửi email xác nhận:
- `send_booking_confirmation_email` — xác nhận đặt vé
- `send_reschedule_confirmation_email` — xác nhận đổi lịch với đầy đủ: ngày cũ/mới, giá cũ/mới, phí đổi, số tiền thanh toán thêm/hoàn

---

## 8. Backend — Xác thực (JWT)

**`backend/auth.py`**

| Hàm | Mô tả |
|-----|-------|
| `hash_password(pw)` | Bcrypt hash mật khẩu |
| `verify_password(plain, hashed)` | Kiểm tra mật khẩu |
| `create_access_token(data)` | Tạo JWT với expire 7 ngày, HS256 |
| `get_current_user(token)` | Dependency — decode JWT, trả `user_id`. Raise 401 nếu invalid |
| `get_optional_user(token)` | Như trên nhưng trả `None` thay vì 401 |

**Cấu hình:**
```python
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 ngày
```

**Luồng đăng nhập:**
```
POST /api/auth/login
  → verify_password
  → create_access_token({"user_id": user.id})
  → trả về {access_token, user}
```

**Đăng nhập Google (`routers/auth_google.py`)**  
Verify `google_token` → tạo account nếu email mới → tạo JWT nội bộ.

---

## 9. Backend — Các Router

### `routers/flights.py`
- `GET /api/flights` — tìm kiếm theo `from`, `to`, `date`, `seat_class`, `passengers`
- `GET /api/flights/{id}` — chi tiết chuyến bay
- `GET /api/flights/{id}/classes` — hạng ghế còn trống

Multiplier ghế: `economy: 1.0x | business: 1.8x | first: 2.5x`

### `routers/hotels.py`
- `GET /api/hotels` — filter: `search`, `destination_id`, `min_price`, `max_price`, `sort`, `min_guests`
- `GET /api/hotels/{id}` — chi tiết + room types + reviews
- `GET /api/hotels/{id}/reschedule-options` — phòng trống cho ngày mới

Giá phòng = `price_per_night × nights × quantity × 1.21` (thuế/phí).

### `routers/buses.py` và `routers/trains.py`
Tương tự flights. Multiplier bus: `standard: 1.0x | vip: 1.4x | sleeper: 1.6x`.

### `routers/bookings.py`

File trung tâm (~119KB). Các endpoint:
```
POST   /api/bookings                      — Tạo booking mới
POST   /api/bookings/{id}/pay             — Thanh toán
GET    /api/bookings/my                   — Booking đang hiệu lực
GET    /api/bookings/history              — Toàn bộ booking
GET    /api/bookings/{id}                 — Chi tiết + lịch sử thay đổi
GET    /api/bookings/{id}/class-options   — Hạng ghế có thể đổi
GET    /api/bookings/{id}/reschedule-options — Lịch/phòng có thể đổi
POST   /api/bookings/{id}/reschedule      — Đổi lịch
POST   /api/bookings/{id}/cancel          — Hủy booking
GET    /api/bookings/{id}/cancel/preview  — Preview hoàn tiền nếu hủy
POST   /api/bookings/{id}/pay-extra       — Thanh toán chênh lệch sau đổi lịch
```

### `routers/wallet.py`
```
GET  /api/wallet                — Số dư ví
POST /api/wallet/deposit        — Nạp tiền (tạo QR VietQR)
POST /api/wallet/withdraw       — Rút tiền
GET  /api/wallet/transactions   — Lịch sử giao dịch
```

### `routers/promotions.py`
```
GET  /api/promotions        — Danh sách mã
POST /api/promotions/apply  — Áp dụng mã (yêu cầu auth)
```
Kiểm tra: tồn tại, còn hạn, chưa dùng hết, đúng entity_type, user chưa dùng.

### `routers/travel_planner.py`
```
POST /api/travel-planner/suggest  — Gợi ý địa điểm Gemini AI
GET  /api/travel-planner/trending — Top điểm đến xu hướng
POST /api/travel-planner/feedback — Lưu phản hồi
```

Phương tiện hỗ trợ: `flight` (Máy bay) | `train` (Tàu hỏa) | `bus` (Xe khách) | `self_drive` (Tự lái).  
Transport chỉ dùng làm context cho prompt Gemini — không ảnh hưởng ML model.

### `routers/chat.py`
```
POST /api/chat  — Chatbot, Gemini API, context lịch sử chat
```
Hỗ trợ optional JWT — nhận diện user đã login để cá nhân hóa câu trả lời.

### `routers/recommendations.py`
```
GET /api/recommendations         — Top gợi ý cho user login (NCF model)
GET /api/recommendations/popular — Gợi ý phổ biến (không cần login)
```

### `routers/reviews.py`
Chỉ cho phép review sau khi booking `completed`. Cập nhật `avg_rating` entity.

### `routers/interactions.py`
```
POST /api/interactions/log  — Ghi lại hành động user (view, search, click)
```

### `routers/notifications.py`
```
GET /api/notifications              — Danh sách thông báo
PUT /api/notifications/{id}/read    — Đánh dấu đã đọc
```

### `routers/admin.py`
Quản lý dữ liệu (CRUD), thống kê doanh thu.

---

## 10. Backend — Luồng đặt vé chi tiết

### Bước 1: Tạo booking (`POST /api/bookings`)

```
Request: {
  entity_type: "flight" | "hotel" | "bus" | "train",
  entity_id, seat_class, quantity,
  check_in_date, check_out_date,   // hotel
  contact_name, contact_phone, contact_email?,
  promo_code?
}

Xử lý:
1. Tính giá:
   - Flight/Bus/Train: base_price × class_multiplier × quantity
   - Hotel: price_per_night × nights × quantity × 1.21
2. Áp dụng promo (nếu có) → discount_amount
3. INSERT bookings (status='pending')
4. INSERT booking_items
5. Giữ ghế (SELECT...FOR UPDATE → UPDATE is_booked=1)
6. Gửi notification

Response: {booking_id, total_price, final_amount, ...}
```

**Race condition (hotel):** `SELECT ... FOR UPDATE` trên `room_types` tạo MySQL InnoDB X-lock, serialize các request đồng thời. Request thứ 2 block cho đến khi request 1 commit, sau đó đọc dữ liệu đã commit → thấy 0 phòng còn → từ chối.

**Booking tự động hủy sau 15 phút nếu không thanh toán** (xem phần 16).

### Bước 2: Thanh toán (`POST /api/bookings/{id}/pay`)

```
Xử lý (trong transaction):
1. Kiểm tra booking tồn tại, status='pending', user sở hữu
2. Nếu wallet: kiểm tra số dư, trừ tiền
3. UPDATE bookings SET status='confirmed'
4. INSERT wallet_transactions (type='payment')
5. Gửi email xác nhận + notification
```

### Booking khách booking dạng guest
- User điền `contact_email` không thuộc tài khoản nào → tạo booking bình thường
- Nếu `contact_email` đã có tài khoản → backend trả 400 với message "đã có tài khoản"
- Frontend hiện lỗi inline tại field email (không dùng toast)

---

## 11. Backend — Đổi lịch & Hủy booking

### Đổi lịch (`POST /api/bookings/{id}/reschedule`)

```
Các trường hợp:
A. Đổi hạng ghế (cùng entity):
   economy_base = old_price / old_multiplier
   new_price    = economy_base × new_multiplier
   diff = new_price - old_price

B. Đổi sang entity mới (chuyến khác / phòng khác):
   _transfer_seats(): giải phóng ghế cũ, giữ ghế mới
   UPDATE booking_items với entity mới, giá mới

Tính phí:
   fee = diff > 0 ? diff × reschedule_fee_rate : 0
   
Kết quả:
   diff > 0 → status='pending_payment', user gọi /pay-extra
   diff ≤ 0 → hoàn tiền ngay vào ví

Email xác nhận đổi lịch bao gồm:
   - Ngày check-in/out cũ (đỏ) và mới (xanh)
   - Giá cũ, giá mới, phí đổi
   - Số tiền thanh toán thêm hoặc hoàn lại
   - Phương thức hoàn (ví / ngân hàng)
```

### Hủy booking (`POST /api/bookings/{id}/cancel`)

```
1. Kiểm tra thời gian (transport) hoặc check-in date (hotel)
2. refund = final_amount × (1 - cancel_fee_rate)
3. UPDATE bookings SET status='cancelled'
4. Giải phóng ghế (transport)
5. INSERT wallet_transactions (refund)
6. INSERT booking_modifications (type='cancel')
7. Gửi notification
```

### Kiểm tra thời gian (`_check_transport_time`)
- Lấy `depart_time`, tính `hours_left`
- Đọc `min_hours_before` từ bảng `policies`
- Từ chối nếu `hours_left < min_hours`

---

## 12. Backend — Ví điện tử & Thanh toán

### Bảng dữ liệu
- `wallets`: `wallet_id`, `user_id`, `balance`
- `wallet_transactions`: `id`, `wallet_id`, `type` (deposit/payment/refund/withdraw), `amount`, `description`

### Nạp tiền
1. Tạo `wallet_transactions` với `status='pending'`
2. Tạo QR VietQR với nội dung `VIVU-{transaction_id}`
3. Frontend polling kiểm tra trạng thái
4. Khi xác nhận: cộng tiền vào `wallets.balance`

### Thanh toán booking
```
wallet.balance -= booking.final_amount
wallet_transactions INSERT (type='payment', amount=-final_amount)
bookings.status = 'confirmed'
```

### Hoàn tiền
```
wallet.balance += refund_amount
wallet_transactions INSERT (type='refund', amount=+refund_amount)
booking_modifications.status = 'refunded'
```

---

## 13. Backend — ML Recommendation (NCF)

### Kiến trúc model (`backend/ml/model.py`)

**Neural Collaborative Filtering (NeuMF)** — kết hợp GMF + MLP:

```
Input: (user_id, item_id)
       ↓                ↓
  GMF embeddings    MLP embeddings (32-dim)
       ↓                ↓
  element-wise ×   concat → Linear [64→32→16] + BN + ReLU + Dropout(0.2)
       ↓                ↓
  GMF_out (32)     MLP_out (16)
           ↓ concat (48)
    Linear(48→1) → Sigmoid → Score [0,1]
```

### Training (`backend/ml/train.py`)
- Input: `interactions` table (user_id, item_type, item_id, weight)
- Negative sampling, Binary Cross Entropy loss
- Lưu model → `ml/saved/ncf_best.pt`

### Inference
- User đã biết: tính score cho tất cả items → top-K
- Cold start (user mới): fallback về popular items

---

## 14. Backend — Travel Planner (Gemini AI)

### `POST /api/travel-planner/suggest`

```
Request: {
  budget: "under5m" | "5to10m" | "10to20m" | "over20m",
  interests: string[],
  transport: "flight" | "train" | "bus" | "self_drive",
  duration: "short" | "medium" | "long",
  people: number,
  from_city?: string
}

Xử lý:
1. Build prompt → Gemini API
2. Parse JSON response: [{city, tagline, why_match, highlights,
   budget_note, transport_tip, itinerary, match_score}]
3. Enrich từ DB: destination_id, min_price, avg_rating, image_url
4. Trả về cho frontend
```

Transport labels: `flight=Máy bay | train=Tàu hỏa | bus=Xe khách | self_drive=Tự lái`  
→ Chỉ dùng làm text trong prompt Gemini, không ảnh hưởng ML model.

### `GET /api/travel-planner/trending`
```
trend_score = booking_score × 0.6 + interact_score × 0.4
(tính trong 30 ngày gần đây)
```

---

## 15. Backend — Chatbot

### `POST /api/chat`

```python
Request: {messages: [{role, content}], authorization?: string}
```

- Gọi Gemini API với system prompt tư vấn du lịch Việt Nam (VIVU Travel)
- Optional JWT: nếu user login, có thể cá nhân hóa câu trả lời
- Frontend `ChatBot.tsx` lưu history trong component state, gửi toàn bộ history mỗi lần

---

## 16. Backend — Booking Expiry Scheduler

**`backend/booking_expire.py`**

```
Mỗi 60 giây:
  SELECT booking_id, entity_type, entity_id, quantity
  FROM bookings JOIN booking_items
  WHERE status='pending' AND booking_date < NOW() - INTERVAL 15 MINUTE

  Với mỗi booking:
    - Flight/Bus/Train: giải phóng N ghế (is_booked=0)
    - Hotel: không cần giải phóng

  UPDATE bookings SET status='cancelled' WHERE booking_id IN (...)
```

---

## 17. Database — Mô hình dữ liệu chính

### Polymorphic Association (Bookings)

```sql
bookings (booking_id, user_id, status, total_price, final_amount, payment_method, ...)
booking_items (
  item_id, booking_id,
  entity_type,     -- 'flight' | 'hotel' | 'bus' | 'train'
  entity_id,       -- FK logic đến bảng tương ứng
  quantity, price, seat_class,
  check_in_date, check_out_date
)
```

### Các bảng chính

```
users              — user_id, email, password_hash, name, phone, role, membership_level
wallets            — wallet_id, user_id, balance
wallet_transactions — id, wallet_id, type, amount, description, created_at

destinations       — destination_id, city, country, image_url
flights            — flight_id, from_dest, to_dest, depart_time, arrive_time, base_price, airline
flight_seats       — seat_id, flight_id, seat_number, seat_class, is_booked
hotels             — hotel_id, name, destination_id, stars, amenities, allows_refund, avg_rating
room_types         — room_type_id, hotel_id, name, capacity, price_per_night, available_rooms, images
buses              — bus_id, from_dest, to_dest, depart_time, arrive_time, base_price
bus_seats          — seat_id, bus_id, seat_number, seat_class, is_booked
trains             — train_id, from_dest, to_dest, depart_time, arrive_time, base_price
train_seats        — seat_id, train_id, seat_number, seat_class, is_booked

bookings           — booking_id, user_id, status, total_price, discount_amount, final_amount
booking_items      — item_id, booking_id, entity_type, entity_id, quantity, price, seat_class, check_in_date, check_out_date
booking_modifications — mod_id, booking_id, type, status, old_price, new_price, refund_amount,
                        fee_amount, new_seat_class, new_entity_id, new_check_in, new_check_out, created_at

promotions         — promo_id, code, discount_percent, max_discount, min_order, entity_type, expiry_date, max_uses
promotion_usages   — id, promo_id, user_id, booking_id

reviews            — review_id, user_id, entity_type, entity_id, rating, comment, created_at
notifications      — id, user_id, title, message, is_read, created_at
interactions       — id, user_id, item_type, item_id, action, weight, created_at
banners            — banner_id, image_url, link, is_active, order_index
policies           — id, key, value  (min_hours_before, cancel_fee_rate, reschedule_fee_rate, ...)
```

---

## 18. Luồng người dùng end-to-end

### Luồng đặt vé máy bay

```
1. /flights → nhập điểm đi/đến/ngày → GET /api/flights
2. Click chuyến → FlightTicketModal → chọn hạng + số lượng
3. "Đặt vé" → bookingStore.set(...) → redirect /booking
4. /booking → điền thông tin → chọn promo (cần login) → POST /api/bookings
5. /payment → chọn Ví → POST /api/bookings/{id}/pay → confirmed
6. Sau chuyến: biến khỏi /profile/bookings, vẫn ở /profile/transactions
```

### Luồng đổi lịch

```
1. /profile/bookings/{id} → "Đổi lịch" → BookingModifyModal
2. Chọn hạng mới / chuyến mới
3. Preview: giá cũ / giá mới / chênh lệch / phí đổi
4. Xác nhận → POST /api/bookings/{id}/reschedule
5. Nếu đắt hơn → POST /pay-extra
   Nếu rẻ hơn → hoàn tiền ví ngay
6. Email xác nhận với đầy đủ thông tin ngày, giá, phí
```

### Luồng travel planner

```
1. /travel-planner → chọn phương tiện (máy bay / tàu / xe / tự lái)
2. Điền form ngân sách, sở thích, thời gian
3. POST /api/travel-planner/suggest → Gemini → 3-5 gợi ý
4. "Đặt vé {phương tiện}" → link đúng trang (/flights, /trains, /buses)
   "Xem khách sạn" → /hotels?destination_id=...&search={city}
```

### Luồng booking khách (guest)

```
1. Chưa login → vào /booking → Navbar/Footer/ChatBot bị ẩn
2. Điền contact_email
   - Nếu email chưa có tài khoản → booking bình thường
   - Nếu email đã có tài khoản → lỗi inline "Email đã có tài khoản, vui lòng đăng nhập"
3. Promo code disabled → hiện hint đăng nhập
4. /payment → thanh toán QR
```
