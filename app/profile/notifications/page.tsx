"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";

interface Notification {
    notification_id: number;
    type: string;
    title: string;
    content: string;
    is_read: number;
    created_at: string;
    related_id?: number;
}

const TYPE_CONFIG: Record<string, { icon: string; bg: string; label: string }> = {
    booking_confirm: { icon: "✅", bg: "#e8f5e9", label: "Đặt chỗ" },
    booking_cancel:  { icon: "❌", bg: "#fff0ee", label: "Hủy đặt chỗ" },
    wallet_credit:   { icon: "💰", bg: "#fff8e1", label: "Ví" },
    promotion:       { icon: "🎁", bg: "#f0f4ff", label: "Khuyến mãi" },
};

const fmtDateTime = (s: string) =>
    new Date(s).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const timeAgo = (s: string) => {
    const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return fmtDateTime(s);
};

export default function NotificationsPage() {
    const [tab, setTab] = useState<"feed" | "settings">("feed");
    const [notifs, setNotifs] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const fetchNotifs = async (reset = false) => {
        const offset = reset ? 0 : page * 20;
        try {
            const res = await api.get(`/api/notifications?limit=20&offset=${offset}`);
            const items: Notification[] = res.data.items ?? [];
            setNotifs(prev => reset ? items : [...prev, ...items]);
            setHasMore(items.length === 20);
            if (!reset) setPage(p => p + 1);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifs(true);
        // Đánh dấu tất cả đã đọc khi vào trang
        api.put("/api/notifications/read-all").catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <style>{`
                .nf-title { font-family: 'Nunito',sans-serif; font-size: 1.2rem; font-weight: 800; color: #1a3c6b; margin-bottom: 1.25rem; }
                .nf-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
                .nf-tab {
                    padding: 0.5rem 1.25rem; border-radius: 99px; font-size: 0.88rem; font-weight: 600;
                    cursor: pointer; border: 1.5px solid #c8d8ff; background: #fff; color: #6b8cbf;
                    transition: all 0.15s;
                }
                .nf-tab.active { background: #0052cc; color: #fff; border-color: #0052cc; }
                .nf-tab:hover:not(.active) { background: #f0f4ff; color: #0052cc; }

                /* Feed */
                .nf-card { background: #fff; border-radius: 16px; border: 1px solid #e8f0fe; overflow: hidden; }
                .nf-item {
                    display: flex; gap: 1rem; padding: 1rem 1.25rem;
                    border-bottom: 1px solid #f0f4ff; cursor: pointer;
                    transition: background 0.15s;
                }
                .nf-item:last-child { border-bottom: none; }
                .nf-item:hover { background: #f8faff; }
                .nf-item.unread { background: #f0f6ff; }
                .nf-icon {
                    width: 42px; height: 42px; border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.2rem; flex-shrink: 0;
                }
                .nf-body { flex: 1; min-width: 0; }
                .nf-item-title { font-size: 0.88rem; font-weight: 600; color: #1a3c6b; margin-bottom: 0.2rem; }
                .nf-item-content { font-size: 0.82rem; color: #4a5568; line-height: 1.4; }
                .nf-item-time { font-size: 0.72rem; color: #aab4cc; margin-top: 0.25rem; }
                .nf-dot { width: 8px; height: 8px; border-radius: 50%; background: #0052cc; flex-shrink: 0; margin-top: 0.4rem; }
                .nf-empty { padding: 3rem; text-align: center; color: #6b8cbf; }
                .nf-more-btn {
                    width: 100%; padding: 0.75rem; text-align: center; font-size: 0.85rem;
                    font-weight: 600; color: #0052cc; cursor: pointer;
                    background: #f8faff; border: none; border-top: 1px solid #f0f4ff;
                    font-family: inherit;
                }
                .nf-more-btn:hover { background: #eef3ff; }

                /* Settings */
                .ns-card { background: #fff; border-radius: 16px; border: 1px solid #e8f0fe; overflow: hidden; margin-bottom: 1rem; }
                .ns-card-title { font-family: 'Nunito',sans-serif; font-size: 0.95rem; font-weight: 700; color: #1a3c6b; padding: 1rem 1.25rem 0.75rem; border-bottom: 2px solid #e8f0fe; }
                .ns-item { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; border-bottom: 1px solid #f0f4ff; }
                .ns-item:last-child { border-bottom: none; }
                .ns-icon { font-size: 1.3rem; flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px; background: #f0f4ff; display: flex; align-items: center; justify-content: center; }
                .ns-info { flex: 1; min-width: 0; }
                .ns-item-title { font-size: 0.9rem; font-weight: 600; color: #1a3c6b; margin-bottom: 0.15rem; }
                .ns-item-desc { font-size: 0.78rem; color: #6b8cbf; }
                .ns-toggle { position: relative; width: 44px; height: 24px; flex-shrink: 0; }
                .ns-toggle input { opacity: 0; width: 0; height: 0; }
                .ns-toggle-slider { position: absolute; inset: 0; border-radius: 99px; background: #dde3f0; cursor: pointer; transition: background 0.25s; }
                .ns-toggle input:checked + .ns-toggle-slider { background: #0052cc; }
                .ns-toggle-slider::before { content: ''; position: absolute; width: 18px; height: 18px; border-radius: 50%; left: 3px; top: 3px; background: #fff; transition: transform 0.25s; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
                .ns-toggle input:checked + .ns-toggle-slider::before { transform: translateX(20px); }
                .ns-save-btn { padding: 0.75rem 2rem; background: linear-gradient(135deg,#0052cc,#0065ff); color: #fff; border: none; border-radius: 10px; font-family: 'Nunito',sans-serif; font-size: 0.95rem; font-weight: 700; cursor: pointer; }
                .ns-save-btn:hover { opacity: 0.9; }
                .ns-saved { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #00875a; margin-left: 1rem; }
            `}</style>

            <div className="nf-title">🔔 Thông báo</div>

            <div className="nf-tabs">
                <button className={`nf-tab${tab === "feed" ? " active" : ""}`} onClick={() => setTab("feed")}>
                    📬 Thông báo của tôi
                </button>
                <button className={`nf-tab${tab === "settings" ? " active" : ""}`} onClick={() => setTab("settings")}>
                    ⚙️ Cài đặt
                </button>
            </div>

            {tab === "feed" && (
                <div className="nf-card">
                    {loading ? (
                        <div className="nf-empty">Đang tải...</div>
                    ) : notifs.length === 0 ? (
                        <div className="nf-empty">
                            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔕</div>
                            <div style={{ fontWeight: 600, color: "#1a3c6b", marginBottom: "0.4rem" }}>Chưa có thông báo nào</div>
                            <div style={{ fontSize: "0.82rem" }}>Các thông báo về đặt chỗ, ví, khuyến mãi sẽ xuất hiện ở đây.</div>
                        </div>
                    ) : (
                        <>
                            {notifs.map(n => {
                                const cfg = TYPE_CONFIG[n.type] ?? { icon: "🔔", bg: "#f0f4ff", label: "" };
                                return (
                                    <div
                                        key={n.notification_id}
                                        className={`nf-item${n.is_read ? "" : " unread"}`}
                                        onClick={() => { if (n.related_id) window.location.href = `/invoice/${n.related_id}`; }}
                                    >
                                        <div className="nf-icon" style={{ background: cfg.bg }}>{cfg.icon}</div>
                                        <div className="nf-body">
                                            <div className="nf-item-title">{n.title}</div>
                                            <div className="nf-item-content">{n.content}</div>
                                            <div className="nf-item-time">{timeAgo(n.created_at)}</div>
                                        </div>
                                        {!n.is_read && <div className="nf-dot" />}
                                    </div>
                                );
                            })}
                            {hasMore && (
                                <button className="nf-more-btn" onClick={() => fetchNotifs()}>
                                    Xem thêm ▼
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            {tab === "settings" && <NotificationSettings />}
        </>
    );
}

const NOTIF_SETTINGS_KEY = "vivu_notif_settings";
const DEFAULT_SETTINGS: Record<string, boolean> = {
    booking_confirm: true, booking_cancel: true, wallet_credit: true, promotion: false,
};

function NotificationSettings() {
    const SETTINGS = [
        { key: "booking_confirm", icon: "✅", title: "Xác nhận đặt chỗ", desc: "Thông báo khi đơn đặt chỗ được xác nhận", group: "booking" },
        { key: "booking_cancel", icon: "❌", title: "Hủy đặt chỗ", desc: "Thông báo khi đặt chỗ bị hủy hoặc hết hạn", group: "booking" },
        { key: "wallet_credit", icon: "💰", title: "Biến động số dư ví", desc: "Thông báo khi ví được cộng tiền (cashback, hoàn tiền)", group: "wallet" },
        { key: "promotion", icon: "🎁", title: "Ưu đãi & Khuyến mãi", desc: "Thông báo khi có mã giảm giá mới", group: "other" },
    ];

    const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
        try {
            const saved = localStorage.getItem(NOTIF_SETTINGS_KEY);
            return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
        } catch {
            return DEFAULT_SETTINGS;
        }
    });
    const [saved, setSaved] = useState(false);

    const toggle = (key: string) => { setEnabled(p => ({ ...p, [key]: !p[key] })); setSaved(false); };
    const handleSave = () => {
        localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(enabled));
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const groups = [
        { key: "booking", label: "Đặt chỗ & Chuyến đi" },
        { key: "wallet",  label: "Tài khoản & Ví" },
        { key: "other",   label: "Khác" },
    ];

    return (
        <>
            {groups.map(g => {
                const items = SETTINGS.filter(s => s.group === g.key);
                return (
                    <div key={g.key} className="ns-card">
                        <div className="ns-card-title">{g.label}</div>
                        {items.map(s => (
                            <div key={s.key} className="ns-item">
                                <div className="ns-icon">{s.icon}</div>
                                <div className="ns-info">
                                    <div className="ns-item-title">{s.title}</div>
                                    <div className="ns-item-desc">{s.desc}</div>
                                </div>
                                <label className="ns-toggle">
                                    <input type="checkbox" checked={enabled[s.key]} onChange={() => toggle(s.key)} />
                                    <span className="ns-toggle-slider" />
                                </label>
                            </div>
                        ))}
                    </div>
                );
            })}
            <div style={{ display: "flex", alignItems: "center", marginTop: "0.5rem" }}>
                <button className="ns-save-btn" onClick={handleSave}>💾 Lưu cài đặt</button>
                {saved && <span className="ns-saved">✅ Đã lưu!</span>}
            </div>
        </>
    );
}
