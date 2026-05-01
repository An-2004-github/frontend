# VIVU Travel — Câu hỏi & trả lời bảo vệ đồ án

---

## PHẦN 1 — Kiến trúc tổng thể

**Q1: Tại sao chọn Next.js thay vì React thuần hoặc Vue?**

Next.js cung cấp App Router tổ chức route theo thư mục, code-splitting tự động, và `loading.tsx` / `error.tsx` per-route không cần cấu hình. Dự án có ~31 route nên dễ bảo trì hơn React Router. Ngoài ra `Image` component tối ưu ảnh — quan trọng vì hệ thống hiển thị nhiều ảnh khách sạn, điểm đến.

*GS hỏi thêm: Nhưng bạn dùng toàn `"use client"` — vậy khác gì React thuần?*

Đây là điểm yếu thiết kế. Do dùng Zustand `useAuthStore` ở root layout nên toàn bộ phải là Client Component. Nếu làm lại, tôi sẽ tách auth check ra `middleware.ts` để giữ layout là Server Component — giảm bundle size và tận dụng SSR thực sự.

---

**Q2: Tại sao backend và frontend để cùng một repo?**

Monorepo phù hợp với quy mô đồ án — một người phát triển, dễ đồng bộ thay đổi API và frontend cùng lúc. Nhược điểm là nếu scale lên team lớn cần tách riêng. Trong production thực tế sẽ deploy frontend lên Vercel, backend lên server riêng.

---

**Q3: Tại sao backend dùng raw SQL (`text()`) thay vì SQLAlchemy ORM?**

Hai lý do: (1) Query booking phức tạp — JOIN nhiều bảng, tính toán động (`price × multiplier × nights × 1.21`), ORM sinh SQL không tối ưu. (2) Kiểm soát hoàn toàn câu lệnh để debug dễ hơn. Nhược điểm là không có type-safety ở database layer và dễ bỏ sót migration khi schema thay đổi.

---

## PHẦN 2 — Database & Thiết kế dữ liệu

**Q4: Giải thích Polymorphic Association trong `booking_items`. Ưu và nhược điểm?**

Thay vì 4 bảng riêng, dùng một bảng `booking_items` với `entity_type` (discriminator) và `entity_id`.

| | |
|---|---|
| **Ưu điểm** | Một hệ thống booking xử lý tất cả dịch vụ; thêm loại mới không cần tạo bảng mới |
| **Nhược điểm** | Không có FK constraint thực sự; `check_in/out_date` NULL với transport — schema không clean |

Cách thay thế: **Table Per Type (TPT)** — bảng `bookings` chứa fields chung, bảng con extend thêm. Có FK thực sự nhưng query phức tạp hơn.

---

**Q5: Giải thích cơ chế xử lý race condition khi 2 người cùng đặt phòng cuối cùng.**

MySQL InnoDB dùng `SELECT ... FOR UPDATE` tạo **X-lock** trên row `room_types`:

```
A: SELECT available_rooms ... FOR UPDATE  → A giữ lock, thấy available_rooms=1
B: SELECT available_rooms ... FOR UPDATE  → B block, chờ A
A: UPDATE available_rooms=0 → COMMIT → release lock
B: tiếp tục chạy, đọc available_rooms=0 (committed data, bypass MVCC snapshot)
B: raise lỗi "Phòng đã hết" → ROLLBACK
```

Điểm mấu chốt: locking read bypass MVCC — B đọc data đã commit của A, không đọc snapshot cũ. Ai acquire lock trước thì thắng — hoàn toàn ngẫu nhiên (OS scheduler + network latency), hệ thống chỉ đảm bảo **exactly one** thành công.

---

**Q6: Bảng `policies` lưu gì và tại sao thiết kế dạng key-value?**

Lưu tham số nghiệp vụ: `min_hours_before=2`, `cancel_fee_rate=0.1`, `reschedule_fee_rate=0.05`. Thiết kế key-value giúp admin thay đổi policy mà không cần deploy lại code. Nhược điểm: value luôn là string, phải cast trong code, không có type-safety.

