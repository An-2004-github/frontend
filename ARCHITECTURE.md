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

+## 1. Tổng quan kiến trúc

```
Người dùng (Browser)
        │
        ▼
┌─────────────────────────────────────┐
│  Next.js 16 Frontend (React 19)     │
│  - App Router (26 routes)           │
│  - Zustand (global state)           │
│  - Axios interceptors (JWT auto)    │
│  - Tailwind CSS + Inline styles     │
└─────────────┬───────────────────────┘
              │ HTTPS REST API
              ▼
┌─────────────────────────────────────┐
│  FastAPI Backend (Python)           │
│  - 18 routers                       │
│  - JWT (python-jose)                │
│  - SQLAlchemy (raw SQL + text())    │
│  - Asyncio background scheduler     │
└─────────────┬───────────────────────┘
              │ SQLAlchemy + PyMySQL
              ▼
┌─────────────────────────────────────┐
│  MySQL Database (DATN)              │
│  - ~30+ tables                      │
│  - Polymorphic bookings             │
└─────────────────────────────────────┘

Dịch vụ ngoài:
  - Google OAuth 2.0 (đăng nhập)
  - Google Gemini API (travel planner, chatbot)
  - Cloudinary (upload ảnh)
  - VietQR API (mã QR thanh toán)
```

**Điểm đặc biệt về kiến trúc:**
- Backend không dùng ORM model class — toàn bộ query viết bằng `text()` của SQLAlchemy (raw SQL).
- Frontend không có server-side rendering thực sự — toàn bộ là Client Components (`"use client"`), kể cả root layout.
- State xác thực lưu trong Zustand + `localStorage` (key `auth-storage`), Axios tự đọc token trước mỗi request.

---

## 2. Frontend — Cấu trúc thư mục

```
frontend/
├── app/                    # Next.js App Router — các trang
│   ├── layout.tsx          # Root layout: Navbar, Footer, ChatBot, GoogleOAuthProvider
│   ├── page.tsx            # Trang chủ
│   ├── (auth)/             # Route group: login, register, forgot-password
│   ├── flights/            # Tìm kiếm chuyến bay
│   ├── hotels/             # Tìm kiếm khách sạn (+ [hotel_id]/)
│   ├── buses/              # Tìm kiếm xe khách
│   ├── trains/             # Tìm kiếm tàu hỏa
│   ├── booking/            # Form đặt vé
│   ├── payment/[id]/       # Thanh toán booking
│   ├── invoice/[id]/       # Hóa đơn
│   ├── profile/            # Khu vực cá nhân (có layout riêng)
│   │   ├── layout.tsx      # Profile layout (sidebar)
│   │   ├── page.tsx        # Thông tin cá nhân
│   │   ├── bookings/       # Danh sách đặt chỗ (+ [booking_id]/)
│   │   ├── wallet/         # Ví điện tử
│   │   ├── transactions/   # Lịch sử giao dịch
│   │   ├── notifications/  # Thông báo
│   │   └── membership/     # Hạng thành viên
│   ├── travel-planner/     # Lập kế hoạch du lịch AI
│   ├── promotion/          # Khuyến mãi
│   └── admin/              # Quản trị
│
├── components/             # React components tái sử dụng
├── services/               # API service layer (gọi backend)
├── store/                  # Zustand state stores
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
├── lib/                    # axios instance, constants, utils
└── backend/                # FastAPI Python backend (cùng repo)
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
  ├── login(user, token)       — lưu vào store + localStorage tự động (persist)
  ├── logout()                 — xóa toàn bộ
  ├── updateUser(partial)      — cập nhật 1 phần thông tin user
  └── refreshWallet()          — gọi /api/auth/me để lấy số dư ví mới nhất
```

Store dùng middleware `persist` của Zustand → tự serialize vào `localStorage` với key `auth-storage`.

**`store/bookingStore.ts` — Trạng thái đặt vé**  
Lưu thông tin item đang được đặt (entity_type, entity_id, seat_class, v.v.) để truyền sang trang `/booking`.

