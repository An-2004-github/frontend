from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr

# ================================================================
# CẤU HÌNH EMAIL — thay bằng thông tin thật của bạn
# ================================================================
conf = ConnectionConfig(
    MAIL_USERNAME   = "leanzxj@gmail.com",       # ← Gmail của bạn
    MAIL_PASSWORD   = "xsphlfhdjetytobo",           # ← App Password (không phải mật khẩu Gmail)
    MAIL_FROM       = "leanzxj@gmail.com",
    MAIL_FROM_NAME  = "VIVU Travel",
    MAIL_PORT       = 587,
    MAIL_SERVER     = "smtp.gmail.com",
    MAIL_STARTTLS   = True,
    MAIL_SSL_TLS    = False,
    USE_CREDENTIALS = True,
)

fm = FastMail(conf)


async def send_welcome_email(email: EmailStr, name: str):
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; margin: 0; padding: 0; }}
            .wrapper {{ max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,82,204,0.1); }}
            .header {{ background: linear-gradient(135deg, #003580, #0065ff); padding: 2.5rem 2rem; text-align: center; }}
            .header h1 {{ color: #fff; font-size: 1.75rem; margin: 0; letter-spacing: -0.5px; }}
            .header p {{ color: rgba(255,255,255,0.75); margin: 0.5rem 0 0; font-size: 0.95rem; }}
            .body {{ padding: 2rem 2.5rem; }}
            .greeting {{ font-size: 1.1rem; color: #1a3c6b; font-weight: 600; margin-bottom: 1rem; }}
            .text {{ color: #4a5568; line-height: 1.7; font-size: 0.95rem; margin-bottom: 1rem; }}
            .features {{ background: #f0f4ff; border-radius: 12px; padding: 1.25rem 1.5rem; margin: 1.5rem 0; }}
            .feature {{ display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem; color: #1a3c6b; font-size: 0.9rem; }}
            .feature:last-child {{ margin-bottom: 0; }}
            .btn {{ display: block; width: fit-content; margin: 1.5rem auto; padding: 0.75rem 2rem; background: linear-gradient(135deg, #0052cc, #0065ff); color: #fff !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 0.95rem; text-align: center; }}
            .footer {{ background: #f8faff; padding: 1.25rem 2rem; text-align: center; color: #6b8cbf; font-size: 0.8rem; border-top: 1px solid #e8f0fe; }}
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="header">
                <h1>✈️ VIVU Travel</h1>
                <p>Khám phá thế giới theo cách của bạn</p>
            </div>
            <div class="body">
                <div class="greeting">Xin chào {name}! 👋</div>
                <p class="text">
                    Chào mừng bạn đến với <strong>VIVU Travel</strong> — nền tảng đặt vé và khách sạn hàng đầu Việt Nam.
                    Tài khoản của bạn đã được tạo thành công!
                </p>
                <div class="features">
                    <div class="feature">🏨 Đặt khách sạn với hàng trăm lựa chọn</div>
                    <div class="feature">✈️ Tìm vé máy bay giá rẻ nhất</div>
                    <div class="feature">🚌 Đặt vé xe khách nhanh chóng</div>
                    <div class="feature">🎁 Nhận ưu đãi độc quyền dành riêng cho thành viên</div>
                </div>
                <p class="text">
                    Bắt đầu hành trình của bạn ngay hôm nay!
                </p>
                <a href="http://localhost:3000" class="btn">Khám phá ngay →</a>
            </div>
            <div class="footer">
                © 2026 VIVU Travel · Bạn nhận email này vì vừa đăng ký tài khoản tại VIVU.<br/>
                Nếu không phải bạn, vui lòng bỏ qua email này.
            </div>
        </div>
    </body>
    </html>
    """

    message = MessageSchema(
        subject="🎉 Chào mừng bạn đến với VIVU Travel!",
        recipients=[email],
        body=html,
        subtype=MessageType.html,
    )

    await fm.send_message(message)