## Khởi động web

Bật backend: - cd backend
             - uvicorn main:app --reload

Bật frontend: - npm run dev

Bật deploy để liên kết với webhook: - ngrok http 8000

Chạy Cloudflare Tunnel : cloudflared tunnel run datn-server

Để chạy:


# 1. Cài thư viện
pip install torch pandas numpy scikit-learn

# 2. Train model (chạy từ thư mục backend/)
cd backend
python -m ml.train

# 3. Khởi động lại backend — model tự load
uvicorn main:app --reload


#An
#GEMINI_API_KEY=AIzaSyAJefaqsthZ-AeTkfQMwzKMjD-IYjrJ9Iw
#GEMINI_API_KEY=AIzaSyAsCZbnlccoUHan_MBAOTxwQ9NPy-u0mqI
#GEMINI_API_KEY=AIzaSyAE98sJPMfVRqGr76hB6TFFbgDV-oKNqZY
#GEMINI_API_KEY=AIzaSyDqkzcW33jWzNFGTSUz6bBi7u36Vnh14lw
#GEMINI_API_KEY=AIzaSyDpR-1AWSPNxOUqZ9kkdR5N6pdiLk0EMx4
#GEMINI_API_KEY=AIzaSyC_62hM5ChG01JFdOLWgb5Z89xUnyntplE
 
#NGhĩa
#GEMINI_API_KEY=AIzaSyAdEC9mZY_-_rHelf4VT1mi4Vz4zbI9XiI
AIzaSyBcOYmvkoc2XT0PuCOPRlz54qn8v6F372I


NOTE MAI SỬA:
tranh chấp dữ liệu 
Sửa phương thức thanh toán / ngày giờ giao dịch
Email đổi phòng
Được đổi nhiều lần và lần nào update lần đấy
Bỏ hoàn về đâu đối với không được phần không được hoàn 
Trang admin đặt chỗ có xem chi tiết để hiển thị lịch sử đổi/ hủy
sửa email hủy đối với không hoàn tiền
yêu cầu đổi hủy có thể hiện người duyệt 
Sửa phần Thời gian khi chọn sẽ tự động cập nhật loại lịch trình 
Sửa phần tìm kiếm khách sạn khi link từ trang gợi ý
 Sửa phần đổi lịch 


 🔴 Vấn đề nghiêm trọng (cần fix ngay)
Bảo mật

BANK_ID, ACCOUNT_NO hardcode trực tiếp trong client code — nên chuyển vào .env
Google OAuth ClientID hardcode trong app/layout.tsx thay vì process.env
Token lưu localStorage không có cơ chế refresh/expiry an toàn
Crash không xử lý được

Không có file error.tsx nào → khi API lỗi, trang sẽ crash trắng
Không có not-found.tsx → URL sai trả về lỗi xấu
Không có loading.tsx → không có skeleton khi chuyển trang
🟠 UX/UI quan trọng
alert() dùng ở nhiều nơi (profile, payment) → cần thay bằng toast notification
Không có flow retry khi QR payment hết 15 phút → user bị kẹt
Không có email xác nhận sau khi đặt chỗ thành công
Không có trang itinerary sau thanh toán — user không biết đặt gì xong
Thiếu skeleton loader trên BookingCard và SearchBar trong lúc fetch API
🟡 SEO & Performance
app/layout.tsx dùng "use client" → không thể export metadata → Google không index được
Không có og:image, og:title cho từng trang
Không có robots.txt, sitemap.xml
Wallet polling 30 giây bất kể user có dùng hay không → lãng phí request
🔵 Code quality
Vấn đề	Gợi ý
Validate form tự viết ở mỗi chỗ	Dùng react-hook-form + zod
alert() scattered	Dùng react-hot-toast
Không có error boundary	Thêm error.tsx mỗi route segment
Không có accessibility	Thêm aria-label cho buttons/icons
🟢 Tính năng còn thiếu (nên có)
Flow huỷ đặt chỗ + hoàn tiền rõ ràng
Trang lịch trình (itinerary) sau thanh toán
Multi-language (i18n) — hiện chỉ có tiếng Việt
Lưu phương thức thanh toán yêu thích
Tìm kiếm kết hợp (combo flight + hotel)