---

## PHẦN 3 — Bảo mật

**Q7: JWT token lưu ở đâu? Có an toàn không?**

Lưu trong `localStorage` qua Zustand persist — đây là **điểm yếu**: có thể bị đọc bởi XSS attack. Cách an toàn hơn là `httpOnly cookie` — JavaScript không đọc được. Tuy nhiên với cookie thì phải xử lý thêm CSRF (dùng `SameSite=Strict` hoặc CSRF token). Trong phạm vi đồ án chọn localStorage vì đơn giản hơn.

---

**Q8: Những lỗ hổng bảo mật có thể xảy ra?**

| Lỗ hổng | Trạng thái | Giải thích |
|---|---|---|
| XSS | ⚠️ Có nguy cơ | Token trong localStorage |
| SQL Injection | ✅ An toàn | Dùng parameter binding (`:param`), không dùng f-string |
| IDOR | ✅ Có kiểm tra | `/api/bookings/{id}` verify `booking.user_id == current_user` |
| Brute force | ⚠️ Chưa xử lý | Chưa có rate limiting |
| SECRET_KEY yếu | ⚠️ Rủi ro | Nếu để fallback default trong production, JWT có thể bị forge |

---

**Q9: Tại sao áp dụng mã giảm giá yêu cầu đăng nhập?**

Ba lý do: (1) Cần `user_id` để kiểm tra user đã dùng mã này chưa (`promotion_usages`). (2) Ngăn abuse — guest tạo vô số booking dùng cùng một mã. (3) Mã giảm giá thường gắn với loyalty program — chỉ dành cho thành viên đăng ký.

---

## PHẦN 4 — ML & AI

**Q10: Tại sao chọn NeuMF thay vì Matrix Factorization đơn giản?**

Matrix Factorization thuần dùng dot product — chỉ capture **tuyến tính**. NeuMF kết hợp:
- **GMF**: element-wise product embedding — MF có thể học non-linear
- **MLP**: concat embedding → Linear layers + ReLU — capture **phi tuyến**

Kết hợp cả hai học được cả pattern đơn giản lẫn phức tạp. Theo paper He et al. (2017), NeuMF outperform MF thuần trên các benchmark.

*GS hỏi thêm: Cold start — user mới chưa có interaction thì sao?*

Fallback về **popularity-based** (`/api/recommendations/popular`) — trả về items được tương tác nhiều nhất. Cải tiến: dùng content-based filtering dựa trên thuộc tính item (giá, địa điểm, loại dịch vụ).

---

**Q11: Có kiểm soát được chất lượng output của Gemini không?**

Có giới hạn. Tôi yêu cầu Gemini trả **JSON có cấu trúc cố định** (`city`, `tagline`, `why_match`, `highlights`, `match_score`...) và validate trước khi trả frontend. Nếu JSON lỗi thì catch exception trả 500. Tuy nhiên chất lượng nội dung phụ thuộc vào Gemini. Cải tiến: thêm RAG với dữ liệu thực từ DB để Gemini có context chính xác hơn.

---

**Q12: Transport trong travel planner có ảnh hưởng đến NCF model không?**

Không. Transport chỉ là text trong prompt Gemini ("Phương tiện ưu tiên: Tàu hỏa") để Gemini điều chỉnh lời khuyên. NCF model hoàn toàn độc lập — chỉ nhận `(user_id, item_id)` và predict score từ interaction history.

---

## PHẦN 5 — Hiệu năng & Khả năng mở rộng

**Q13: Hệ thống chịu được bao nhiêu concurrent user?**

Chưa có load testing. Bottleneck chính:
- MySQL single instance — không horizontal scale
- `SELECT...FOR UPDATE` tạo lock contention khi traffic cao
- Gemini API latency ~2-5 giây/request, có rate limit

