# Bảo mật Website — Hệ thống Đặt vé Du lịch VIVU

## 1. Tổng quan

Hệ thống triển khai bảo mật theo mô hình nhiều lớp, tập trung vào bốn trụ cột chính: xác thực danh tính người dùng (Authentication), phân quyền truy cập (Authorization), bảo vệ tính toàn vẹn dữ liệu tài chính, và phòng chống các lỗ hổng phổ biến theo chuẩn OWASP. Backend xây dựng bằng FastAPI (Python), frontend bằng Next.js, cơ sở dữ liệu MySQL.

---

## 2. Xác thực — JSON Web Token (JWT)

Hệ thống sử dụng **JWT (JSON Web Token)** theo chuẩn RFC 7519 làm cơ chế xác thực stateless. Khi người dùng đăng nhập thành công, server tạo một token gồm ba phần: header chứa thuật toán ký (`HS256`), payload chứa `user_id` và thời hạn hết hạn (`exp`), và chữ ký số được tạo bằng `SECRET_KEY` lấy từ biến môi trường.

```python
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-key")
ALGORITHM  = "HS256"
EXPIRE     = 60 * 24 * 7  # 7 ngày

def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(minutes=EXPIRE)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

Mỗi request đến endpoint được bảo vệ đều phải gửi kèm token trong header `Authorization: Bearer <token>`. Server giải mã token, kiểm tra chữ ký và thời hạn — nếu hợp lệ mới trả về `user_id` để xử lý tiếp. Nếu token bị giả mạo, thay đổi nội dung hoặc đã hết hạn, server trả về lỗi 401. Thiết kế stateless nghĩa là server không cần lưu session, phù hợp với kiến trúc microservice và dễ mở rộng theo chiều ngang.

---

## 3. Mã hóa Mật khẩu — Bcrypt

Mật khẩu người dùng không bao giờ được lưu dưới dạng plaintext. Hệ thống sử dụng thuật toán **bcrypt** thông qua thư viện `passlib`, với cơ chế tự động sinh salt ngẫu nhiên cho mỗi mật khẩu trước khi hash.

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

Bcrypt được thiết kế chậm có chủ ý (work factor), khiến tấn công brute-force hoặc dictionary attack trở nên tốn kém về mặt tính toán ngay cả khi kẻ tấn công lấy được database. Mỗi hash bcrypt bao gồm salt ngẫu nhiên 16 byte nên hai người dùng có cùng mật khẩu sẽ cho ra hai hash hoàn toàn khác nhau, triệt tiêu tấn công rainbow table.

---

## 4. Phân quyền — Role-based Access Control (RBAC)

Hệ thống phân chia hai vai trò: `USER` (người dùng thông thường) và `ADMIN`. Mỗi endpoint nhạy cảm đều khai báo dependency rõ ràng:

- `Depends(get_current_user)` — yêu cầu đăng nhập, trả về `user_id`
- `Depends(get_admin_user)` — yêu cầu đăng nhập **và** kiểm tra role = ADMIN trong database

```python
def get_admin_user(user_id: int = Depends(get_current_user)):
    with engine.connect() as conn:
        user = conn.execute(
            text("SELECT role FROM users WHERE user_id = :uid"),
            {"uid": user_id}
        ).fetchone()
        if not user or dict(user._mapping).get("role") != "ADMIN":
            raise HTTPException(403, "Không có quyền truy cập")
    return user_id
```

Phân quyền được thực thi tại tầng API, không phụ thuộc vào frontend. Ngay cả khi ai đó biết URL của endpoint admin và có JWT hợp lệ của một user thường, họ vẫn nhận được lỗi 403. Mọi thao tác quản trị (duyệt rút tiền, chỉnh sửa khách sạn, quản lý chuyến bay) đều nằm sau lớp kiểm tra này.

---

## 5. Ngăn chặn SQL Injection

Toàn bộ truy vấn database sử dụng **parameterized queries** của SQLAlchemy — không có bất kỳ chuỗi SQL nào được ghép trực tiếp từ input người dùng:

```python
# ĐÚ NG — input được truyền qua tham số
user = conn.execute(
    text("SELECT * FROM users WHERE email = :email"),
    {"email": user_input}
).fetchone()