**`store/paymentStore.ts` — Trạng thái thanh toán**  
Lưu booking_id và phương thức thanh toán đang xử lý.

### Axios Interceptor (`lib/axios.ts`)

Mỗi HTTP request tự động:
1. Đọc JWT token từ `localStorage` (key `auth-storage` → `state.token`)
2. Thêm header `Authorization: Bearer <token>`
3. Nếu response 401 → tự xóa token khỏi localStorage (tránh lặp lại lỗi)

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
Hiển thị: Hero banner, BannerSlider, DestinationsSection (top destinations), gợi ý recommendation từ ML nếu user đã login.

### Tìm kiếm dịch vụ

**`app/flights/page.tsx`**  
- Form tìm kiếm (điểm đi, điểm đến, ngày bay, hành khách, hạng ghế)
- Gọi `GET /api/flights?from=...&to=...&date=...`
- Hiển thị `FlightList` → `FlightCard`
- Click card → mở `FlightTicketModal` → chọn hạng ghế → redirect `/booking`

**`app/hotels/page.tsx`**  
- Hero search box + Popular destinations + Filter sidebar
- Auto-search khi có URL params `?search=...&destination_id=...` (từ travel planner)
- Filter: giá/đêm, đánh giá, tiện nghi, hoàn tiền
- Gọi `GET /api/hotels?search=...`

**`app/buses/page.tsx`** và **`app/trains/page.tsx`**  
Tương tự flights — form tìm kiếm, list kết quả, modal chọn ghế.

### Đặt vé (`app/booking/page.tsx`)
- Đọc state từ `bookingStore` (entity_type, entity_id, seat_class, price...)
- Form điền thông tin hành khách
- Chọn mã khuyến mãi (gọi `POST /api/promotions/apply`)
- Submit → `POST /api/bookings` → nhận `booking_id` → redirect `/payment/{booking_id}`

### Thanh toán (`app/payment/[booking_id]/page.tsx`)
- Hiển thị tóm tắt booking
- Chọn phương thức: Ví nội bộ / QR Banking
- Ví nội bộ: `POST /api/bookings/{id}/pay`
- QR Banking: hiển thị mã QR VietQR, polling kiểm tra trạng thái

### Profile — Đặt chỗ (`app/profile/bookings/`)
- `page.tsx`: danh sách booking (tab theo loại, filter). Gọi `GET /api/bookings/my` (chỉ hiện booking còn hiệu lực)
- `[booking_id]/page.tsx`: chi tiết booking + nút đổi lịch/hủy + lịch sử thay đổi

### Profile — Giao dịch (`app/profile/transactions/page.tsx`)
Gọi `GET /api/bookings/history` — hiển thị **tất cả** booking kể cả đã hết hạn.

### Travel Planner (`app/travel-planner/page.tsx`)
- Form nhập sở thích: ngân sách, thời gian, phong cách du lịch, phương tiện ưu tiên
- Gọi `POST /api/travel-planner/suggest` → Gemini AI trả về gợi ý địa điểm JSON
- Hiển thị trending destinations từ `GET /api/travel-planner/trending`
- Nút "Xem khách sạn" → link đến `/hotels?destination_id=...&search=...`

---

## 5. Frontend — Components

### Layout
- **`Navbar.tsx`**: Navigation bar, hiển thị/ẩn menu dựa vào `isAuthenticated`, dropdown profile
- **`Footer.tsx`**: Footer chuẩn

### Booking Components
- **`BookingForm.tsx`**: Form điền thông tin hành khách, số lượng, ghi chú
- **`BookingModifyModal.tsx`**: Modal đổi lịch/hủy booking — 4 bước:
  1. Chọn hành động (đổi lịch / hủy)
  2. Chọn tùy chọn mới (chuyến mới / hạng ghế mới / phòng mới)
  3. Preview chênh lệch tiền và phí
  4. Xác nhận với breakdown: giá cũ / giá mới / chênh lệch / phí đổi