Để scale: read replica MySQL cho query đọc, Redis cache kết quả search, Celery + Redis queue cho email/notification.

---

**Q14: Booking hủy sau 15 phút — polling mỗi 60 giây có vấn đề gì?**

Có **drift**: booking thực tế tồn tại 15–16 phút trước khi bị hủy. Hệ thống production dùng **job queue với delayed execution** (tạo job "hủy X sau 15 phút") — chính xác hơn và không cần scan toàn bảng mỗi 60 giây. Với quy mô đồ án, polling 60 giây là chấp nhận được.

---

## PHẦN 6 — Thiết kế API

**Q15: Tại sao `/api/bookings/my` và `/api/bookings/history` là hai endpoint riêng?**

Hai use case khác nhau:
- `/my`: trang "Đặt chỗ của tôi" — lọc booking còn hiệu lực, ẩn dịch vụ đã hết hạn (ngoại lệ: vẫn hiện nếu có refund đang chờ)
- `/history`: trang "Giao dịch" — tất cả không lọc để tra cứu lịch sử

Logic filter phức tạp (hotel dùng `check_out_date`, transport dùng `arrive_time`) nên tách thành hai function rõ ràng hơn một function với nhiều conditional.

---

**Q16: Phần tính toán tài chính khi đổi lịch phức tạp thế nào?**

Khi downgrade hạng ghế (business → economy), phải normalize về economy base trước:

```
economy_base = old_price / old_multiplier   # loại bỏ phần premium đã trả
new_price    = economy_base × new_multiplier
diff         = new_price - old_price        # âm → hoàn tiền
```

Nếu so sánh giá trực tiếp mà không normalize sẽ sai. Phức tạp thêm khi đổi entity mới — phải giải phóng ghế cũ và giữ ghế mới trong cùng một transaction để đảm bảo atomicity.

---

## PHẦN 7 — Câu hỏi mở

**Q17: Nếu làm lại từ đầu, bạn thay đổi điều gì?**

1. **Server Components** cho các trang không cần auth — giảm bundle, SSR thực sự
2. **httpOnly cookie** thay vì localStorage cho JWT — bảo mật hơn
3. **Prisma ORM** thay vì raw SQL — type-safety, auto-migration, vẫn dùng được raw query khi cần

---

**Q18: Hệ thống xử lý khi Gemini API down như thế nào?**

Hiện tại chưa có fallback — trả 500 nếu Gemini down. Cải tiến: catch exception và trả về top trending destinations từ DB kèm thông báo "Gợi ý AI tạm thời không khả dụng" — UX tốt hơn nhiều.

---

**Q19: Sự khác biệt giữa `booking_modifications` và `wallet_transactions` trong luồng hoàn tiền?**

Hai bảng phục vụ mục đích khác nhau:
- `booking_modifications`: audit trail của **nghiệp vụ** — "booking X đã hủy vào lúc Y, hoàn Z đồng"
- `wallet_transactions`: sổ cái **tài chính** — "ví A nhận +Z đồng loại refund"

Một lần hoàn tiền tạo record ở **cả hai bảng** — cho phép reconcile tài chính độc lập với booking logic.

---

## Tóm tắt — Câu hỏi chắc chắn được hỏi

| Ưu tiên | Câu hỏi |
|---|---|
| ⭐⭐⭐ | Q5 — Race condition `SELECT...FOR UPDATE` |
| ⭐⭐⭐ | Q4 — Polymorphic Association DB |
| ⭐⭐⭐ | Q7 — JWT security localStorage vs cookie |
| ⭐⭐⭐ | Q10 — NCF model architecture |
| ⭐⭐ | Q3 — Raw SQL vs ORM |
| ⭐⭐ | Q16 — Tính toán tài chính đổi lịch |
| ⭐⭐ | Q11 — Kiểm soát Gemini output |
| ⭐ | Q17 — Nếu làm lại |
