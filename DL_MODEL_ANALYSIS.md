# Phân tích Mô hình Deep Learning — Hệ thống Gợi ý Điểm đến Du lịch

## 1. Tổng quan

Website sử dụng mô hình **Neural Collaborative Filtering (NCF)** — cụ thể là kiến trúc **NeuMF (Neural Matrix Factorization)** — để cá nhân hóa gợi ý điểm đến du lịch cho từng người dùng.

Mô hình được cài đặt bằng **PyTorch**, huấn luyện trên dữ liệu lấy từ hành vi thực tế của người dùng trong hệ thống (booking, review, click, tìm kiếm).

---

## 2. Kiến trúc Mô hình — NeuMF

NeuMF kết hợp hai nhánh song song:

```
User ID ──┬──→ [Embedding GMF 32d] ──→ element-wise product ──→ GMF_out (32d)
          │
Item ID ──┘──→ [Embedding GMF 32d]

User ID ──┬──→ [Embedding MLP 32d] ──→ concat (64d) ──→ [Linear 64→32 + BN + ReLU + Dropout]
          │                                            ──→ [Linear 32→16 + BN + ReLU + Dropout]
Item ID ──┘──→ [Embedding MLP 32d]                   ──→ MLP_out (16d)

                    GMF_out (32d)
                    MLP_out (16d)
                         │
                    concat (48d)
                         │
                  [Linear 48 → 1]
                         │
                    Sigmoid → score ∈ (0, 1)
```

### Tham số kiến trúc

| Tham số | Giá trị |
|---------|---------|
| Embedding dimension (GMF & MLP) | 32 |
| MLP hidden layers | [64, 32, 16] |
| Dropout rate | 0.2 |
| Batch Normalization | Có (sau mỗi Linear trong MLP) |
| Hàm kích hoạt | ReLU (ẩn), Sigmoid (output) |
| Output | Score ∈ (0, 1) — xác suất user quan tâm đến điểm đến |

### Tổng số tham số (thực tế với meta.json)

- `num_users = 1017`, `num_items = 109`
- 4 embedding tables: `(1018 × 32) × 4 ≈ 130.000` tham số
- MLP tower: `64×32 + 32×32 + 16×32 + 48×1 ≈ 5.000` tham số
- **Tổng: ~135.000 tham số** — mô hình nhẹ, phù hợp chạy CPU

---

## 3. Khởi tạo Trọng số

```python
# Embedding: phân phối chuẩn, std nhỏ để tránh bão hòa đầu ra sigmoid
nn.init.normal_(embedding.weight, std=0.01)

# Linear: Xavier Uniform — duy trì phương sai gradient qua nhiều lớp
nn.init.xavier_uniform_(linear.weight)
nn.init.zeros_(linear.bias)
```

**Lý do chọn Xavier cho Linear:** Xavier phân phối ngẫu nhiên theo kích thước lớp (`std = sqrt(2 / (fan_in + fan_out))`), giúp gradient không bị vanish hoặc explode khi lan truyền ngược qua nhiều lớp.

---

## 4. Dữ liệu Huấn luyện

### 4.1 Nguồn dữ liệu (6 nguồn)

| Nguồn | Loại | Score |
|-------|------|-------|
| Hotel booking `confirmed` | Implicit | 1.0 |
| Hotel booking `pending` | Implicit | 0.8 |
| Flight / Bus booking `confirmed` | Implicit | 0.9 |
| Review rating 1–5 sao | Explicit | `rating / 5.0` (0.2 – 1.0) |
| User interactions theo action | Implicit | Xem bảng dưới |
| Search logs (keyword → destination) | Implicit | 0.35 – 0.65 |

### 4.2 Trọng số hành vi người dùng

```python
ACTION_WEIGHTS = {
    "book":        1.0,   # Đặt vé = tín hiệu mạnh nhất
    "payment":     1.0,
    "confirmed":   1.0,
    "view_detail": 0.7,   # Xem chi tiết
    "click":       0.6,
    "view":        0.4,
    "search":      0.35,
    "view_list":   0.3,   # Chỉ lướt qua danh sách
}
```

### 4.3 Tổng hợp dữ liệu

Với mỗi cặp `(user_id, destination_id)`, giữ **giá trị MAX** trong tất cả các nguồn:

```python
score_map[(user_id, dest_id)] = max(hiện_tại, score_mới)
```

Điều này đảm bảo một lần booking (score=1.0) không bị "trung bình hóa" bởi những lần chỉ view (score=0.3).