- **`BookingSuggestions.tsx`**: Gợi ý đặt thêm sau khi booking thành công

### Transport Components
- **`FlightCard.tsx`**, **`BusCard.tsx`**, **`TrainCard.tsx`**: Card hiển thị thông tin chuyến
- **`FlightTicketModal.tsx`**, **`BusTicketModal.tsx`**, **`TrainTicketModal.tsx`**: Modal chọn hạng ghế, số lượng, hiển thị giá

### Hotel Components
- **`HotelCard.tsx`**: Card khách sạn với ảnh, rating, giá từ, tiện nghi
- **`HotelList.tsx`**: Grid khách sạn

### UI Components
- **`DestinationInput.tsx`**: Input với autocomplete địa điểm (gọi `/api/destinations/search`)
- **`modal.tsx`**: Modal wrapper có backdrop
- **`card.tsx`**, **`button.tsx`**, **`input.tsx`**: UI primitives

### Tiện ích
- **`ChatBot.tsx`**: Chatbot nổi góc dưới phải, gọi `/api/chat`
- **`CloudinaryUpload.tsx`**: Upload ảnh lên Cloudinary
- **`BannerSlider.tsx`**: Slider banner trang chủ
- **`DestinationsSection.tsx`**: Grid điểm đến nổi bật

---

## 6. Frontend — Services & API Layer

Mỗi service là một object với các async function gọi `axiosInstance`:

```
services/
├── authService.ts      — login, register, loginGoogle, forgotPassword, resetPassword
├── flightService.ts    — searchFlights, getFlightById, getClasses
├── hotelService.ts     — getHotels, getHotelById
├── busService.ts       — searchBuses, getBusById
├── trainService.ts     — searchTrains, getTrainById
├── bookingService.ts   — createBooking, getMyBookings, cancelBooking
├── promotionService.ts — getPromotions, applyPromotion
├── reviewService.ts    — getReviews, submitReview
├── invoiceService.ts   — getInvoice
├── searchService.ts    — globalSearch
├── imageService.ts     — uploadImage (Cloudinary)
└── detinationService.ts — getDestinations (typo trong tên file)
```

Tất cả service đều dùng `axiosInstance` từ `lib/axios.ts` — token JWT được tự động đính kèm.

---

## 7. Backend — Cấu trúc & Khởi động

**Entry point: `backend/main.py`**

Khi `uvicorn main:app --reload` chạy:

1. Load biến môi trường từ `.env`
2. Khởi tạo FastAPI app
3. Cấu hình CORS (cho phép `localhost:3000` và `vivuvuive.io.vn`)
4. `lifespan` context manager:
   - Load ML model NCF (nếu PyTorch đã cài và model đã train)
   - Khởi động `booking_expire_loop` background task (asyncio)
5. Register 18 routers

**Kết nối database (`backend/database.py`)**  
SQLAlchemy engine kết nối MySQL:
```
mysql+pymysql://root:123456@localhost/DATN
```
Toàn bộ backend dùng `engine.begin()` (transaction) và `text()` để viết raw SQL — không dùng ORM models.

---

## 8. Backend — Xác thực (JWT)

**`backend/auth.py`**

| Hàm | Mô tả |
|-----|-------|
| `hash_password(pw)` | Bcrypt hash mật khẩu |
| `verify_password(plain, hashed)` | Kiểm tra mật khẩu |
| `create_access_token(data)` | Tạo JWT với expire 7 ngày, HS256 |
| `get_current_user(token)` | Dependency — decode JWT, trả `user_id`. Raise 401 nếu invalid |
| `get_optional_user(token)` | Như trên nhưng trả `None` thay vì 401 (dùng cho endpoint public) |

**Luồng đăng nhập:**
```
POST /api/auth/login
  → verify_password
  → create_access_token({"user_id": user.id})
  → trả về {access_token, user}

Mỗi request tiếp theo:
  Header: Authorization: Bearer <token>
  → get_current_user dependency decode JWT → trả user_id
```

