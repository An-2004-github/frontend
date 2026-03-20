"use client";

import { useState } from "react";

interface NotifSetting {
    key: string;
    icon: string;
    title: string;
    desc: string;
    enabled: boolean;
}

const DEFAULT_SETTINGS: NotifSetting[] = [
    { key: "booking_confirm", icon: "✅", title: "Xác nhận đặt chỗ", desc: "Thông báo khi đơn đặt chỗ được xác nhận", enabled: true },
    { key: "booking_reminder", icon: "⏰", title: "Nhắc chuyến đi", desc: "Nhắc nhở trước ngày khởi hành 24 giờ", enabled: true },
    { key: "price_alert", icon: "💸", title: "Thông báo giá vé", desc: "Giá vé máy bay giảm theo tuyến đường đã theo dõi", enabled: true },
    { key: "promotion", icon: "🎁", title: "Ưu đãi & Khuyến mãi", desc: "Nhận thông báo về các mã giảm giá mới", enabled: false },
    { key: "wallet", icon: "💰", title: "Biến động số dư ví", desc: "Thông báo khi ví được nạp hoặc thanh toán", enabled: true },
    { key: "review_remind", icon: "⭐", title: "Nhắc đánh giá", desc: "Nhắc nhở đánh giá sau khi hoàn thành chuyến đi", enabled: false },
    { key: "newsletter", icon: "📰", title: "Bản tin VIVU", desc: "Tin tức du lịch và gợi ý điểm đến mỗi tuần", enabled: false },
];

export default function NotificationsPage() {
    const [settings, setSettings] = useState<NotifSetting[]>(DEFAULT_SETTINGS);
    const [saved, setSaved] = useState(false);

    const toggle = (key: string) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, enabled: !s.enabled } : s));
        setSaved(false);
    };

    const handleSave = () => {
        // TODO: gọi API lưu settings
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <>
            <style>{`
                .ns-title { font-family: 'Nunito',sans-serif; font-size: 1.2rem; font-weight: 800; color: #1a3c6b; margin-bottom: 1.25rem; }
                .ns-card { background: #fff; border-radius: 16px; border: 1px solid #e8f0fe; overflow: hidden; margin-bottom: 1rem; }
                .ns-card-title { font-family: 'Nunito',sans-serif; font-size: 0.95rem; font-weight: 700; color: #1a3c6b; padding: 1rem 1.25rem 0.75rem; border-bottom: 2px solid #e8f0fe; }
                .ns-item { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; border-bottom: 1px solid #f0f4ff; }
                .ns-item:last-child { border-bottom: none; }
                .ns-icon { font-size: 1.3rem; flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px; background: #f0f4ff; display: flex; align-items: center; justify-content: center; }
                .ns-info { flex: 1; min-width: 0; }
                .ns-item-title { font-size: 0.9rem; font-weight: 600; color: #1a3c6b; margin-bottom: 0.15rem; }
                .ns-item-desc { font-size: 0.78rem; color: #6b8cbf; }

                /* Toggle */
                .ns-toggle { position: relative; width: 44px; height: 24px; flex-shrink: 0; }
                .ns-toggle input { opacity: 0; width: 0; height: 0; }
                .ns-toggle-slider {
                    position: absolute; inset: 0; border-radius: 99px;
                    background: #dde3f0; cursor: pointer;
                    transition: background 0.25s;
                }
                .ns-toggle input:checked + .ns-toggle-slider { background: #0052cc; }
                .ns-toggle-slider::before {
                    content: ''; position: absolute;
                    width: 18px; height: 18px; border-radius: 50%;
                    left: 3px; top: 3px; background: #fff;
                    transition: transform 0.25s;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
                }
                .ns-toggle input:checked + .ns-toggle-slider::before { transform: translateX(20px); }

                .ns-save-btn {
                    padding: 0.75rem 2rem;
                    background: linear-gradient(135deg,#0052cc,#0065ff);
                    color: #fff; border: none; border-radius: 10px;
                    font-family: 'Nunito',sans-serif; font-size: 0.95rem; font-weight: 700;
                    cursor: pointer; transition: opacity 0.15s;
                }
                .ns-save-btn:hover { opacity: 0.9; }
                .ns-saved { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #00875a; margin-left: 1rem; }
            `}</style>

            <div className="ns-title">🔔 Cài đặt thông báo</div>

            <div className="ns-card">
                <div className="ns-card-title">Đặt chỗ & Chuyến đi</div>
                {settings.slice(0, 2).map(s => (
                    <div key={s.key} className="ns-item">
                        <div className="ns-icon">{s.icon}</div>
                        <div className="ns-info">
                            <div className="ns-item-title">{s.title}</div>
                            <div className="ns-item-desc">{s.desc}</div>
                        </div>
                        <label className="ns-toggle">
                            <input type="checkbox" checked={s.enabled} onChange={() => toggle(s.key)} />
                            <span className="ns-toggle-slider" />
                        </label>
                    </div>
                ))}
            </div>

            <div className="ns-card">
                <div className="ns-card-title">Giá vé & Ưu đãi</div>
                {settings.slice(2, 4).map(s => (
                    <div key={s.key} className="ns-item">
                        <div className="ns-icon">{s.icon}</div>
                        <div className="ns-info">
                            <div className="ns-item-title">{s.title}</div>
                            <div className="ns-item-desc">{s.desc}</div>
                        </div>
                        <label className="ns-toggle">
                            <input type="checkbox" checked={s.enabled} onChange={() => toggle(s.key)} />
                            <span className="ns-toggle-slider" />
                        </label>
                    </div>
                ))}
            </div>

            <div className="ns-card">
                <div className="ns-card-title">Tài khoản & Khác</div>
                {settings.slice(4).map(s => (
                    <div key={s.key} className="ns-item">
                        <div className="ns-icon">{s.icon}</div>
                        <div className="ns-info">
                            <div className="ns-item-title">{s.title}</div>
                            <div className="ns-item-desc">{s.desc}</div>
                        </div>
                        <label className="ns-toggle">
                            <input type="checkbox" checked={s.enabled} onChange={() => toggle(s.key)} />
                            <span className="ns-toggle-slider" />
                        </label>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", marginTop: "0.5rem" }}>
                <button className="ns-save-btn" onClick={handleSave}>💾 Lưu cài đặt</button>
                {saved && <span className="ns-saved">✅ Đã lưu!</span>}
            </div>
        </>
    );
}