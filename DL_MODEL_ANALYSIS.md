# Phân tích Mô hình Deep Learning — Hệ thống Gợi ý Điểm đến Du lịch

## 1. Tổng quan

Website sử dụng mô hình **Neural Collaborative Filtering (NCF)**, cụ thể là kiến trúc **NeuMF (Neural Matrix Factorization)**, để cá nhân hóa gợi ý điểm đến du lịch cho từng người dùng. Mô hình được cài đặt bằng PyTorch và huấn luyện hoàn toàn trên dữ liệu hành vi thực tế thu thập từ hệ thống, bao gồm lịch sử đặt vé, đánh giá, lượt click và từ khóa tìm kiếm.

---

## 2. Kiến trúc Mô hình

NeuMF được thiết kế để kết hợp ưu điểm của hai phương pháp: **Generalized Matrix Factorization (GMF)** và **Multi-Layer Perceptron (MLP)**, chạy song song và hợp nhất ở tầng cuối.

Trong nhánh GMF, mỗi người dùng và điểm đến được ánh xạ thành một vector nhúng (embedding) 32 chiều riêng biệt. Tích element-wise của hai vector này tạo ra một biểu diễn tuyến tính thể hiện mức độ tương đồng giữa người dùng và điểm đến theo từng chiều không gian ẩn. Đây chính là cơ chế tương tự Matrix Factorization truyền thống, nhưng được đặt trong khung học sâu.

Trong nhánh MLP, mỗi người dùng và điểm đến cũng có một bộ embedding 32 chiều riêng (tách biệt hoàn toàn với GMF để hai nhánh học đặc trưng độc lập). Hai vector này được nối (concatenate) thành vector 64 chiều, sau đó đi qua ba tầng fully-connected với kích thước lần lượt là 64, 32, và 16 nơ-ron. Mỗi tầng có Batch Normalization để ổn định gradient, hàm kích hoạt ReLU, và Dropout 0.2 để tránh overfitting. Nhánh MLP cho phép mô hình học được các mối quan hệ phi tuyến tính phức tạp mà GMF không thể nắm bắt.

Đầu ra của hai nhánh — vector 32 chiều từ GMF và vector 16 chiều từ MLP — được ghép lại thành vector 48 chiều, rồi đi qua một tầng Linear duy nhất và hàm Sigmoid để cho ra điểm số cuối cùng trong khoảng từ 0 đến 1, biểu thị xác suất người dùng quan tâm đến điểm đến đó.

Về quy mô, với 1.017 người dùng và 109 điểm đến trong tập dữ liệu hiện tại, mô hình có bốn bảng embedding tổng cộng khoảng 130.000 tham số, cộng với khoảng 5.000 tham số trong phần MLP, tổng cộng xấp xỉ **135.000 tham số** — đủ nhẹ để chạy trên CPU môi trường production mà không cần GPU.

---

## 3. Khởi tạo Trọng số

Các tầng Embedding được khởi tạo theo phân phối chuẩn với độ lệch chuẩn rất nhỏ (std = 0.01), đảm bảo các vector ban đầu gần với gốc tọa độ, tránh bão hòa hàm Sigmoid ngay từ đầu. Các tầng Linear trong MLP được khởi tạo theo phương pháp **Xavier Uniform**, trong đó độ lệch chuẩn được tính dựa trên kích thước đầu vào và đầu ra của mỗi tầng theo công thức `std = sqrt(2 / (fan_in + fan_out))`. Cách khởi tạo này giúp phương sai của gradient được duy trì ổn định khi lan truyền ngược qua nhiều tầng, hạn chế hiện tượng vanishing gradient hoặc exploding gradient.

---

## 4. Dữ liệu Huấn luyện

Một điểm đặc biệt của hệ thống là dữ liệu huấn luyện được tổng hợp từ **sáu nguồn** khác nhau, không chỉ dựa vào đánh giá sao trực tiếp.

Nguồn mạnh nhất là lịch sử đặt phòng khách sạn đã được xác nhận (score = 1.0), tiếp theo là đặt phòng ở trạng thái chờ (score = 0.8), và đặt vé máy bay hoặc xe khách đến một thành phố (score = 0.9). Các đánh giá sao được chuẩn hóa trực tiếp về thang 0–1 bằng cách chia cho 5.

Ngoài ra, hệ thống theo dõi hành vi người dùng trên từng trang thông qua bảng `user_interactions`, với trọng số khác nhau tùy mức độ thể hiện sự quan tâm: đặt vé và thanh toán được gán điểm 1.0, xem trang chi tiết là 0.7, click là 0.6, chỉ lướt qua là 0.3–0.4. Từ khóa tìm kiếm trong `search_logs` cũng được xét đến, với điểm số từ 0.35 đến tối đa 0.65 tùy theo số lần tìm kiếm.

