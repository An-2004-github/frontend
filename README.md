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
