# main.py (Bên project FastAPI)
from dotenv import load_dotenv
load_dotenv()  # load .env trước tất cả import khác

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
from routers.interactions import router as interactions_router
from routers.travel_planner import router as travel_planner_router
from routers.trains import router as trains_router
from routers.notifications import router as notifications_router
from contextlib import asynccontextmanager
import asyncio
from booking_expire import booking_expire_loop

try:
    from routers.recommendations import router as recommendations_router
    from ml.recommend import recommender
    _ML_AVAILABLE = True
except Exception as _e:
    recommendations_router = None
    recommender = None
    _ML_AVAILABLE = False
    print(f"[NCF] ML modules unavailable (torch not installed?): {_e}")
    print("[NCF] Install: pip install torch pandas numpy scikit-learn")


@asynccontextmanager
async def lifespan(_app):
    if _ML_AVAILABLE and recommender is not None:
        ok = recommender.load()
        if not ok:
            print("[NCF] Model not found — run 'python -m ml.train' to train first.")

    # Khởi động scheduler tự động hủy booking pending quá 15 phút
    expire_task = asyncio.create_task(booking_expire_loop())

    yield

    expire_task.cancel()
    try:
        await expire_task
    except asyncio.CancelledError:
        pass


# Câu lệnh chạy backend: uvicorn main:app --reload
app = FastAPI(lifespan=lifespan, redirect_slashes=False)

# Danh sách các domain được phép gọi API
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://vivuvuive.io.vn",
    "https://vivuvuive.io.vn",
    "http://www.vivuvuive.io.vn",
    "https://www.vivuvuive.io.vn",
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
if _ML_AVAILABLE and recommendations_router is not None:
    app.include_router(recommendations_router)
app.include_router(interactions_router)
app.include_router(travel_planner_router)
app.include_router(trains_router)
app.include_router(notifications_router)