# SAI (không dùng trong hệ thống) — dễ bị injection
query = f"SELECT * FROM users WHERE email = '{user_input}'"
```

SQLAlchemy xử lý tham số bằng cách escape hoặc truyền qua prepared statement, khiến mọi ký tự đặc biệt như `'`, `--`, `;`, `UNION` trong input người dùng đều được xử lý như dữ liệu thuần túy, không phải lệnh SQL. Ngay cả ở những đoạn có ghép chuỗi động (ví dụ điều kiện WHERE cho tìm kiếm), phần nội dung user input luôn đi qua tham số `:param`, chỉ có cấu trúc câu lệnh được ghép hardcoded.

---

## 6. Bảo vệ Giao dịch Tài chính — SELECT FOR UPDATE

Đây là một trong những điểm bảo mật quan trọng nhất của hệ thống. Khi nhiều người dùng thực hiện giao dịch cùng lúc (đặt vé, thanh toán, rút tiền), hệ thống sử dụng **SELECT FOR UPDATE** của MySQL để ngăn chặn race condition.

```python
with engine.begin() as conn:  # Transaction ACID
    # Khóa dòng ghế trước khi kiểm tra
    avail = conn.execute(text("""
        SELECT COUNT(*) FROM flight_seats
        WHERE flight_id = :fid AND seat_class = :cls AND is_booked = 0
        FOR UPDATE
    """), {"fid": flight_id, "cls": seat_class}).scalar()

    if avail < quantity:
        raise HTTPException(400, "Không đủ ghế trống")

    # Thực hiện đặt ghế — an toàn vì đã giữ lock
    conn.execute(text("""
        UPDATE flight_seats SET is_booked = 1 ...
    """))
```

`FOR UPDATE` yêu cầu MySQL giữ khóa hàng (row-level lock) cho đến khi transaction kết thúc. Nếu hai request đến đồng thời, request thứ hai sẽ bị block ở bước `SELECT FOR UPDATE` cho đến khi request thứ nhất commit hoặc rollback — đảm bảo không bao giờ có hai người cùng đặt một ghế. Cơ chế này được áp dụng nhất quán cho: ghế máy bay, ghế xe khách, ghế tàu hỏa, phòng khách sạn, thanh toán ví, và duyệt yêu cầu rút tiền.

---

## 7. Xác thực Dữ liệu Đầu vào — Pydantic

Mọi request body đều được khai báo bằng **Pydantic model**, tự động validate kiểu dữ liệu và cấu trúc trước khi logic nghiệp vụ được thực thi:

```python
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr   # Pydantic kiểm tra định dạng email
    password: str

class BookingRequest(BaseModel):
    entity_type: str
    entity_id:   int
    total_price: float
    final_price: float | None = None
    promo_id:    int | None = None
```

`EmailStr` tự động từ chối các chuỗi không phải email hợp lệ. Các trường `int`, `float` từ chối chuỗi văn bản. Nếu request gửi sai cấu trúc, FastAPI trả về 422 Unprocessable Entity ngay từ tầng validation mà không chạm đến logic ứng dụng. Ngoài ra, các giá trị nghiệp vụ (role, entity_type, booking status) được kiểm tra whitelist thủ công trước khi đưa vào database.

---

## 8. Xác thực Giá từ Server — Chống gian lận Frontend

Một lớp bảo vệ quan trọng là hệ thống **không tin vào giá tiền do frontend gửi lên** cho các tính toán quan trọng. Khi thanh toán hoặc đổi lịch, server tự tính lại giá từ database và so sánh:

