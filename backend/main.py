# main.py (Bên project FastAPI)
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routers.hotels import router as hotels_router
from routers.destinations import router as destinations_router
from routers.flights import router as flights_router
from routers.bookings import router as bookings_router
from routers.reviews import router as reviews_router
from sqlalchemy import text
from database import engine
from routers.auth import router as auth_router
from routers.promotions import router as promotions_router
from routers.buses import router as buses_router
from routers.wallet import router as wallet_router
from routers.admin import router as admin_router
from routers.banners import router as banners_router
from routers.chat import router as chat_router

# Câu lệnh chạy backend: uvicorn main:app --reload
app = FastAPI()

# Danh sách các domain được phép gọi API
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler để đảm bảo CORS headers luôn được gửi
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )

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

@app.get("/")
def home():
    return {"message": "API Travel Website đang chạy"}

app.include_router(promotions_router)
app.include_router(hotels_router)
app.include_router(destinations_router)
app.include_router(flights_router)
app.include_router(bookings_router)
app.include_router(reviews_router)
app.include_router(auth_router)
app.include_router(buses_router)
app.include_router(wallet_router)
app.include_router(admin_router)
app.include_router(banners_router)
app.include_router(chat_router)