### 4.4 Negative Sampling

Tỉ lệ 4:1 (4 negative/positive):

```
Với mỗi (user, dest_pos, score) → thêm 4 (user, dest_neg, 0.0)
trong đó dest_neg ∉ tập điểm đến user đã tương tác
```

Kết quả: dataset huấn luyện có ~5× kích thước tập positive.

---

## 5. Quá trình Huấn luyện

### 5.1 Cấu hình

| Hyper-parameter | Giá trị |
|----------------|---------|
| Epochs | 30 |
| Batch size | 256 |
| Optimizer | Adam (lr=0.001, weight_decay=1e-5) |
| Loss function | BCELoss (Binary Cross-Entropy) |
| LR Scheduler | ReduceLROnPlateau (patience=3, factor=0.5) |
| Train/Val split | 90% / 10% (random_state=42) |

### 5.2 Hàm mất mát

```
BCE = -[y·log(ŷ) + (1-y)·log(1-ŷ)]
```

- **y**: score thực tế (0.0 – 1.0, không nhất thiết là 0/1)
- **ŷ**: score mô hình dự đoán qua Sigmoid
- BCELoss phù hợp vì output là xác suất liên tục

### 5.3 Vòng lặp huấn luyện

```
for epoch in 1..30:
    for batch in train_loader:
        pred = model(users, items)        # Forward
        loss = BCELoss(pred, labels)      # Loss
        loss.backward()                   # Backprop
        optimizer.step()                  # Update weights

    # Validation
    val_loss = evaluate(val_loader)
    scheduler.step(val_loss)              # Giảm LR nếu val_loss không cải thiện

    if val_loss < best_val_loss:
        save(model, "ncf_best.pt")        # Chỉ lưu model tốt nhất
```

### 5.4 Early stopping ngầm định

Không dùng early stopping tường minh, nhưng chỉ lưu model khi `val_loss` giảm. Sau 30 epoch, `ncf_best.pt` luôn là checkpoint tốt nhất trên tập validation.

---

## 6. Inference — Tạo gợi ý

### 6.1 Flow dự đoán cho user đã biết

```
1. Lấy user_idx từ user2idx[user_id]
2. Duyệt toàn bộ 109 điểm đến
3. Với mỗi dest: score = model(user_idx, item_idx)  → tensor inference, no_grad
4. Loại bỏ điểm đến user đã đặt (exclude_dest_ids)
5. Áp dụng Search Boost (nếu user có search gần đây)
6. Sắp xếp theo score giảm dần → lấy top-k (mặc định k=8)
```

### 6.2 Search Boost — Real-time personalization

```python
boost_weight = min(0.15 + count * 0.05, 0.4)  # count = số lần tìm keyword
score = score + boost_weight * (1.0 - score)   # Kéo score lên, không vượt quá 1.0
```

Boost được tính từ `search_logs` trong **7 ngày gần nhất**, match keyword với `destinations.city` / `destinations.name`.

**Ví dụ:** User tìm "Đà Nẵng" 3 lần → `boost_weight = 0.15 + 3×0.05 = 0.30` → điểm đến Đà Nẵng được boost 30% khoảng còn lại đến 1.0.

### 6.3 Fallback cho user mới (Cold Start)

```python
if user_id not in user2idx:
    return _popular_items()  # Gợi ý top điểm đến phổ biến theo số booking
```

---

## 7. Tích hợp vào Hệ thống

```
App startup
    └── load NCF model (ncf_best.pt + meta.json + *.pkl)
            ↓
GET /api/recommendations  (cần auth)
    └── NCF.predict(user_id, top_k=8)
            ↓
        Kết hợp: NCF score + Search Boost
            ↓
        Trả về: [{destination_id, name, score, boosted, ...}]

GET /api/recommendations/guest  (không cần auth)
    └── _popular_items() — sắp xếp theo booking_count
```

---

## 8. Lưu trữ Model

```
backend/ml/saved/
├── ncf_best.pt      # 326 KB — PyTorch state_dict (trọng số tốt nhất)
├── meta.json        # Config: num_users=1017, num_items=109, embed_dim=32...
├── user2idx.pkl     # Dict: user_id → embedding index (1-indexed)
├── item2idx.pkl     # Dict: destination_id → embedding index
└── idx2item.pkl     # Dict ngược: embedding index → destination_id
```

---

## 9. Ưu điểm & Hạn chế

### Ưu điểm

