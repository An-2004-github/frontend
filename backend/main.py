# main.py (Bên project FastAPI)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.hotels import router as hotels_router
from routers.destinations import router as destinations_router
from routers.flights import router as flights_router
from routers.bookings import router as bookings_router
from routers.reviews import router as reviews_router
from sqlalchemy import text
from database import engine
from routers.auth import router as auth_router
from routers.promotions import router as promotions_router
from routers.destinations import router as destinations_router
from routers.buses import router as buses_router
from routers.wallet import router as wallet_router

# Câu lệnh chạy backend: uvicorn main:app --reload
app = FastAPI()

@app.get("/test-db")
def test_db():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM hotels"))
        return [dict(row._mapping) for row in result]

@app.get("/debug-db")
def debug_db():
    with engine.connect() as conn:
        db_name = conn.execute(text("SELECT DATABASE()")).scalar()
        tables = conn.execute(text("SHOW TABLES")).fetchall()
        return {
            "current_database": db_name,
            "tables": [t[0] for t in tables]
        }
# Danh sách các domain được phép gọi API
origins = [
    "http://localhost:3000", # Domain của Next.js khi chạy dev
    "http://127.0.0.1:3000",
    # Thêm domain thật của bạn sau khi deploy (VD: https://travelapp.com)
]
@app.get("/")
def home():
    return {"message": "API Travel Website đang chạy"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Cho phép tất cả các method (GET, POST, PUT, DELETE...)
    allow_headers=["*"], # Cho phép tất cả các headers
)

app.include_router(promotions_router)
app.include_router(hotels_router)
app.include_router(destinations_router)
app.include_router(flights_router)
app.include_router(bookings_router)
app.include_router(reviews_router)
app.include_router(auth_router)
app.include_router(destinations_router)
app.include_router(buses_router)
app.include_router(wallet_router)