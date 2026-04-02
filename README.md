## Khởi động web

Bật backend: - cd backend
             - uvicorn main:app --reload

Bật frontend: - npm run dev

Bật deploy để liên kết với webhook: - ngrok http 8000

Để chạy:


# 1. Cài thư viện
pip install torch pandas numpy scikit-learn

# 2. Train model (chạy từ thư mục backend/)
cd backend
python -m ml.train

# 3. Khởi động lại backend — model tự load
uvicorn main:app --reload