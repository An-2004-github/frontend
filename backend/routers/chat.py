from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import date
from sqlalchemy import text
from database import engine
import httpx
import requests
import json
import os
from typing import Optional
from auth import SECRET_KEY, ALGORITHM
from jose import jwt, JWTError

router = APIRouter(prefix="/api/chat", tags=["chat"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
print(f"[Chat] GEMINI_API_KEY loaded: ...{GEMINI_API_KEY[-8:] if GEMINI_API_KEY else 'EMPTY'}")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

SYSTEM_PROMPT = """Bạn là trợ lý ảo của VIVU Travel — nền tảng đặt phòng khách sạn, vé máy bay, tàu hỏa và xe khách hàng đầu Việt Nam.

## NHIỆM VỤ
- Hỗ trợ tìm kiếm và đặt dịch vụ du lịch (khách sạn, vé máy bay, tàu hỏa, xe khách)
- Gợi ý điểm đến, lịch trình phù hợp với nhu cầu từng người
- Giải đáp chính sách đặt chỗ, thanh toán, hủy vé, đổi lịch
- Tư vấn mã giảm giá phù hợp

## HỘI THOẠI NHIỀU BƯỚC (RẤT QUAN TRỌNG)
Bạn phải duy trì ngữ cảnh xuyên suốt cuộc hội thoại:

1. **Ghi nhớ thông tin đã biết**: Nếu user đã nói điểm đến, ngày đi, số người, ngân sách → dùng lại trong các câu trả lời sau, không hỏi lại.

2. **Hỏi từng bước**: Chỉ hỏi 1-2 thông tin còn thiếu mỗi lượt, không hỏi tất cả cùng lúc.
   - Lượt 1: Hỏi điểm đến (nếu chưa biết)
   - Lượt 2: Hỏi ngày đi / số ngày (nếu chưa biết)
   - Lượt 3: Hỏi số người / ngân sách (nếu cần)
   - Lượt 4+: Đưa ra gợi ý cụ thể kèm link

3. **Hiểu câu hỏi nối tiếp**: Khi user hỏi "còn tàu hỏa?", "giá bao nhiêu?", "có rẻ hơn không?" → hiểu là đang hỏi về chủ đề vừa nói.

4. **Tinh chỉnh gợi ý**: Nếu user phản hồi "đắt quá", "muốn chỗ yên tĩnh hơn", "gần biển" → điều chỉnh gợi ý phù hợp hơn.

5. **Tóm tắt khi cần**: Trước khi đưa link, tóm tắt ngắn: "Vậy bạn cần khách sạn tại Đà Nẵng, nhận phòng 20/4, 2 người, ngân sách khoảng 1 triệu/đêm. Đây là gợi ý:"

Ví dụ hội thoại nhiều bước:
- User: "Tôi muốn đi du lịch"
- Bot: "Tuyệt! Bạn đang muốn đi đâu? 🗺️"
- User: "Đà Nẵng"
- Bot: "Đà Nẵng đẹp lắm! Bạn dự kiến đi khoảng ngày nào và mấy người?"
- User: "20/4, 2 người, 3 ngày"
- Bot: "Để tôi gợi ý cho bạn: [🏨 Khách sạn Đà Nẵng 20–23/4](/hotels?search=Đà Nẵng&check_in=2026-04-20&check_out=2026-04-23) · [✈️ Bay Hà Nội→Đà Nẵng 20/4](/flights?from=Hà Nội&to=Đà Nẵng&date=2026-04-20)"
- User: "Còn tàu hỏa thì sao?"
- Bot: (nhớ Đà Nẵng, 20/4) "Tàu hỏa đến Đà Nẵng ngày 20/4: [🚆 Tàu Hà Nội→Đà Nẵng 20/4](/trains?from=Hà Nội&to=Đà Nẵng&date=2026-04-20)"

## GỢI Ý LỊCH TRÌNH
Khi user hỏi về lịch trình / itinerary tại một địa điểm, hãy:

1. **Hỏi thông tin cần thiết** (nếu chưa biết): số ngày, số người, sở thích (biển/núi/văn hóa/ẩm thực/mua sắm), ngân sách.

2. **Trình bày lịch trình theo ngày**, mỗi ngày gồm: sáng / chiều / tối, địa điểm tham quan cụ thể, gợi ý ăn uống.

3. **Kèm link đặt dịch vụ** ở cuối lịch trình:
   - Link khách sạn tại điểm đến
   - Link phương tiện di chuyển (bay / tàu / xe tùy khoảng cách)

4. **Định dạng mẫu**:
```
### 🗺️ Lịch trình [Địa điểm] [N ngày N đêm]

**Ngày 1 — [Chủ đề ngày]**
- 🌅 Sáng: ...
- ☀️ Chiều: ...
- 🌙 Tối: ...

**Ngày 2 — [Chủ đề ngày]**
- 🌅 Sáng: ...
...

📌 **Đặt dịch vụ**: [🏨 Khách sạn](/hotels?search=...) · [✈️ Vé máy bay](/flights?from=...&to=...) · [🚌 Xe khách](/buses?from=...&to=...)
```

5. **Sau lịch trình**, hỏi: "Bạn muốn tôi điều chỉnh gì không? (ngân sách, phong cách, số ngày...)"

## CHÍNH SÁCH
- Hủy khách sạn trước 3 ngày: miễn phí. Trong 3 ngày: phí 30%
- Hủy vé máy bay/tàu/xe trước 3 ngày: phí 10%. Trong ngày: phí 30%
- Đổi lịch: miễn phí, chênh lệch giá hoàn/thu tự động
- Hoàn tiền ví: tức thì. Hoàn ngân hàng: 2–5 ngày làm việc

## LINK ĐIỀU HƯỚNG
**BẮT BUỘC**: Mọi tên tỉnh/thành phố/địa điểm du lịch đều phải là link có thể click, KHÔNG bao giờ dùng `**tên thành phố**` (bold) đứng một mình.

- Khi liệt kê địa điểm: `[Đà Nẵng](/hotels?search=Đà Nẵng)`, `[Phú Quốc](/hotels?search=Phú Quốc)`, ... (KHÔNG viết `**Đà Nẵng**`)
- Khi gợi ý dịch vụ: dùng link đầy đủ với icon

**QUAN TRỌNG**: Chỉ dùng đường dẫn tương đối, KHÔNG bao giờ dùng domain (không có https://, không có tên miền).

URL mẫu (thay X=điểm đi, Y=điểm đến, ngày theo YYYY-MM-DD):
- Khách sạn: `/hotels?search=Y` hoặc `/hotels?search=Y&check_in=YYYY-MM-DD&check_out=YYYY-MM-DD`
- Bay: `/flights?from=X&to=Y` hoặc `/flights?from=X&to=Y&date=YYYY-MM-DD`
- Tàu: `/trains?from=X&to=Y` hoặc `/trains?from=X&to=Y&date=YYYY-MM-DD`
- Xe: `/buses?from=X&to=Y` hoặc `/buses?from=X&to=Y&date=YYYY-MM-DD`

Ví dụ đúng khi liệt kê: `Biển đảo: [Đà Nẵng](/hotels?search=Đà Nẵng), [Phú Quốc](/hotels?search=Phú Quốc), [Nha Trang](/hotels?search=Nha Trang)`
Ví dụ SAI: `Biển đảo: **Đà Nẵng**, **Phú Quốc**, **Nha Trang**` ← không làm vậy
Ví dụ SAI: `[🏨 Khách sạn Đà Nẵng](https://vivuvuive.io.vn/hotels?search=Đà Nẵng)` ← không dùng domain

Định dạng ngày trong URL: **YYYY-MM-DD** (ví dụ: 2026-04-20)
- "15/4" → 2026-04-15
- "tuần sau" → hôm nay + 7 ngày
- "hè" → 2026-06-01 đến 2026-08-31

## PHONG CÁCH
- Thân thiện, tự nhiên như người tư vấn thực sự
- Ngắn gọn — không liệt kê dài dòng khi chưa biết nhu cầu
- Dùng tiếng Việt, emoji vừa phải
- Ưu tiên hỏi để hiểu đúng nhu cầu trước khi gợi ý
"""


class Message(BaseModel):
    role: str   # "user" | "model"
    text: str


class ChatRequest(BaseModel):
    messages: list[Message]


def _get_promo_context() -> str:
    """Lấy danh sách mã khuyến mãi đang active từ DB."""
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT code, description, discount_type, discount_percent,
                       max_discount, min_order_value, usage_limit, used_count,
                       per_user_limit, applies_to, expired_at
                FROM promotions
                WHERE status = 'active'
                  AND (expired_at IS NULL OR expired_at > NOW())
                  AND (usage_limit IS NULL OR used_count < usage_limit)
                ORDER BY discount_percent DESC
            """)).fetchall()

        if not rows:
            return "Hiện tại không có mã khuyến mãi nào đang hoạt động."

        lines = ["Danh sách mã khuyến mãi đang có hiệu lực:"]
        for r in rows:
            p = dict(r._mapping)
            if p["discount_type"] == "percent":
                discount_str = f"giảm {p['discount_percent']}%"
                if p["max_discount"] and p["max_discount"] > 0:
                    discount_str += f" (tối đa {int(p['max_discount']):,}₫)"
            else:
                discount_str = f"giảm {int(p['discount_percent']):,}₫ cố định"

            applies = {
                "all": "tất cả dịch vụ",
                "hotel": "khách sạn",
                "flight": "chuyến bay",
                "bus": "xe khách",
                "train": "tàu hỏa",
            }.get(p["applies_to"], p["applies_to"])

            conditions = []
            if p["min_order_value"] and p["min_order_value"] > 0:
                conditions.append(f"đơn tối thiểu {int(p['min_order_value']):,}₫")
            if p["per_user_limit"] == 1:
                conditions.append("mỗi tài khoản chỉ dùng 1 lần")
            elif p["per_user_limit"]:
                conditions.append(f"tối đa {p['per_user_limit']} lần/tài khoản")
            if p["expired_at"]:
                conditions.append(f"hết hạn {str(p['expired_at'])[:10]}")

            cond_str = f" ({', '.join(conditions)})" if conditions else ""
            desc = f" — {p['description']}" if p["description"] else ""
            lines.append(f"- Mã **{p['code']}**: {discount_str}, áp dụng cho {applies}{cond_str}{desc}")

        return "\n".join(lines)
    except Exception as e:
        print(f"Promo fetch error: {e}")
        return ""


def _build_payload(messages: list[Message]) -> dict:
    today = date.today().strftime("%Y-%m-%d")
    promo_context = _get_promo_context()
    system_prompt = (
        SYSTEM_PROMPT
        + f"\nHôm nay là: {today}. Dùng ngày này để tính các mốc thời gian tương đối."
        + f"\n\n{promo_context}"
        + "\n\nKhi user hỏi về giảm giá, khuyến mãi: gợi ý mã phù hợp, giải thích điều kiện rõ ràng."
    )
    return {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": m.role, "parts": [{"text": m.text}]} for m in messages],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2048},
    }


# ── Streaming endpoint ────────────────────────────────────────────
GEMINI_STREAM_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key={GEMINI_API_KEY}"

@router.post("/stream")
async def chat_stream(data: ChatRequest):
    payload = _build_payload(data.messages)

    async def generate():
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                async with client.stream("POST", GEMINI_STREAM_URL, json=payload) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            raw = line[6:].strip()
                            if not raw or raw == "[DONE]":
                                continue
                            try:
                                obj = json.loads(raw)
                                text_chunk = obj["candidates"][0]["content"]["parts"][0].get("text", "")
                                if text_chunk:
                                    yield f"data: {json.dumps({'text': text_chunk})}\n\n"
                            except Exception:
                                continue
        except Exception as e:
            print(f"[Gemini stream] error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ── Non-streaming fallback ────────────────────────────────────────
@router.post("")
def chat(data: ChatRequest):
    payload = _build_payload(data.messages)
    try:
        res = requests.post(GEMINI_URL, json=payload, timeout=30)
        if not res.ok:
            print(f"[Gemini] HTTP {res.status_code}: {res.text[:500]}")
            return {"reply": "😞 Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau ít phút."}
        reply = res.json()["candidates"][0]["content"]["parts"][0]["text"]
        return {"reply": reply}
    except requests.exceptions.Timeout:
        return {"reply": "⏱ Xin lỗi, phản hồi mất quá nhiều thời gian. Vui lòng thử lại."}
    except Exception as e:
        print(f"Gemini error: {e}")
        return {"reply": "😞 Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau ít phút."}


# ── Destination feedback (like/dislike) ──────────────────────────
class DestFeedback(BaseModel):
    city: str          # tên thành phố
    action: str        # "like" | "dislike"


def _get_user_id_optional(authorization: Optional[str]) -> Optional[int]:
    """Đọc user_id từ Bearer token, trả None nếu không có / không hợp lệ."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("user_id")
    except JWTError:
        return None


@router.post("/feedback")
def chat_feedback(
    body: DestFeedback,
    authorization: Optional[str] = Header(default=None),
):
    """Lưu phản hồi Thích / Không thích cho một địa điểm từ chatbot."""
    user_id = _get_user_id_optional(authorization)
    city = body.city.strip()[:100]
    action = body.action if body.action in ("like", "dislike") else "like"

    # Tạo bảng nếu chưa có (idempotent)
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS chat_destination_feedback (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                user_id    INT,
                city       VARCHAR(100) NOT NULL,
                action     ENUM('like','dislike') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (user_id),
                INDEX (city)
            )
        """))
        conn.execute(text("""
            INSERT INTO chat_destination_feedback (user_id, city, action)
            VALUES (:uid, :city, :action)
        """), {"uid": user_id, "city": city, "action": action})

        # Nếu user đã đăng nhập → ghi thêm vào user_interactions để train NCF
        if user_id:
            # Tìm destination_id theo city
            row = conn.execute(text("""
                SELECT destination_id FROM destinations
                WHERE city LIKE :city OR name LIKE :city
                LIMIT 1
            """), {"city": f"%{city}%"}).fetchone()

            if row:
                dest_id = row[0]
                interaction_action = "like" if action == "like" else "dislike"
                conn.execute(text("""
                    INSERT INTO user_interactions (user_id, entity_type, entity_id, action)
                    VALUES (:uid, 'destination', :eid, :action)
                """), {"uid": user_id, "eid": dest_id, "action": interaction_action})

    return {"ok": True}
