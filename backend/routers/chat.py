from fastapi import APIRouter
from pydantic import BaseModel
import requests
import os

router = APIRouter(prefix="/api/chat", tags=["chat"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

SYSTEM_PROMPT = """Bạn là trợ lý ảo của VIVU Travel — nền tảng đặt phòng khách sạn, vé máy bay và xe khách hàng đầu Việt Nam.

Nhiệm vụ của bạn:
- Hỗ trợ khách hàng tìm kiếm và đặt dịch vụ du lịch (khách sạn, vé máy bay, xe khách)
- Giải đáp thắc mắc về quy trình đặt chỗ, thanh toán, hủy vé, đổi lịch
- Gợi ý điểm đến, lịch trình du lịch phù hợp
- Hướng dẫn sử dụng tính năng Ví VIVU (nạp tiền, rút tiền, thanh toán)
- Giải thích chính sách hủy phòng, đổi lịch

Chính sách quan trọng:
- Hủy phòng khách sạn trước 3 ngày: miễn phí. Trong vòng 3 ngày: phí 30%
- Hủy vé máy bay/xe trước 3 ngày: phí 10%. Trong ngày: phí 30%
- Đổi lịch miễn phí, chênh lệch giá được thanh toán hoặc hoàn trả tự động
- Hoàn tiền về ví: tức thì. Hoàn về ngân hàng: 2–5 ngày làm việc

Phong cách trả lời:
- Thân thiện, ngắn gọn, chuyên nghiệp
- Dùng tiếng Việt
- Dùng emoji phù hợp để dễ đọc
- Nếu không biết thông tin cụ thể (giá, lịch trình cụ thể), hãy hướng dẫn user tìm kiếm trên web
"""


class Message(BaseModel):
    role: str   # "user" | "model"
    text: str


class ChatRequest(BaseModel):
    messages: list[Message]


@router.post("")
def chat(data: ChatRequest):
    # Build conversation contents
    contents = []
    for msg in data.messages:
        contents.append({
            "role": msg.role,
            "parts": [{"text": msg.text}]
        })

    payload = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1024,
        }
    }

    try:
        res = requests.post(GEMINI_URL, json=payload, timeout=30)
        if not res.ok:
            print(f"Gemini HTTP {res.status_code}: {res.text}")
            return {"reply": "😞 Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau ít phút."}
        data_json = res.json()
        reply = data_json["candidates"][0]["content"]["parts"][0]["text"]
        return {"reply": reply}
    except requests.exceptions.Timeout:
        return {"reply": "⏱ Xin lỗi, phản hồi mất quá nhiều thời gian. Vui lòng thử lại."}
    except Exception as e:
        print(f"Gemini error: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response body: {e.response.text}")
        return {"reply": "😞 Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau ít phút."}
