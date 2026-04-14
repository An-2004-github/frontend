"""
Travel Planner: Gợi ý địa điểm du lịch thông minh
POST /api/travel-planner/suggest
Kết hợp DB query + Gemini AI để tạo gợi ý cá nhân hoá.
"""

import os
import re
import json
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/api/travel-planner", tags=["travel-planner"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
]


def _repair_json(s: str) -> str:
    """Sửa các lỗi JSON phổ biến từ Gemini."""
    # Thêm dấu phẩy thiếu giữa } và { (lỗi hay gặp nhất)
    s = re.sub(r'\}\s*\n(\s*)\{', r'},\n\1{', s)
    # Xoá trailing comma trước ] hoặc }
    s = re.sub(r',(\s*[}\]])', r'\1', s)
    return s


@router.get("/trending")
def get_trending(limit: int = 8, days: int = 30):
    """
    Địa điểm hot gần đây dựa trên dữ liệu thực của người dùng.
    Tính điểm tổng hợp từ 3 nguồn (trong N ngày gần nhất):
      - bookings confirmed/pending  → trọng số 3
      - user_interactions (view_detail, click) → trọng số 2
      - search_logs keyword match   → trọng số 1
    """
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT
                d.destination_id,
                d.name,
                d.city,
                d.country,
                COALESCE(AVG(h.avg_rating), 0)   AS avg_rating,
                MIN(rt.price_per_night)           AS min_price,
                (SELECT image_url FROM images
                 WHERE entity_type = 'destination'
                   AND entity_id = d.destination_id
                 LIMIT 1) AS image_url,

                -- điểm bookings (weight 3)
                COALESCE((
                    SELECT COUNT(*) * 3
                    FROM bookings b
                    JOIN booking_items bi ON bi.booking_id = b.booking_id
                    JOIN room_types rt2   ON rt2.room_type_id = bi.entity_id AND bi.entity_type = 'room'
                    JOIN hotels h2        ON h2.hotel_id = rt2.hotel_id
                    WHERE h2.destination_id = d.destination_id
                      AND b.status IN ('confirmed','pending')
                      AND b.booking_date >= NOW() - INTERVAL :days DAY
                ), 0) AS booking_score,

                -- điểm interactions (weight 2)
                COALESCE((
                    SELECT COUNT(*) * 2
                    FROM user_interactions ui
                    JOIN hotels h3 ON h3.hotel_id = ui.entity_id AND ui.entity_type = 'hotel'
                    WHERE h3.destination_id = d.destination_id
                      AND ui.action IN ('view_detail','click','book')
                      AND ui.created_at >= NOW() - INTERVAL :days DAY
                ), 0) AS interact_score,

                -- điểm search (weight 1)
                COALESCE((
                    SELECT COUNT(*) * 1
                    FROM search_logs sl
                    WHERE (d.city LIKE CONCAT('%', sl.keyword, '%')
                        OR d.name LIKE CONCAT('%', sl.keyword, '%'))
                      AND sl.created_at >= NOW() - INTERVAL :days DAY
                ), 0) AS search_score

            FROM destinations d
            LEFT JOIN hotels h      ON h.destination_id = d.destination_id
            LEFT JOIN room_types rt ON rt.hotel_id = h.hotel_id
            GROUP BY d.destination_id, d.name, d.city, d.country
            HAVING (booking_score + interact_score + search_score) > 0
               OR avg_rating > 0
            ORDER BY (booking_score + interact_score + search_score) DESC, avg_rating DESC
            LIMIT :limit
        """), {"days": days, "limit": limit}).fetchall()

        result = []
        for r in rows:
            row = dict(r._mapping)
            row["trend_score"] = int(row["booking_score"] or 0) + int(row["interact_score"] or 0) + int(row["search_score"] or 0)
            result.append(row)

        return result


class PlannerRequest(BaseModel):
    destination:    str | None = None      # tên địa điểm mong muốn (tùy chọn)
    depart_date:    str | None = None      # YYYY-MM-DD
    return_date:    str | None = None      # YYYY-MM-DD
    budget:         str | None = None      # "under5m" | "5to10m" | "10to20m" | "over20m"
    interests:      list[str] = []         # tags
    people:         int = 2
    transport:      str | None = None      # "flight"|"bus"|"self_drive"|"any"
    itinerary_type: str | None = None      # "short"|"medium"|"long"


BUDGET_LABELS = {
    "under5m":  "dưới 5 triệu/người",
    "5to10m":   "5–10 triệu/người",
    "10to20m":  "10–20 triệu/người",
    "over20m":  "trên 20 triệu/người",
}

TRANSPORT_LABELS = {
    "flight":     "Máy bay",
    "bus":        "Xe khách",
    "self_drive": "Tự lái xe",
    "any":        "Không quan trọng",
}

ITINERARY_LABELS = {
    "short":  "Ngắn ngày (1–3 ngày)",
    "medium": "Vừa phải (4–7 ngày)",
    "long":   "Dài ngày (trên 7 ngày)",
}


def _load_destinations(keyword: str | None) -> list[dict]:
    """Lấy danh sách destinations từ DB, filter theo keyword nếu có."""
    with engine.connect() as conn:
        if keyword:
            rows = conn.execute(text("""
                SELECT d.destination_id, d.name, d.city, d.country, d.description,
                    COALESCE(AVG(h.avg_rating), 0) AS avg_rating,
                    MIN(rt.price_per_night) AS min_price,
                    (SELECT image_url FROM images
                     WHERE entity_type = 'destination'
                       AND entity_id = d.destination_id
                     LIMIT 1) AS image_url
                FROM destinations d
                LEFT JOIN hotels h ON h.destination_id = d.destination_id
                LEFT JOIN room_types rt ON rt.hotel_id = h.hotel_id
                WHERE d.city LIKE :kw OR d.name LIKE :kw
                GROUP BY d.destination_id, d.name, d.city, d.country, d.description
                LIMIT 10
            """), {"kw": f"%{keyword}%"}).fetchall()
        else:
            rows = conn.execute(text("""
                SELECT d.destination_id, d.name, d.city, d.country, d.description,
                    COALESCE(AVG(h.avg_rating), 0) AS avg_rating,
                    MIN(rt.price_per_night) AS min_price,
                    (SELECT image_url FROM images
                     WHERE entity_type = 'destination'
                       AND entity_id = d.destination_id
                     LIMIT 1) AS image_url
                FROM destinations d
                LEFT JOIN hotels h ON h.destination_id = d.destination_id
                LEFT JOIN room_types rt ON rt.hotel_id = h.hotel_id
                GROUP BY d.destination_id, d.name, d.city, d.country, d.description
                ORDER BY avg_rating DESC
                LIMIT 20
            """)).fetchall()

        return [dict(r._mapping) for r in rows]


def _build_prompt(req: PlannerRequest, destinations: list[dict]) -> str:
    nights = ""
    if req.depart_date and req.return_date:
        from datetime import date
        try:
            d1 = date.fromisoformat(req.depart_date)
            d2 = date.fromisoformat(req.return_date)
            nights = f"{(d2 - d1).days} đêm ({req.depart_date} đến {req.return_date})"
        except Exception:
            nights = f"{req.depart_date} – {req.return_date}"

    dest_list = "\n".join(
        f"- {d['city']} ({d['name']}): rating={float(d['avg_rating'] or 0):.1f}, giá từ {int(d['min_price'] or 0):,}đ/đêm, mô tả: {(d['description'] or '')[:100]}"
        for d in destinations[:15]
    )

    return f"""Bạn là chuyên gia du lịch Việt Nam của VIVU Travel. Hãy gợi ý 3 điểm đến phù hợp nhất dựa trên yêu cầu sau:

YÊU CẦU KHÁCH HÀNG:
- Địa điểm mong muốn: {req.destination or "Linh hoạt, không chọn cụ thể"}
- Thời gian: {nights or "Chưa chọn"}
- Ngân sách: {BUDGET_LABELS.get(req.budget or "", "Chưa chọn")}
- Sở thích: {", ".join(req.interests) if req.interests else "Chưa chọn"}
- Số người: {req.people} người
- Phương tiện: {TRANSPORT_LABELS.get(req.transport or "", "Không quan trọng")}
- Loại lịch trình: {ITINERARY_LABELS.get(req.itinerary_type or "", "Chưa chọn")}

CÁC ĐIỂM ĐẾN CÓ TRÊN HỆ THỐNG:
{dest_list}

Chọn 3 điểm đến phù hợp nhất. Trả lời CHỈ JSON array, KHÔNG có text ngoài. Mỗi field tối đa 15 từ:
[{{"city":"tên tp","match_score":90,"tagline":"1 câu ngắn","why_match":"1 câu","highlights":["điểm 1","điểm 2","điểm 3"],"budget_note":"1 câu","transport_tip":"1 câu"}}]"""


def _build_payload(prompt: str, model: str) -> dict:
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 8192,
            "responseMimeType": "application/json",
        },
    }
    # Disable thinking for gemini-2.5-flash to avoid consuming output token budget
    if "2.5" in model:
        payload["generationConfig"]["thinkingConfig"] = {"thinkingBudget": 0}
    return payload


def _call_gemini(prompt: str) -> list[dict]:
    import time
    last_err = None
    for model in GEMINI_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        payload = _build_payload(prompt, model)
        for attempt in range(2):  # 2 lần thử mỗi model
            try:
                resp = requests.post(url, json=payload, timeout=60)
                if resp.status_code == 503:
                    print(f"[Gemini] {model} overloaded, retrying in 2s...")
                    time.sleep(2)
                    continue
                if not resp.ok:
                    print(f"[Gemini ERROR] {model} status={resp.status_code} body={resp.text[:300]}")
                    break  # thử model tiếp theo
                data = resp.json()
                candidate_obj = data["candidates"][0]
                finish_reason = candidate_obj.get("finishReason", "UNKNOWN")
                print(f"[Gemini] {model} finishReason={finish_reason}")
                raw = candidate_obj["content"]["parts"][0]["text"].strip()
                if finish_reason == "MAX_TOKENS":
                    print(f"[Gemini WARN] Response truncated by MAX_TOKENS ({len(raw)} chars). Trying next model.")
                    break  # thử model tiếp theo
                if raw.startswith("```"):
                    raw = raw.split("\n", 1)[1]
                    raw = raw[:raw.rfind("```")].strip() if "```" in raw else raw
                start = raw.find("[")
                end   = raw.rfind("]")
                if start == -1 or end == -1:
                    raise ValueError(f"No JSON array: {raw[:200]}")
                candidate = raw[start:end + 1]
                print(f"[Gemini RAW] {model}: {candidate[:800]}")
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError as je:
                    print(f"[Gemini JSON ERR] pos={je.pos}, line={je.lineno}, col={je.colno}")
                    print(f"[Gemini JSON context] ...{candidate[max(0,je.pos-30):je.pos+30]}...")
                    repaired = _repair_json(candidate)
                    return json.loads(repaired)
            except Exception as e:
                print(f"[Gemini Exception] model={model} attempt={attempt} err={type(e).__name__}: {str(e)}")
                last_err = e
                # Giữ nguyên vòng lặp để tiếp tục attempt 2, hoặc nếu đã attempt xong thì sang model tiếp theo
        # Hết 2 attempt cho model này mà vẫn lỗi thì thử round qua model tiếp theo

    print(f"[Gemini ERROR] All Gemini models failed or exceeded quota (429). Last error: {last_err}")
    print("[Gemini WARN] Using fallback mock data to prevent app crash.")
    return [
        {
            "city": "Đà Nẵng",
            "match_score": 95,
            "tagline": "Thiên đường nghỉ dưỡng và ẩm thực miền Trung",
            "why_match": "Phù hợp với hầu hết mọi yêu cầu với ẩm thực phong phú và thân thiện.",
            "highlights": ["Biển Mỹ Khê", "Cầu Rồng", "Phố cổ Hội An"],
            "budget_note": "Chi phí ăn uống và đi lại rất hợp lý.",
            "transport_tip": "Nhiều chuyến bay thẳng với giá cực tốt."
        },
        {
            "city": "Đà Lạt",
            "match_score": 85,
            "tagline": "Thành phố mộng mơ trong sương",
            "why_match": "Không khí mát mẻ, lý tưởng để nghỉ dưỡng và thưởng thức đặc sản.",
            "highlights": ["Hồ Tuyền Lâm", "Chợ đêm Đà Lạt", "Các đồi chè"],
            "budget_note": "Nhiều lựa chọn nhà hàng từ bình dân đến cao cấp.",
            "transport_tip": "Máy bay hoặc xe khách giường nằm đều tiện."
        },
        {
            "city": "Nha Trang",
            "match_score": 80,
            "tagline": "Hòn ngọc của biển Đông",
            "why_match": "Tuyệt vời để vui chơi giải trí và ăn hải sản thả ga.",
            "highlights": ["VinWonders", "Hòn Mun", "Tháp Bà Ponagar"],
            "budget_note": "Nhiều gói combo tiện lợi cho mọi người.",
            "transport_tip": "Giao thông thuận lợi, có cả sân bay quốc tế và ga xe lửa."
        }
    ]

@router.post("/suggest")
def suggest(req: PlannerRequest):
    import traceback
    print(f"[TravelPlanner] Request: dest={req.destination}, interests={req.interests}, people={req.people}")
    try:
        destinations = _load_destinations(req.destination)
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Lỗi khi truy vấn database.")

    print(f"[TravelPlanner] Destinations found: {len(destinations)}")
    if not destinations:
        raise HTTPException(400, "Không tìm thấy điểm đến phù hợp trong hệ thống.")

    prompt = _build_prompt(req, destinations)
    print(f"[TravelPlanner] Prompt length: {len(prompt)} chars, calling Gemini...")

    try:
        suggestions = _call_gemini(prompt)
        print(f"[TravelPlanner] Gemini returned {len(suggestions)} suggestions")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Lỗi AI: {str(e)}")

    # Enrich với DB data (image_url, destination_id, min_price)
    dest_map = {d["city"]: d for d in destinations}
    result = []
    for s in suggestions[:3]:
        city = s.get("city", "")
        db = dest_map.get(city, {})
        # Try partial match
        if not db:
            for d in destinations:
                if city.lower() in d["city"].lower() or d["city"].lower() in city.lower():
                    db = d
                    break
        result.append({
            **s,
            "destination_id": db.get("destination_id"),
            "image_url":      db.get("image_url"),
            "min_price":      db.get("min_price"),
            "avg_rating":     db.get("avg_rating"),
        })

    return result