**Đăng nhập Google (`routers/auth_google.py`)**  
- Nhận `google_token` từ frontend (Google OAuth flow)
- Verify với Google API
- Nếu email chưa có → tạo account mới
- Tạo JWT nội bộ → trả về giống login thường

---

## 9. Backend — Các Router

### `routers/flights.py`
- `GET /api/flights` — tìm kiếm theo `from`, `to`, `date`, `seat_class`, `passengers`
- `GET /api/flights/{id}` — chi tiết chuyến bay
- `GET /api/flights/{id}/classes` — các hạng ghế còn trống và giá

Dữ liệu: bảng `flights`, `flight_seats`, `airports`, `destinations`.  
Ghế được tính theo `seat_class` (economy/business/first) với multiplier:
```
economy: 1.0x  |  business: 1.8x  |  first: 2.5x
```

### `routers/hotels.py`
- `GET /api/hotels` — tìm kiếm với filter: `search`, `destination_id`, `min_price`, `max_price`, `sort`, `min_guests`
- `GET /api/hotels/{id}` — chi tiết khách sạn (kèm room types, ảnh, reviews)
- `GET /api/hotels/{id}/reschedule-options` — phòng trống cho ngày mới khi đổi lịch

Giá phòng = `price_per_night * nights * quantity * 1.21` (bao gồm thuế/phí).

### `routers/buses.py` và `routers/trains.py`
Tương tự flights. Ghế bus có `standard/vip/sleeper` (multiplier 1.0/1.4/1.6).

### `routers/bookings.py` (file lớn nhất — ~119KB)