| Điểm mạnh | Giải thích |
|-----------|-----------|
| **Kết hợp GMF + MLP** | GMF học tương tác tuyến tính (giống Matrix Factorization truyền thống), MLP học phi tuyến → bổ sung cho nhau |
| **Multi-source implicit feedback** | Không chỉ dùng rating, mà tổng hợp 6 nguồn tín hiệu từ hành vi thực tế |
| **Real-time boost** | Search intent gần đây được phản ánh ngay vào gợi ý mà không cần retrain |
| **Cold start fallback** | User mới vẫn nhận được gợi ý hợp lý (popular-based) |
| **Lightweight** | ~135K tham số, chạy được trên CPU production |

### Hạn chế

| Hạn chế | Giải thích |
|---------|-----------|
| **Không retrain tự động** | Model chỉ được cập nhật khi chạy lại `ml/train.py` thủ công; user mới sau khi train sẽ không có embedding |
| **Cold start item** | Điểm đến mới thêm vào sau khi train sẽ không được model biết đến |
| **Implicit feedback noise** | Một click không có nghĩa là user thích — chỉ là tín hiệu yếu |
| **Không có context** | Không xét đến mùa du lịch, ngân sách, số người đi |

---

## 10. So sánh với các phương pháp khác

| Phương pháp | Ưu điểm | Nhược điểm | Lựa chọn |
|-------------|---------|-----------|----------|
| Content-Based Filtering | Không cần dữ liệu user khác | Không học được preference ẩn | Không dùng |
| Matrix Factorization thuần | Đơn giản, hiệu quả | Chỉ học tương tác tuyến tính | Được thay bởi GMF trong NeuMF |
| **NeuMF (đang dùng)** | Học cả tuyến tính và phi tuyến | Cần dữ liệu đủ lớn | ✅ |
| Transformer-based (BERT4Rec) | Xét sequence hành vi | Phức tạp, cần nhiều data | Overkill với dataset này |

---

## 11. Luồng dữ liệu đầy đủ

```
Người dùng tương tác
    │ (click, view, book, review, search)
    ↓
Database (user_interactions, bookings, reviews, search_logs)
    │
    ↓ python -m ml.train
    │
load_interactions()  →  6 nguồn SQL  →  score_map (MAX aggregation)
    │
make_samples()  →  negative sampling 4:1  →  InteractionDataset
    │
DataLoader (batch_size=256, shuffle=True)
    │
NCF model (GMF + MLP)  →  BCELoss  →  Adam optimizer
    │ 30 epochs, save best val_loss
    ↓
ncf_best.pt + meta.json + *.pkl
    │
    ↓ App startup: load model
    │
GET /api/recommendations
    │
NCF.predict()  +  Search Boost (7 ngày gần nhất)
    │
Top-8 điểm đến  →  Frontend hiển thị
```
“Dạ, trong hệ thống của nhóm em, phần gợi ý điểm đến được xây dựng dựa trên mô hình Neural Collaborative Filtering, cụ thể là kiến trúc NeuMF.

Mô hình này có nhiệm vụ dự đoán mức độ phù hợp giữa người dùng và một điểm đến, dựa trên dữ liệu hành vi thực tế như tìm kiếm, click, và đặc biệt là booking.

Về cách hoạt động, mỗi người dùng và mỗi điểm đến sẽ được biểu diễn dưới dạng vector. Sau đó, mô hình sử dụng hai nhánh song song:

Nhánh thứ nhất là GMF, giúp học các quan hệ tuyến tính đơn giản giữa người dùng và điểm đến
Nhánh thứ hai là MLP, giúp học các quan hệ phức tạp hơn từ hành vi người dùng

Hai nhánh này được kết hợp lại để đưa ra một score từ 0 đến 1, thể hiện xác suất người dùng quan tâm đến điểm đến đó.

Một điểm quan trọng trong hệ thống là nhóm em không chỉ sử dụng một nguồn dữ liệu, mà kết hợp nhiều tín hiệu khác nhau như booking, review, click và search, với các trọng số khác nhau để phản ánh mức độ quan tâm thực tế.

Ngoài ra, hệ thống còn có cơ chế Search Boost, giúp ưu tiên các điểm đến mà người dùng vừa tìm kiếm gần đây, từ đó tăng tính cá nhân hóa theo thời gian thực mà không cần huấn luyện lại mô hình.

Nhờ đó, hệ thống vừa đảm bảo tính chính xác của mô hình học máy, vừa linh hoạt theo hành vi người dùng trong thời gian ngắn.”