Với mỗi cặp (người dùng, điểm đến), hệ thống giữ lại **giá trị điểm số cao nhất** từ tất cả các nguồn thay vì lấy trung bình, đảm bảo một lần booking có giá trị 1.0 không bị kéo xuống bởi những lần chỉ lướt qua.

Để tạo dataset cân bằng, hệ thống áp dụng **negative sampling** theo tỉ lệ 4:1: với mỗi cặp tương tác dương (người dùng đã có tín hiệu với điểm đến), mô hình được thêm 4 mẫu âm là các điểm đến mà người dùng chưa từng tương tác, gán nhãn 0.0. Kết quả là tập huấn luyện có kích thước gấp 5 lần tập tương tác gốc.

---

## 5. Quá trình Huấn luyện

Mô hình được huấn luyện qua 30 epoch với batch size 256. Optimizer Adam được sử dụng với learning rate 0.001 và L2 regularization (weight_decay = 1e-5) để hạn chế overfitting. Hàm mất mát là **Binary Cross-Entropy (BCE)**, phù hợp vì nhãn là giá trị liên tục trong khoảng 0–1 thay vì chỉ là 0 hoặc 1 thuần túy.

Ở mỗi epoch, mô hình duyệt qua toàn bộ tập huấn luyện theo từng batch, tính loss, lan truyền ngược và cập nhật trọng số. Sau đó đánh giá trên tập validation (10% dữ liệu). Learning rate được điều chỉnh tự động thông qua `ReduceLROnPlateau`: nếu validation loss không cải thiện sau 3 epoch liên tiếp, learning rate sẽ giảm còn một nửa. Chỉ khi nào validation loss giảm xuống mức thấp nhất từ trước đến nay, model mới được lưu vào file `ncf_best.pt`. Sau 30 epoch, file này luôn chứa checkpoint tốt nhất trên tập validation.

---

## 6. Quá trình Inference và Search Boost

Khi người dùng đăng nhập và gọi API gợi ý, hệ thống lấy chỉ số embedding của người dùng đó, sau đó tính điểm số cho toàn bộ 109 điểm đến chỉ trong một lần forward pass (sử dụng `torch.no_grad()` để tiết kiệm bộ nhớ). Các điểm đến mà người dùng đã từng đặt phòng/vé thành công sẽ bị loại khỏi danh sách ứng viên để tránh gợi ý lại những nơi đã đến.

Trước khi sắp xếp và trả về kết quả, hệ thống áp dụng cơ chế **Search Boost** — một lớp cá nhân hóa theo thời gian thực không cần retrain model. Hệ thống đọc các từ khóa mà người dùng đã tìm kiếm trong 7 ngày gần nhất, so khớp với tên thành phố và điểm đến trong database, rồi tính trọng số boost theo công thức `boost_weight = min(0.15 + count × 0.05, 0.4)`, trong đó `count` là số lần xuất hiện của từ khóa đó. Điểm số của điểm đến phù hợp được điều chỉnh theo công thức `score = score + boost_weight × (1 - score)`, đảm bảo score không vượt quá 1.0 dù boost bao nhiêu. Ví dụ, nếu người dùng tìm "Đà Nẵng" 3 lần, boost_weight sẽ là 0.30, tức là điểm đến Đà Nẵng được kéo thêm 30% khoảng còn lại tính từ score hiện tại đến 1.0.

Đối với người dùng mới chưa có dữ liệu huấn luyện (cold start), hệ thống fallback về hàm `_popular_items()`, tính điểm trung bình của tất cả các user embedding đã biết với từng điểm đến, cho ra danh sách phổ biến mang tính đại diện cho toàn bộ cộng đồng người dùng.

---

## 7. Ưu điểm và Hạn chế

Kiến trúc NeuMF có lợi thế rõ ràng so với các phương pháp truyền thống nhờ khả năng học đồng thời cả quan hệ tuyến tính (qua GMF) và phi tuyến (qua MLP). Việc tổng hợp dữ liệu từ nhiều nguồn hành vi thay vì chỉ dựa vào đánh giá sao giúp mô hình phản ánh được sở thích thực tế của người dùng ngay cả khi họ chưa để lại review nào. Cơ chế Search Boost bổ sung khả năng thích nghi theo thời gian thực mà không tốn chi phí retrain. Với chỉ khoảng 135.000 tham số, mô hình có thể triển khai hoàn toàn trên CPU.

Tuy nhiên, hệ thống vẫn còn một số hạn chế đáng lưu ý. Model không tự động retrain — mọi người dùng đăng ký sau lần huấn luyện cuối sẽ không có embedding và luôn nhận kết quả fallback. Tương tự, các điểm đến mới thêm vào hệ thống sau khi train cũng không được model biết đến. Dữ liệu implicit feedback vốn có nhiễu: một lượt click không nhất thiết phản ánh sự yêu thích thực sự. Ngoài ra, mô hình chưa xét đến các yếu tố ngữ cảnh như mùa du lịch, ngân sách hay số lượng người đi, vốn là những yếu tố ảnh hưởng lớn đến quyết định của người dùng.