File trung tâm của hệ thống. Xem chi tiết ở phần [10](#10-backend--luồng-đặt-vé-chi-tiết) và [11](#11-backend--đổi-lịch--hủy-booking).

Các endpoint chính:
```
POST   /api/bookings                    — Tạo booking mới
POST   /api/bookings/{id}/pay           — Thanh toán
GET    /api/bookings/my                 — Booking đang hiệu lực (có filter service-ended)
GET    /api/bookings/history            — Toàn bộ booking (không filter)
GET    /api/bookings/{id}               — Chi tiết booking + lịch sử thay đổi
GET    /api/bookings/{id}/class-options — Hạng ghế có thể đổi sang
GET    /api/bookings/{id}/reschedule-options — Lịch/phòng có thể đổi sang
POST   /api/bookings/{id}/reschedule    — Đổi lịch
POST   /api/bookings/{id}/cancel        — Hủy booking
GET    /api/bookings/{id}/cancel/preview — Xem trước hoàn tiền nếu hủy
POST   /api/bookings/{id}/pay-extra     — Thanh toán chênh lệch khi đổi lịch đắt hơn
```

### `routers/wallet.py`
```
GET  /api/wallet          — Số dư ví
POST /api/wallet/deposit  — Nạp tiền (tạo giao dịch pending + QR)
POST /api/wallet/withdraw — Rút tiền
GET  /api/wallet/transactions — Lịch sử giao dịch ví
```

### `routers/promotions.py`
```
GET  /api/promotions        — Danh sách mã khuyến mãi
POST /api/promotions/apply  — Áp dụng mã, trả về discount_amount
```

Kiểm tra: mã có tồn tại, còn hạn, chưa dùng hết, áp dụng cho entity_type phù hợp, user chưa dùng mã này.

### `routers/reviews.py`
Chỉ cho phép review sau khi booking `completed`. Lưu rating + comment, cập nhật `avg_rating` của entity.

### `routers/admin.py` (~80KB)
Quản lý toàn bộ dữ liệu: thêm/sửa/xóa chuyến bay, khách sạn, xe khách, tàu hỏa; quản lý người dùng, booking, promotions; thống kê doanh thu.

### `routers/recommendations.py`
```
GET /api/recommendations         — Top gợi ý cho user đang login (NCF model)
GET /api/recommendations/popular — Gợi ý phổ biến (không cần login)
```

### `routers/travel_planner.py`
```
POST /api/travel-planner/suggest  — Gợi ý địa điểm bằng Gemini AI
GET  /api/travel-planner/trending — Top điểm đến xu hướng (tính từ booking + interaction)
POST /api/travel-planner/feedback — Lưu phản hồi về gợi ý
```

### `routers/chat.py`
```
POST /api/chat  — Chatbot du lịch, dùng Gemini API, có context lịch sử chat
```

### `routers/interactions.py`
```
POST /api/interactions/log  — Ghi lại hành động user (view, search, click)
```
Dùng để feed data cho ML model.

### `routers/notifications.py`
```
GET  /api/notifications         — Danh sách thông báo
PUT  /api/notifications/{id}/read — Đánh dấu đã đọc
```

---

## 10. Backend — Luồng đặt vé chi tiết

### Bước 1: Tạo booking (`POST /api/bookings`)

```
Request: {
  entity_type: "flight" | "hotel" | "bus" | "train",
  entity_id: number,
  seat_class: string,        // flight/bus/train
  quantity: number,
  check_in_date: string,     // hotel
  check_out_date: string,    // hotel
  contact_name: string,
  contact_phone: string,
  promo_code?: string
}

Xử lý:
1. Tính giá:
   - Flight/Bus/Train: base_price * class_multiplier * quantity
   - Hotel: price_per_night * nights * quantity * 1.21
2. Áp dụng promo nếu có (giảm từ total_price)
3. INSERT bookings (status='pending')
4. INSERT booking_items
5. Giữ ghế (UPDATE flight_seats/bus_seats/train_seats SET is_booked=1)
   - Dùng SELECT ... FOR UPDATE để tránh race condition
6. Gửi notification cho user

Response: {booking_id, total_price, final_amount, ...}
```

**Booking tự động hủy sau 15 phút nếu không thanh toán** (xem phần 16).

### Bước 2: Thanh toán (`POST /api/bookings/{id}/pay`)

```
Request: {
  payment_method: "wallet" | "bank"
}

Xử lý (trong transaction):
1. Kiểm tra booking tồn tại và status='pending'
2. Kiểm tra user sở hữu booking
3. Nếu wallet: kiểm tra số dư đủ, trừ tiền từ wallet
4. UPDATE bookings SET status='confirmed'
5. INSERT wallet_transactions (loại 'payment')
6. Gửi notification "Đặt vé thành công"
```

### Hiển thị booking

**`GET /api/bookings/my`** — Dùng cho trang "Đặt chỗ của tôi":
- Loại booking đã hết hạn dịch vụ (hotel: `check_out_date < CURDATE()`, transport: arrive_time đã qua)
- **Ngoại lệ**: vẫn hiển thị nếu có refund đang chờ duyệt (`booking_modifications` có status=`pending` và `refund_amount > 0`)

**`GET /api/bookings/history`** — Dùng cho trang "Giao dịch":
- Trả về **tất cả** booking không lọc, kèm entity_name, check_in/out date

---

## 11. Backend — Đổi lịch & Hủy booking

### Kiểm tra thời gian (`_check_transport_time`)

Với transport (flight/bus/train), trước khi cho phép đổi/hủy:
1. Lấy `depart_time` của chuyến
2. Tính `hours_left = (depart_time - now) / 3600`
3. Nếu `hours_left < 0` → chuyến đã qua, từ chối
4. Đọc policy từ bảng `policies` (key `min_hours_before`)
5. Nếu `hours_left < min_hours` → từ chối với thông báo thời gian tối thiểu

### Đổi lịch (`POST /api/bookings/{id}/reschedule`)

```
Các trường hợp:
A. Cùng entity, đổi hạng ghế (flight/bus):
   - Tính giá mới: economy_base = old_price / old_multiplier
                   new_price = economy_base * new_multiplier
   - Tính diff = new_price - old_price
   - Tính fee = diff > 0 ? diff * reschedule_fee_rate : 0
   - Nếu diff > 0: tạo booking_modification với status='pending_payment'
                   user phải gọi /pay-extra
   - Nếu diff <= 0: hoàn tiền vào ví, tạo modification với refund_amount

B. Đổi sang entity mới (chuyến khác / phòng khác):
   - _transfer_seats(): giải phóng ghế cũ, giữ ghế mới
   - Tính diff và fee tương tự
   - UPDATE booking_items với entity mới, giá mới
```

**Hoàn tiền khi downgrade** (ví dụ từ business → economy):
- `economy_base = old_price / 1.8` (normalize về economy)
- `new_price = economy_base * 1.0` (áp multiplier mới)
- `diff = new_price - old_price` → âm → hoàn tiền `|diff|` vào ví

### Hủy booking (`POST /api/bookings/{id}/cancel`)

```
Xử lý:
1. Kiểm tra thời gian (transport) hoặc ngày check-in (hotel)
2. Đọc cancel_fee_rate từ policies
3. Tính refund = final_amount * (1 - cancel_fee_rate)
4. UPDATE bookings SET status='cancelled'
5. Giải phóng ghế (flight/bus/train)
6. Nếu đã thanh toán: INSERT wallet_transactions (refund)
7. INSERT booking_modifications (type='cancel', refund_amount=refund)
8. Gửi notification
```

### Lịch sử thay đổi

Bảng `booking_modifications`:
```sql
mod_id, booking_id, type (reschedule/cancel), status,
old_price, new_price, refund_amount, fee_amount,
new_seat_class, new_entity_id, new_check_in, new_check_out,
bank_info, created_at, approved_at
```

Hiển thị trong `app/profile/bookings/[booking_id]/page.tsx` dưới dạng timeline.

---

## 12. Backend — Ví điện tử & Thanh toán

### Bảng dữ liệu
- `wallets`: `wallet_id`, `user_id`, `balance`
- `wallet_transactions`: `id`, `wallet_id`, `type` (deposit/payment/refund/withdraw), `amount`, `description`, `created_at`

### Nạp tiền (Deposit)
1. Tạo `wallet_transactions` với `status='pending'`
2. Tạo mã QR VietQR với nội dung `VIVU-{transaction_id}`
3. Frontend polling kiểm tra trạng thái
4. Khi xác nhận (manual hoặc webhook): cộng tiền vào `wallets.balance`

### Thanh toán booking
```
wallet.balance -= booking.final_amount
wallet_transactions INSERT (type='payment', amount=-final_amount)
bookings.status = 'confirmed'
```

### Hoàn tiền (Refund)
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
  GMF embeddings    MLP embeddings
  (32-dim)          (32-dim each)
       ↓                ↓
  element-wise *   concat → Linear layers [64→32→16]
                   + BatchNorm + ReLU + Dropout(0.2)
       ↓                ↓
  GMF_out (32)     MLP_out (16)
           ↓
       concat (48)
           ↓
    Linear(48→1)
           ↓
        Sigmoid
           ↓
    Score [0, 1]
```

### Training (`backend/ml/train.py`)
- Input: `interactions` table (user_id, item_type, item_id, weight)
- Negative sampling: lấy ngẫu nhiên items user chưa tương tác
- Loss: Binary Cross Entropy
- Lưu model vào `ml/saved/ncf_best.pt`

### Inference (`backend/ml/recommend.py`)
- Load model từ file `.pt`
- Với user_id đã biết: tính score cho tất cả items → sort → top-K
- Với user mới (cold start): fallback về popular items

### Tracking tương tác (`routers/interactions.py`)
Mỗi khi user view/search/click một entity:
```
POST /api/interactions/log {entity_type, entity_id, action}
→ INSERT interactions (user_id, item_type, item_id, action, weight)
```
Dữ liệu này dùng để retrain NCF model.

---

## 14. Backend — Travel Planner (Gemini AI)

### `POST /api/travel-planner/suggest`

```
Request: {
  budget: "under5m" | "5to10m" | "10to20m" | "over20m",
  interests: string[],
  transport: "flight" | "bus" | "self_drive" | "any",
  duration: "short" | "medium" | "long",
  people: number,
  from_city?: string
}

Xử lý:
1. Build prompt có cấu trúc gửi lên Gemini API
2. Yêu cầu trả JSON array với các fields:
   {city, tagline, why_match, highlights, budget_note,
    transport_tip, itinerary, match_score}
3. Parse JSON response
4. Enrich với data thực từ DB (destination_id, min_price, avg_rating, image_url)
5. Trả về cho frontend
```

### `GET /api/travel-planner/trending`
Tính điểm xu hướng từ:
- `booking_score`: số booking trong 30 ngày gần đây
- `interact_score`: số tương tác (view/search/click)
- `trend_score` = booking_score * 0.6 + interact_score * 0.4

---

## 15. Backend — Chatbot

### `POST /api/chat`

```python
Request: {messages: [{role, content}]}  # Toàn bộ lịch sử chat
```

- Gọi Gemini API với system prompt hướng đến tư vấn du lịch Việt Nam
- Trả về `{reply: string}`
- Frontend `ChatBot.tsx` lưu history trong component state, gửi toàn bộ history mỗi lần

---

## 16. Backend — Booking Expiry Scheduler

**`backend/booking_expire.py`**

Chạy song song với server dưới dạng asyncio task:

```
Mỗi 60 giây:
  SELECT booking_id, entity_type, entity_id, quantity
  FROM bookings JOIN booking_items
  WHERE status='pending' AND booking_date < NOW() - INTERVAL 15 MINUTE

  Với mỗi booking:
    - Flight: giải phóng N ghế đầu tiên (is_booked=0) trong flight_seats
    - Bus: tương tự bus_seats
    - Train: tương tự train_seats
    - Hotel: không cần giải phóng (phòng không bị hold)

  UPDATE bookings SET status='cancelled' WHERE booking_id IN (...)
```

Đảm bảo ghế được giải phóng để user khác có thể đặt.

---

## 17. Database — Mô hình dữ liệu chính

### Polymorphic Association (Bookings)

Thay vì có bảng `flight_bookings`, `hotel_bookings` riêng, hệ thống dùng **polymorphic association**:

```sql
bookings (booking_id, user_id, status, total_price, final_amount, ...)
booking_items (
  item_id,
  booking_id,         -- FK → bookings
  entity_type,        -- 'flight' | 'hotel' | 'bus' | 'train'
  entity_id,          -- FK logic đến bảng tương ứng
  quantity,
  price,
  seat_class,
  check_in_date,
  check_out_date
)
```

Ưu điểm: một hệ thống booking cho tất cả loại dịch vụ, dễ mở rộng.  
Nhược điểm: không có foreign key constraint thực sự cho entity_id.

### Các bảng chính

```
users              — user_id, email, password_hash, name, phone, wallet_balance, role, membership_level
wallets            — wallet_id, user_id, balance
wallet_transactions — id, wallet_id, type, amount, description, created_at

destinations       — destination_id, city, country, image_url
flights            — flight_id, from_dest, to_dest, depart_time, arrive_time, base_price, airline
flight_seats       — seat_id, flight_id, seat_number, seat_class, is_booked
hotels             — hotel_id, name, destination_id, stars, amenities, allows_refund, avg_rating
room_types         — room_type_id, hotel_id, name, capacity, price_per_night, images
buses              — bus_id, from_dest, to_dest, depart_time, arrive_time, base_price
bus_seats          — seat_id, bus_id, seat_number, seat_class, is_booked
trains             — train_id, from_dest, to_dest, depart_time, arrive_time, base_price
train_seats        — seat_id, train_id, seat_number, seat_class, is_booked

bookings           — booking_id, user_id, status, total_price, discount_amount, final_amount, payment_method
booking_items      — item_id, booking_id, entity_type, entity_id, quantity, price, seat_class, check_in_date, check_out_date
booking_modifications — mod_id, booking_id, type, status, old_price, new_price, refund_amount, fee_amount, new_seat_class, created_at

promotions         — promo_id, code, discount_percent, max_discount, min_order, entity_type, expiry_date, max_uses
promotion_usages   — id, promo_id, user_id, booking_id

reviews            — review_id, user_id, entity_type, entity_id, rating, comment, created_at
notifications      — id, user_id, title, message, is_read, created_at
interactions       — id, user_id, item_type, item_id, action, weight, created_at
banners            — banner_id, image_url, link, is_active, order_index
policies           — id, key, value (ví dụ: min_hours_before=2, cancel_fee_rate=0.1)
```

---

## 18. Luồng người dùng end-to-end

### Luồng đặt vé máy bay

```
1. User vào /flights, nhập điểm đi/đến/ngày
   → GET /api/flights?from=...&to=...&date=...
   → FlightList hiện danh sách chuyến

2. Click chuyến bay
   → FlightTicketModal hiện hạng ghế + giá
   → User chọn hạng, số lượng
   → GET /api/flights/{id}/classes (kiểm tra ghế còn)

3. Click "Đặt vé"
   → bookingStore.set({entity_type:'flight', entity_id, seat_class, price, quantity})
   → redirect /booking

4. Trang /booking:
   → Điền thông tin hành khách
   → Chọn mã khuyến mãi (tùy chọn)
   → POST /api/bookings
   → Nhận booking_id, status='pending'
   → redirect /payment/{booking_id}

5. Trang /payment:
   → Chọn "Ví nội bộ"
   → POST /api/bookings/{id}/pay {payment_method:'wallet'}
   → Backend: trừ ví, status='confirmed'
   → Hiện màn hình thành công + link xem chi tiết

6. Sau chuyến bay (service ended):
   → Booking biến khỏi /profile/bookings (GET /api/bookings/my lọc ra)
   → Vẫn hiện ở /profile/transactions (GET /api/bookings/history)
   → User có thể để lại review
```

### Luồng đổi lịch bay

```
1. Vào /profile/bookings/{id}
   → Trang hiển thị booking detail
   → Nút "Đổi lịch" khả dụng nếu còn đủ thời gian (hours_left >= min_hours)

2. Click "Đổi lịch" → BookingModifyModal
   → GET /api/bookings/{id}/class-options → list hạng ghế có thể đổi
   → User chọn hạng mới

3. Preview (Step 3 của modal)
   → GET /api/bookings/{id}/reschedule (dry-run hoặc preview endpoint)
   → Hiện: Giá cũ / Giá mới / Chênh lệch / Phí đổi lịch

4. Xác nhận
   → POST /api/bookings/{id}/reschedule {new_seat_class, ...}
   → Nếu giá mới > giá cũ: POST /api/bookings/{id}/pay-extra
   → Nếu giá mới < giá cũ: hoàn tiền vào ví ngay lập tức

5. Lịch sử thay đổi hiển thị trong trang chi tiết booking
```

### Luồng travel planner

```
1. User vào /travel-planner
   → Xem trending destinations (GET /api/travel-planner/trending)

2. Điền form: ngân sách, sở thích, thời gian, phương tiện

3. Click "Lên kế hoạch"
   → POST /api/travel-planner/suggest
   → Backend build prompt → Gemini API → parse JSON → enrich từ DB
   → Hiện 3-5 gợi ý địa điểm với match score

4. Click "Xem khách sạn tại [city]"
   → Link đến /hotels?destination_id=...&search=[city]
   → Hotels page auto-trigger search (useEffect[searchParams])
   → Hiện danh sách khách sạn tại điểm đến được gợi ý
```