```python
# Khi submit đổi lịch — verify giá từ DB, không dùng data.new_price trực tiếp
old_price = float(dict(booking._mapping)["final_amount"])  # Lấy từ DB

# Tính giá mới theo bảng nhân hạng ghế cũng từ DB
actual_new_price = base_price * multiplier * quantity

if abs(actual_new_price - data.new_price) > 1:  # Sai lệch > 1đ
    raise HTTPException(400, "Giá không hợp lệ")
```

Điều này ngăn người dùng tự ý sửa giá trong DevTools hoặc qua Postman để trả ít hơn thực tế.

---

## 9. Cấu hình CORS

Backend cấu hình Cross-Origin Resource Sharing (CORS) với danh sách domain cho phép tường minh, không dùng wildcard `*`:

```python
origins = [
    "http://localhost:3000",
    "https://vivuvuive.io.vn",
    "https://www.vivuvuive.io.vn",
]
app.add_middleware(CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Chỉ các domain trong danh sách mới được phép gửi request có `credentials` (cookie, Authorization header). Trình duyệt sẽ tự động chặn request từ các origin không được phép, bảo vệ người dùng khỏi tấn công CSRF từ website độc hại.

---

## 10. Xác thực OTP cho Đổi thông tin nhạy cảm

Trước khi cho phép đổi email, số điện thoại hoặc mật khẩu, hệ thống gửi mã OTP 6 chữ số về địa chỉ email hiện tại của người dùng. OTP có thời hạn 10 phút và chỉ dùng được một lần. Luồng này ngăn kẻ tấn công chiếm quyền tài khoản chỉ bằng cách biết mật khẩu, vì họ cũng cần kiểm soát hộp thư email.

---

## 11. Bảo mật Đăng nhập Google OAuth

Ngoài đăng nhập thông thường, hệ thống hỗ trợ đăng nhập qua Google. Khi nhận `id_token` từ frontend, server **xác minh token với Google API** thay vì tin trực tiếp vào dữ liệu frontend gửi lên:

```python
id_info = id_token.verify_oauth2_token(
    token, google_requests.Request(), GOOGLE_CLIENT_ID
)
email = id_info["email"]  # Lấy từ token đã xác minh, không từ request
```

Điều này đảm bảo không ai có thể tự xưng là một tài khoản Google tùy ý bằng cách giả mạo request.

---

## 12. Hạn chế và Định hướng Cải thiện

Hệ thống hiện tại phù hợp với môi trường học thuật và demo, tuy nhiên trước khi triển khai production quy mô lớn cần bổ sung một số cơ chế:

**Rate Limiting và chống Brute-force:** Hiện tại chưa có giới hạn số lần gọi API trên mỗi IP hoặc tài khoản. Endpoint đăng nhập và OTP có thể bị tấn công thử mật khẩu lặp đi lặp lại. Giải pháp là tích hợp middleware như `slowapi` hoặc dùng Nginx rate limiting ở tầng reverse proxy.

**Lưu trữ OTP:** OTP hiện lưu trong bộ nhớ RAM của tiến trình Python (`dict`). Nếu server restart, tất cả OTP đang chờ sẽ bị mất. Môi trường production nên chuyển sang Redis để lưu OTP với TTL tự động.

**Audit Log:** Chưa có nhật ký ghi lại các thao tác nhạy cảm như đổi mật khẩu, rút tiền, hoặc thay đổi role. Audit log là yêu cầu bắt buộc trong các hệ thống tài chính để phục vụ điều tra sự cố.

**Xác minh Webhook Sepay:** Endpoint nhận webhook từ cổng thanh toán Sepay chưa kiểm tra chữ ký HMAC của request. Cần thêm bước verify header `X-Signature` để đảm bảo chỉ Sepay mới có thể trigger nạp tiền, không phải bất kỳ ai biết URL endpoint.

**Thông tin Cấu hình:** Các thông tin như credentials database, API key nên được quản lý hoàn toàn qua biến môi trường và không commit vào repository. File `.env` phải được thêm vào `.gitignore`.
