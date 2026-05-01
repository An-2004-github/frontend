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


async def send_otp_email(email: str, otp: str):
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; margin: 0; padding: 0; }}
        .wrapper {{ max-width: 480px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,82,204,0.1); }}
        .header {{ background: linear-gradient(135deg, #003580, #0065ff); padding: 2rem; text-align: center; }}
        .header h1 {{ color: #fff; font-size: 1.4rem; margin: 0; }}
        .body {{ padding: 2rem 2.5rem; text-align: center; }}
        .otp-box {{ background: #f0f4ff; border: 2px dashed #c8d8ff; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; }}
        .otp-code {{ font-family: 'Courier New', monospace; font-size: 2.5rem; font-weight: 800; color: #0052cc; letter-spacing: 8px; }}
        .expire {{ font-size: 0.82rem; color: #6b8cbf; margin-top: 0.5rem; }}
        .footer {{ background: #f8faff; padding: 1rem 2rem; text-align: center; color: #6b8cbf; font-size: 0.78rem; border-top: 1px solid #e8f0fe; }}
    </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="header"><h1>✈️ VIVU Travel — Xác nhận thay đổi</h1></div>
            <div class="body">
                <p style="color:#4a5568;font-size:0.95rem;">Mã xác nhận của bạn là:</p>
                <div class="otp-box">
                    <div class="otp-code">{otp}</div>
                    <div class="expire">Mã có hiệu lực trong 10 phút</div>
                </div>
                <p style="color:#6b8cbf;font-size:0.82rem;">Nếu bạn không yêu cầu thay đổi này, hãy bỏ qua email này.</p>
            </div>
            <div class="footer">© 2026 VIVU Travel</div>
        </div>
    </body>
    </html>
    """
    message = MessageSchema(
        subject="🔐 Mã xác nhận thay đổi thông tin VIVU",
        recipients=[email],
        body=html,
        subtype=MessageType.html,
    )
    try:
        await fm.send_message(message)
        print(f"✅ OTP email sent to {email}")
    except Exception as e:
        print(f"❌ OTP email error: {e}")


async def send_booking_confirmation_email(
    email: str,
    name: str,
    booking_id: int,
    service_name: str,
    amount: float,
    entity_type: str,
    check_in: str | None = None,
    check_out: str | None = None,
    booking_date: str | None = None,
    rooms: int | None = None,
    guests: int | None = None,
):
    type_icons = {"room": "🏨", "flight": "✈️", "bus": "🚌"}
    type_labels = {"room": "Khách sạn", "flight": "Chuyến bay", "bus": "Xe khách"}
    icon  = type_icons.get(entity_type, "🎫")
    label = type_labels.get(entity_type, "Dịch vụ")

    # Build extra rows
    extra_rows = ""
    if check_in:
        extra_rows += f"""
        <tr>
            <td style="padding:0.6rem 0;color:#6b8cbf;font-size:0.88rem;border-bottom:1px solid #f0f4ff;">📅 Nhận phòng</td>
            <td style="padding:0.6rem 0;font-weight:600;color:#1a3c6b;text-align:right;border-bottom:1px solid #f0f4ff;">{check_in}</td>
        </tr>"""
    if check_out:
        extra_rows += f"""
        <tr>
            <td style="padding:0.6rem 0;color:#6b8cbf;font-size:0.88rem;border-bottom:1px solid #f0f4ff;">📅 Trả phòng</td>
            <td style="padding:0.6rem 0;font-weight:600;color:#1a3c6b;text-align:right;border-bottom:1px solid #f0f4ff;">{check_out}</td>
        </tr>"""
    if rooms is not None:
        extra_rows += f"""
        <tr>
            <td style="padding:0.6rem 0;color:#6b8cbf;font-size:0.88rem;border-bottom:1px solid #f0f4ff;">🛏 Số phòng</td>
            <td style="padding:0.6rem 0;font-weight:600;color:#1a3c6b;text-align:right;border-bottom:1px solid #f0f4ff;">{rooms} phòng</td>
        </tr>"""
    if guests is not None:
        extra_rows += f"""
        <tr>
            <td style="padding:0.6rem 0;color:#6b8cbf;font-size:0.88rem;border-bottom:1px solid #f0f4ff;">👥 Số khách</td>
            <td style="padding:0.6rem 0;font-weight:600;color:#1a3c6b;text-align:right;border-bottom:1px solid #f0f4ff;">{guests} khách</td>
        </tr>"""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; margin: 0; padding: 0; }}
            .wrapper {{ max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,82,204,0.1); }}
            .header {{ background: linear-gradient(135deg, #003580, #0065ff); padding: 2.5rem 2rem; text-align: center; }}
            .header h1 {{ color: #fff; font-size: 1.5rem; margin: 0 0 0.4rem; }}
            .header p {{ color: rgba(255,255,255,0.75); margin: 0; font-size: 0.9rem; }}
            .success-badge {{ display:inline-block; background:rgba(255,255,255,0.15); border:1.5px solid rgba(255,255,255,0.4); color:#fff; border-radius:99px; padding:0.3rem 1rem; font-size:0.85rem; font-weight:600; margin-bottom:1rem; }}
            .body {{ padding: 2rem 2.5rem; }}
            .greeting {{ font-size: 1.05rem; color: #1a3c6b; font-weight: 600; margin-bottom: 0.5rem; }}
            .service-card {{ background:#f8faff; border:1px solid #e8f0fe; border-radius:12px; padding:1.25rem 1.5rem; margin:1.5rem 0; }}
            .service-icon {{ font-size:2rem; text-align:center; margin-bottom:0.75rem; }}
            .service-name {{ font-size:1rem; font-weight:700; color:#1a3c6b; text-align:center; margin-bottom:1.25rem; }}
            table {{ width:100%; border-collapse:collapse; }}
            .amount-row td {{ padding:0.75rem 0; font-size:1.1rem !important; }}
            .amount-val {{ font-size:1.15rem !important; color:#0052cc !important; font-weight:800 !important; }}
            .footer {{ background: #f8faff; padding: 1.25rem 2rem; text-align: center; color: #6b8cbf; font-size: 0.78rem; border-top: 1px solid #e8f0fe; line-height:1.6; }}
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="header">
                <div class="success-badge">✅ Đặt chỗ thành công</div>
                <h1>✈️ VIVU Travel</h1>
                <p>Cảm ơn bạn đã tin tưởng đặt dịch vụ tại VIVU</p>
            </div>
            <div class="body">
                <div class="greeting">Xin chào {name}! 👋</div>
                <p style="color:#4a5568;font-size:0.92rem;line-height:1.7;margin-bottom:0;">
                    Đặt chỗ của bạn đã được <strong style="color:#00875a;">xác nhận thành công</strong>.
                    Dưới đây là thông tin chi tiết:
                </p>

                <div class="service-card">
                    <div class="service-icon">{icon}</div>
                    <div class="service-name">{service_name}</div>
                    <table>
                        <tr>
                            <td style="padding:0.6rem 0;color:#6b8cbf;font-size:0.88rem;border-bottom:1px solid #f0f4ff;">📋 Mã đặt chỗ</td>
                            <td style="padding:0.6rem 0;font-weight:700;color:#0052cc;text-align:right;border-bottom:1px solid #f0f4ff;">#{booking_id}</td>
                        </tr>
                        <tr>
                            <td style="padding:0.6rem 0;color:#6b8cbf;font-size:0.88rem;border-bottom:1px solid #f0f4ff;">🏷 Loại dịch vụ</td>
                            <td style="padding:0.6rem 0;font-weight:600;color:#1a3c6b;text-align:right;border-bottom:1px solid #f0f4ff;">{label}</td>
                        </tr>
                        {extra_rows}
                        <tr>
                            <td style="padding:0.6rem 0;color:#6b8cbf;font-size:0.88rem;border-bottom:1px solid #f0f4ff;">📆 Ngày đặt</td>
                            <td style="padding:0.6rem 0;font-weight:600;color:#1a3c6b;text-align:right;border-bottom:1px solid #f0f4ff;">{booking_date or "—"}</td>
                        </tr>
                        <tr class="amount-row">
                            <td style="padding:0.75rem 0;color:#6b8cbf;font-size:0.88rem;">💰 Số tiền</td>
                            <td class="amount-val" style="text-align:right;">{amount:,.0f}₫</td>
                        </tr>
                    </table>
                </div>

                <p style="color:#6b8cbf;font-size:0.82rem;line-height:1.6;margin-top:0;">
                    Bạn có thể xem lại thông tin đặt chỗ trong mục <strong>Lịch sử đặt chỗ</strong> trên ứng dụng.
                    Nếu có bất kỳ thắc mắc nào, hãy liên hệ bộ phận hỗ trợ của chúng tôi.
                </p>
            </div>
            <div class="footer">
                © 2026 VIVU Travel · Email này được gửi tự động, vui lòng không trả lời.<br/>
                Cảm ơn bạn đã sử dụng dịch vụ của VIVU Travel! 🙏
            </div>
        </div>
    </body>
    </html>
    """

    message = MessageSchema(
        subject=f"✅ Xác nhận đặt chỗ #{booking_id} — VIVU Travel",
        recipients=[email],
        body=html,
        subtype=MessageType.html,
    )
    try:
        await fm.send_message(message)
        print(f"✅ Booking confirmation email sent to {email} (booking #{booking_id})")
    except Exception as e:
        print(f"❌ Booking confirmation email error: {e}")


async def send_reset_password_email(email: str, name: str, otp: str):
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; margin: 0; padding: 0; }}
        .wrapper {{ max-width: 480px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,82,204,0.1); }}
        .header {{ background: linear-gradient(135deg, #003580, #0065ff); padding: 2rem; text-align: center; }}
        .header h1 {{ color: #fff; font-size: 1.4rem; margin: 0; }}
        .body {{ padding: 2rem 2.5rem; text-align: center; }}
        .otp-box {{ background: #f0f4ff; border: 2px dashed #c8d8ff; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; }}
        .otp-code {{ font-family: 'Courier New', monospace; font-size: 2.5rem; font-weight: 800; color: #0052cc; letter-spacing: 8px; }}
        .expire {{ font-size: 0.82rem; color: #6b8cbf; margin-top: 0.5rem; }}
        .warning {{ background: #fff8e1; border-left: 4px solid #f39c12; padding: 0.75rem 1rem; border-radius: 0 8px 8px 0; font-size: 0.83rem; color: #7b5700; text-align: left; margin-top: 1rem; }}
        .footer {{ background: #f8faff; padding: 1rem 2rem; text-align: center; color: #6b8cbf; font-size: 0.78rem; border-top: 1px solid #e8f0fe; }}
    </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="header"><h1>🔑 VIVU Travel — Đặt lại mật khẩu</h1></div>
            <div class="body">
                <p style="color:#1a3c6b;font-size:1rem;font-weight:600;">Xin chào {name}!</p>
                <p style="color:#4a5568;font-size:0.92rem;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Sử dụng mã OTP bên dưới:</p>
                <div class="otp-box">
                    <div class="otp-code">{otp}</div>
                    <div class="expire">Mã có hiệu lực trong 10 phút</div>
                </div>
                <div class="warning">⚠️ Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.</div>
            </div>
            <div class="footer">© 2026 VIVU Travel · Email tự động, vui lòng không trả lời.</div>
        </div>
    </body>
    </html>
    """
    message = MessageSchema(
        subject="🔑 Đặt lại mật khẩu VIVU Travel",
        recipients=[email],
        body=html,
        subtype=MessageType.html,
    )
    try:
        await fm.send_message(message)
        print(f"✅ Reset password email sent to {email}")
    except Exception as e:
        print(f"❌ Reset password email error: {e}")


async def send_withdrawal_success_email(email: str, name: str, amount: float, bank_info: str):
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; margin: 0; padding: 0; }}
            .wrapper {{ max-width: 520px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,82,204,0.1); }}
            .header {{ background: linear-gradient(135deg, #003580, #0052cc); padding: 2rem; text-align: center; }}
            .header h1 {{ color: #fff; font-size: 1.4rem; margin: 0 0 0.4rem; }}
            .success-badge {{ display:inline-block; background:rgba(255,255,255,0.15); border:1.5px solid rgba(255,255,255,0.4); color:#fff; border-radius:99px; padding:0.3rem 1rem; font-size:0.85rem; font-weight:600; margin-bottom:0.75rem; }}
            .body {{ padding: 2rem 2.5rem; }}
            .info-card {{ background:#f0f4ff; border:1px solid #e8f0fe; border-radius:12px; padding:1.25rem 1.5rem; margin:1.5rem 0; }}
            table {{ width:100%; border-collapse:collapse; }}
            td {{ padding:0.6rem 0; border-bottom:1px solid #e8f0fe; font-size:0.88rem; }}
            tr:last-child td {{ border-bottom:none; }}
            .footer {{ background: #f8faff; padding: 1rem 2rem; text-align: center; color: #6b8cbf; font-size: 0.78rem; border-top: 1px solid #e8f0fe; }}
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="header">
                <div class="success-badge">✅ Rút tiền thành công</div>
                <h1>💸 VIVU Travel — Thông báo ví</h1>
            </div>
            <div class="body">
                <p style="color:#1a3c6b;font-size:1rem;font-weight:600;">Xin chào {name}! 👋</p>
                <p style="color:#4a5568;font-size:0.92rem;line-height:1.7;">
                    Yêu cầu rút tiền của bạn đã được <strong style="color:#00875a;">xử lý thành công</strong>.
                    Tiền đã được chuyển tới tài khoản của bạn.
                </p>
                <div class="info-card">
                    <table>
                        <tr>
                            <td style="color:#6b8cbf;">💰 Số tiền rút</td>
                            <td style="text-align:right;font-weight:800;color:#0052cc;font-size:1.05rem;">{amount:,.0f}₫</td>
                        </tr>
                        <tr>
                            <td style="color:#6b8cbf;">🏦 Tài khoản nhận</td>
                            <td style="text-align:right;font-weight:600;color:#1a3c6b;">{bank_info}</td>
                        </tr>
                    </table>
                </div>
                <p style="color:#6b8cbf;font-size:0.82rem;line-height:1.6;">
                    Nếu bạn không thực hiện giao dịch này, vui lòng liên hệ ngay bộ phận hỗ trợ.
                </p>
            </div>
            <div class="footer">© 2026 VIVU Travel · Email tự động, vui lòng không trả lời.</div>
        </div>
    </body>
    </html>
    """
    message = MessageSchema(
        subject="💸 Rút tiền thành công — VIVU Travel",
        recipients=[email],
        body=html,
        subtype=MessageType.html,
    )
    try:
        await fm.send_message(message)
        print(f"✅ Withdrawal email sent to {email}")
    except Exception as e:
        print(f"❌ Withdrawal email error: {e}")


async def send_welcome_email(email: str, name: str):
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


async def send_cancel_confirmation_email(email: str, name: str, booking_id: int,
                                         service_name: str, refund_amount: float,
                                         cancel_fee: float, refund_method: str,
                                         non_refundable: bool = False):
    fmt = lambda n: f"{n:,.0f}₫"

    if non_refundable:
        body_content = f"""
            <p>Xin chào <strong>{name}</strong>,</p>
            <p>Đặt chỗ của bạn đã được hủy thành công.</p>
            <div class="row"><span class="lbl">Dịch vụ</span><span class="val">{service_name}</span></div>
            <div class="row"><span class="lbl">Số tiền đã thanh toán</span><span class="val" style="color:#c0392b">{fmt(cancel_fee)}</span></div>
            <div class="nonrefund">
                ⛔ <strong>Vé không hoàn tiền</strong><br>
                Theo chính sách, đặt chỗ này không được hoàn tiền khi hủy.<br>
                Toàn bộ <strong>{fmt(cancel_fee)}</strong> đã bị mất.
            </div>"""
    else:
        refund_label = "Ví VIVU" if refund_method == "wallet" else "Tài khoản ngân hàng"
        body_content = f"""
            <p>Xin chào <strong>{name}</strong>,</p>
            <p>Đặt chỗ của bạn đã được hủy. Dưới đây là thông tin chi tiết:</p>
            <div class="row"><span class="lbl">Dịch vụ</span><span class="val">{service_name}</span></div>
            {'<div class="row"><span class="lbl">Phí hủy</span><span class="val" style="color:#c0392b">' + fmt(cancel_fee) + '</span></div>' if cancel_fee > 0 else ''}
            <div class="row"><span class="lbl">Số tiền hoàn</span><span class="val" style="color:#00875a">{fmt(refund_amount)}</span></div>
            <div class="row"><span class="lbl">Phương thức hoàn tiền</span><span class="val">{refund_label}</span></div>
            <div class="note">⏱ Yêu cầu hoàn tiền sẽ được xử lý trong vòng <strong>2–5 ngày làm việc</strong>.</div>"""

    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
        body{{font-family:'Segoe UI',Arial,sans-serif;background:#f0f4ff;margin:0;padding:0}}
        .w{{max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,82,204,.1)}}
        .hd{{background:linear-gradient(135deg,#003580,#c0392b);padding:2rem;text-align:center;color:#fff}}
        .hd h1{{margin:0;font-size:1.4rem}} .hd p{{margin:.4rem 0 0;opacity:.8;font-size:.9rem}}
        .bd{{padding:2rem}} .row{{display:flex;justify-content:space-between;padding:.6rem 0;border-bottom:1px solid #f0f4ff;font-size:.9rem}}
        .row:last-child{{border:none}} .lbl{{color:#6b8cbf}} .val{{font-weight:600;color:#1a3c6b}}
        .note{{background:#fff8e1;border-left:4px solid #f39c12;padding:1rem;margin:1rem 0;border-radius:0 8px 8px 0;font-size:.85rem;color:#7b5700}}
        .nonrefund{{background:#fff0ee;border-left:4px solid #e74c3c;padding:1rem;margin:1rem 0;border-radius:0 8px 8px 0;font-size:.87rem;color:#7b0000;line-height:1.6}}
        .ft{{background:#f8faff;padding:1rem 2rem;text-align:center;font-size:.8rem;color:#6b8cbf}}
    </style></head><body>
    <div class="w">
        <div class="hd"><h1>❌ Hủy đặt chỗ thành công</h1><p>Mã đặt chỗ #{booking_id}</p></div>
        <div class="bd">{body_content}</div>
        <div class="ft">VIVU Travel — Cảm ơn bạn đã sử dụng dịch vụ</div>
    </div></body></html>"""

    await fm.send_message(MessageSchema(
        subject=f"❌ Hủy đặt chỗ #{booking_id} — VIVU Travel",
        recipients=[email], body=html, subtype=MessageType.html,
    ))


async def send_reschedule_confirmation_email(
    email: str, name: str, booking_id: int, service_name: str,
    old_check_in: str = "", old_check_out: str = "",
    new_check_in: str = "", new_check_out: str = "",
    old_price: float = 0, new_price: float = 0,
    reschedule_fee: float = 0, amount_to_pay: float = 0,
    refund_amount: float = 0, refund_method: str = "",
    quantity: int = 1, entity_type: str = "room",
):
    def fmt(n): return f"{n:,.0f}₫"

    # Bảng thông tin đặt chỗ
    def row(label, val, color=""):
        style = f'color:{color};font-weight:700' if color else 'color:#1a3c6b'
        return f'<tr><td style="padding:6px 0;color:#6b8cbf;font-size:.85rem">{label}</td><td style="padding:6px 0;{style};font-size:.88rem;text-align:right">{val}</td></tr>'

    date_rows = ""
    if entity_type == "room":
        qty_label = f"{quantity} phòng" if quantity > 1 else "1 phòng"
        if old_check_in:
            date_rows += row("Ngày nhận phòng cũ", old_check_in, "#bf2600")
        if old_check_out:
            date_rows += row("Ngày trả phòng cũ", old_check_out, "#bf2600")
        if new_check_in:
            date_rows += row("Ngày nhận phòng mới", new_check_in, "#00875a")
        if new_check_out:
            date_rows += row("Ngày trả phòng mới", new_check_out, "#00875a")
        date_rows += row("Số phòng", qty_label)
    else:
        if old_check_in:
            date_rows += row("Lịch cũ", old_check_in, "#bf2600")
        if new_check_in:
            date_rows += row("Lịch mới", new_check_in, "#00875a")

    price_rows = ""
    if old_price:
        price_rows += row("Giá cũ", fmt(old_price))
    if new_price:
        price_rows += row("Giá mới", fmt(new_price))
    if reschedule_fee > 0:
        price_rows += row("Phí đổi lịch", fmt(reschedule_fee), "#bf2600")

    # Thông báo thanh toán / hoàn tiền
    payment_block = ""
    if amount_to_pay >= 1:
        payment_block = f'<div style="background:#fff3e0;border-left:4px solid #f57c00;padding:1rem;margin:1.2rem 0;border-radius:0 8px 8px 0"><strong style="color:#e65100">💳 Cần thanh toán thêm: {fmt(amount_to_pay)}</strong><br><span style="font-size:.82rem;color:#6b8cbf">Vui lòng hoàn tất thanh toán trên ứng dụng VIVU Travel.</span></div>'
    elif refund_amount >= 1:
        method_vn = "ví VIVU" if refund_method == "wallet" else "tài khoản ngân hàng (2–5 ngày làm việc)"
        payment_block = f'<div style="background:#e8f5e9;border-left:4px solid #00875a;padding:1rem;margin:1.2rem 0;border-radius:0 8px 8px 0"><strong style="color:#00875a">💰 Hoàn tiền: {fmt(refund_amount)}</strong><br><span style="font-size:.82rem;color:#6b8cbf">Sẽ được hoàn vào {method_vn}.</span></div>'

    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{{font-family:'Segoe UI',Arial,sans-serif;background:#f0f4ff;margin:0;padding:0}}
  .w{{max-width:540px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,82,204,.1)}}
  .hd{{background:linear-gradient(135deg,#003580,#0052cc);padding:2rem;text-align:center;color:#fff}}
  .hd h1{{margin:0;font-size:1.4rem}} .hd p{{margin:.4rem 0 0;opacity:.8;font-size:.9rem}}
  .bd{{padding:2rem;font-size:.92rem;color:#1a3c6b}}
  .box{{background:#f8faff;border-radius:10px;padding:1rem 1.25rem;margin:1.2rem 0}}
  .box-title{{font-size:.78rem;font-weight:700;color:#6b8cbf;text-transform:uppercase;letter-spacing:.5px;margin-bottom:.5rem}}
  table{{width:100%;border-collapse:collapse}}
  .ft{{background:#f8faff;padding:1rem 2rem;text-align:center;font-size:.8rem;color:#6b8cbf}}
</style></head><body>
<div class="w">
  <div class="hd"><h1>🔄 Đổi lịch thành công</h1><p>Mã đặt chỗ #{booking_id}</p></div>
  <div class="bd">
    <p>Xin chào <strong>{name}</strong>,</p>
    <p>Lịch đặt chỗ của bạn đã được cập nhật thành công.</p>

    <div class="box">
      <div class="box-title">📋 Thông tin dịch vụ</div>
      <table>{row("Dịch vụ", f"<strong>{service_name}</strong>")}{date_rows}</table>
    </div>

    <div class="box">
      <div class="box-title">💵 Chi tiết giá</div>
      <table>{price_rows}</table>
    </div>

    {payment_block}

    <p style="font-size:.85rem;color:#6b8cbf;margin-top:1.5rem">
      Mọi thắc mắc vui lòng liên hệ VIVU Travel qua email hoặc hotline.
    </p>
  </div>
  <div class="ft">VIVU Travel — Chúc bạn có chuyến đi vui vẻ! 🌟</div>
</div></body></html>"""

    await fm.send_message(MessageSchema(
        subject=f"🔄 Đổi lịch đặt chỗ #{booking_id} — VIVU Travel",
        recipients=[email], body=html, subtype=MessageType.html,
    ))
