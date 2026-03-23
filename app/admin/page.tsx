"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

type Section = "dashboard" | "bookings" | "hotels" | "flights" | "buses" | "users";

interface Stats {
    total_users: number; total_bookings: number; confirmed_bookings: number;
    pending_bookings: number; total_revenue: number;
    total_hotels: number; total_flights: number; total_buses: number;
}

type ChartPeriod = "7d" | "monthly";
interface ChartPoint { label: string; total: number; }

const statusColor: Record<string, string> = {
    confirmed: "#00875a", pending: "#b8860b", cancelled: "#c0392b",
};
const statusLabel: Record<string, string> = {
    confirmed: "Đã xác nhận", pending: "Chờ thanh toán", cancelled: "Đã huỷ",
};
const roleColor: Record<string, string> = { ADMIN: "#0052cc", USER: "#6b8cbf" };

const fmt = (n: number) => n?.toLocaleString("vi-VN") + "₫";

// ── Generic CRUD Modal ──────────────────────────────────────────
function Modal({ title, fields, values, onChange, onSave, onClose, saving }: {
    title: string;
    fields: { key: string; label: string; type?: string; required?: boolean; options?: { value: string; label: string }[] }[];
    values: Record<string, string>;
    onChange: (k: string, v: string) => void;
    onSave: () => void;
    onClose: () => void;
    saving: boolean;
}) {
    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={onClose}>
            <div style={{
                background: "#fff", borderRadius: 16, padding: "2rem",
                width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
                boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#1a3c6b" }}>{title}</h2>
                    <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "#6b8cbf" }}>×</button>
                </div>
                {fields.map(f => (
                    <div key={f.key} style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#6b8cbf", marginBottom: 4, textTransform: "uppercase" }}>
                            {f.label}{f.required && " *"}
                        </label>
                        {f.type === "textarea" ? (
                            <textarea
                                value={values[f.key] || ""}
                                onChange={e => onChange(f.key, e.target.value)}
                                rows={3}
                                style={{ width: "100%", padding: "0.65rem 0.85rem", border: "1.5px solid #e8f0fe", borderRadius: 8, fontSize: "0.88rem", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                            />
                        ) : f.type === "select" ? (
                            <select
                                value={values[f.key] || ""}
                                onChange={e => onChange(f.key, e.target.value)}
                                style={{ width: "100%", padding: "0.65rem 0.85rem", border: "1.5px solid #e8f0fe", borderRadius: 8, fontSize: "0.88rem", boxSizing: "border-box", background: "#fff" }}
                            >
                                <option value="">-- Chọn --</option>
                                {f.options?.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type={f.type || "text"}
                                value={values[f.key] || ""}
                                onChange={e => onChange(f.key, e.target.value)}
                                style={{ width: "100%", padding: "0.65rem 0.85rem", border: "1.5px solid #e8f0fe", borderRadius: 8, fontSize: "0.88rem", boxSizing: "border-box" }}
                            />
                        )}
                    </div>
                ))}
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                    <button onClick={onSave} disabled={saving} style={{
                        flex: 1, padding: "0.75rem", background: "#0052cc", color: "#fff",
                        border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: "0.9rem",
                        opacity: saving ? 0.6 : 1,
                    }}>
                        {saving ? "Đang lưu..." : "Lưu"}
                    </button>
                    <button onClick={onClose} style={{
                        flex: 1, padding: "0.75rem", background: "#f0f4ff", color: "#1a3c6b",
                        border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
                    }}>
                        Huỷ
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [section, setSection] = useState<Section>("dashboard");
    const [stats, setStats] = useState<Stats | null>(null);
    const [destinations, setDestinations] = useState<{ destination_id: number; name: string; city: string }[]>([]);

    const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("7d");
    const [chartData, setChartData] = useState<ChartPoint[]>([]);
    const [data, setData] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState<{ mode: "create" | "edit"; row?: Record<string, unknown> } | null>(null);
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Auth guard
    useEffect(() => {
        if (user && user.role !== "ADMIN") router.replace("/");
        if (!user) router.replace("/login");
    }, [user, router]);

    const loadDestinations = useCallback(() => {
        api.get("/api/destinations")
            .then(r => {
                console.log("Destinations API response:", r.data);
                const list = Array.isArray(r.data) ? r.data : [];
                setDestinations(list);
            })
            .catch(err => console.error("Destinations load failed:", err));
    }, []);

    // Load stats + destinations
    useEffect(() => {
        api.get("/api/admin/stats").then(r => setStats(r.data)).catch(() => { });
        loadDestinations();
    }, [loadDestinations]);

    // Load chart data khi đổi period
    useEffect(() => {
        api.get(`/api/admin/revenue?period=${chartPeriod}`)
            .then(r => setChartData(r.data))
            .catch(() => setChartData([]));
    }, [chartPeriod]);

    // Load section data
    const loadSection = useCallback(async (s: Section) => {
        if (s === "dashboard") return;
        setLoading(true);
        try {
            const res = await api.get(`/api/admin/${s}`);
            setData(res.data);
        } catch { setData([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadSection(section); }, [section, loadSection]);

    // Field defs per section
    const fieldDefs: Record<string, { key: string; label: string; type?: string; required?: boolean; options?: { value: string; label: string }[] }[]> = {
        hotels: [
            { key: "name", label: "Tên khách sạn", required: true },
            { key: "address", label: "Địa chỉ", required: true },
            {
                key: "destination_id", label: "Điểm đến", type: "select",
                options: destinations.map(d => ({ value: String(d.destination_id), label: `${d.city} - ${d.name}` }))
            },
            { key: "description", label: "Mô tả", type: "textarea" },
            { key: "amenities", label: "Tiện ích (phân cách bằng dấu phẩy)" },
            { key: "image_url", label: "URL ảnh" },
        ],
        flights: [
            { key: "airline", label: "Hãng bay", required: true },
            { key: "from_city", label: "Điểm đi", required: true },
            { key: "to_city", label: "Điểm đến", required: true },
            { key: "depart_time", label: "Giờ khởi hành", type: "datetime-local" },
            { key: "arrive_time", label: "Giờ đến", type: "datetime-local" },
            { key: "price", label: "Giá (₫)", type: "number", required: true },
            { key: "available_seats", label: "Số ghế", type: "number" },
            { key: "image_url", label: "URL ảnh" },
        ],
        buses: [
            { key: "company", label: "Nhà xe", required: true },
            { key: "from_city", label: "Điểm đi", required: true },
            { key: "to_city", label: "Điểm đến", required: true },
            { key: "depart_time", label: "Giờ khởi hành", type: "datetime-local" },
            { key: "arrive_time", label: "Giờ đến", type: "datetime-local" },
            { key: "price", label: "Giá (₫)", type: "number", required: true },
            { key: "available_seats", label: "Số ghế", type: "number" },
            { key: "image_url", label: "URL ảnh" },
        ],
    };

    const idKey: Record<string, string> = { hotels: "hotel_id", flights: "flight_id", buses: "bus_id", users: "user_id", bookings: "booking_id" };

    const openCreate = () => {
        if (section === "hotels" && destinations.length === 0) loadDestinations();
        setFormValues({});
        setModal({ mode: "create" });
    };
    const openEdit = (row: Record<string, unknown>) => {
        if (section === "hotels" && destinations.length === 0) loadDestinations();
        const vals: Record<string, string> = {};
        Object.entries(row).forEach(([k, v]) => { vals[k] = v != null ? String(v) : ""; });
        setFormValues(vals);
        setModal({ mode: "edit", row });
    };

    const buildPayload = () => {
        const fields = fieldDefs[section] ?? [];
        const payload: Record<string, unknown> = {};
        fields.forEach(f => {
            const raw = formValues[f.key];
            if (raw === undefined || raw === "") {
                payload[f.key] = null;
            } else if (f.type === "number") {
                payload[f.key] = Number(raw);
            } else if (f.type === "select" && f.key === "destination_id") {
                payload[f.key] = Number(raw);
            } else {
                payload[f.key] = raw;
            }
        });
        return payload;
    };

    const handleSave = async () => {
        // Validate required fields
        const fields = fieldDefs[section] ?? [];
        const missing = fields.filter(f => f.required && !formValues[f.key]?.trim());
        if (missing.length > 0) {
            alert(`Vui lòng điền: ${missing.map(f => f.label).join(", ")}`);
            return;
        }

        setSaving(true);
        try {
            const payload = buildPayload();
            if (modal?.mode === "create") {
                await api.post(`/api/admin/${section}`, payload);
            } else {
                const id = modal?.row?.[idKey[section]];
                await api.put(`/api/admin/${section}/${id}`, payload);
            }
            setModal(null);
            loadSection(section);
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { detail?: string | { msg: string }[] } } })?.response?.data?.detail;
            const msg = Array.isArray(detail)
                ? detail.map(d => d.msg).join(", ")
                : detail;
            alert(msg || "Lỗi, vui lòng thử lại");
        } finally { setSaving(false); }
    };

    const handleDelete = async (row: Record<string, unknown>) => {
        if (!confirm("Xác nhận xóa?")) return;
        try {
            await api.delete(`/api/admin/${section}/${row[idKey[section]]}`);
            loadSection(section);
        } catch { alert("Xóa thất bại"); }
    };

    const handleStatusChange = async (bookingId: number, status: string) => {
        try {
            await api.put(`/api/admin/bookings/${bookingId}/status`, null, { params: { status } });
            loadSection("bookings");
        } catch { alert("Cập nhật thất bại"); }
    };

    const handleRoleChange = async (userId: number, role: string) => {
        try {
            await api.put(`/api/admin/users/${userId}/role`, null, { params: { role } });
            loadSection("users");
        } catch { alert("Cập nhật thất bại"); }
    };

    const navItems: { key: Section; icon: string; label: string }[] = [
        { key: "dashboard", icon: "📊", label: "Tổng quan" },
        { key: "bookings", icon: "🗂️", label: "Đặt chỗ" },
        { key: "hotels", icon: "🏨", label: "Khách sạn" },
        { key: "flights", icon: "✈️", label: "Chuyến bay" },
        { key: "buses", icon: "🚌", label: "Xe khách" },
        { key: "users", icon: "👥", label: "Người dùng" },
    ];

    const statCards = stats ? [
        { icon: "👥", label: "Người dùng", value: stats.total_users, color: "#0052cc" },
        { icon: "🗂️", label: "Tổng đặt chỗ", value: stats.total_bookings, color: "#00875a" },
        { icon: "✅", label: "Đã xác nhận", value: stats.confirmed_bookings, color: "#00875a" },
        { icon: "⏳", label: "Chờ thanh toán", value: stats.pending_bookings, color: "#b8860b" },
        { icon: "💰", label: "Doanh thu", value: fmt(stats.total_revenue), color: "#0052cc" },
        { icon: "🏨", label: "Khách sạn", value: stats.total_hotels, color: "#6f42c1" },
        { icon: "✈️", label: "Chuyến bay", value: stats.total_flights, color: "#0052cc" },
        { icon: "🚌", label: "Xe khách", value: stats.total_buses, color: "#fd7e14" },
    ] : [];

    if (!user || user.role !== "ADMIN") return null;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
                * { box-sizing: border-box; }
                body { margin: 0; }
                .adm-root { display: flex; min-height: 100vh; background: #f0f4ff; font-family: 'DM Sans', sans-serif; }

                /* Sidebar */
                .adm-sidebar {
                    width: 240px; background: #0a1f44;
                    display: flex; flex-direction: column;
                    position: fixed; top: 0; left: 0; bottom: 0; z-index: 100;
                    transition: transform 0.25s;
                }
                .adm-sidebar.closed { transform: translateX(-240px); }
                .adm-logo {
                    padding: 1.5rem 1.25rem 1rem;
                    font-family: 'Nunito', sans-serif; font-size: 1.4rem; font-weight: 800;
                    color: #f0d090; letter-spacing: -0.5px; border-bottom: 1px solid rgba(255,255,255,0.08);
                }
                .adm-logo span { color: #d4a050; }
                .adm-logo-sub { font-size: 0.65rem; color: rgba(255,255,255,0.35); font-weight: 400; letter-spacing: 2px; text-transform: uppercase; display: block; margin-top: 2px; }
                .adm-nav { flex: 1; padding: 1rem 0; overflow-y: auto; }
                .adm-nav-item {
                    display: flex; align-items: center; gap: 0.75rem;
                    padding: 0.75rem 1.25rem; font-size: 0.9rem; font-weight: 500;
                    color: rgba(255,255,255,0.55); cursor: pointer;
                    border-left: 3px solid transparent; transition: all 0.15s;
                }
                .adm-nav-item:hover { color: #fff; background: rgba(255,255,255,0.06); }
                .adm-nav-item.active { color: #fff; background: rgba(0,82,204,0.35); border-left-color: #4d9fff; }
                .adm-nav-item .icon { font-size: 1.05rem; width: 22px; text-align: center; }
                .adm-sidebar-footer {
                    padding: 1rem 1.25rem; border-top: 1px solid rgba(255,255,255,0.08);
                }
                .adm-user-info { display: flex; align-items: center; gap: 0.75rem; }
                .adm-avatar {
                    width: 36px; height: 36px; border-radius: 50%;
                    background: linear-gradient(135deg, #0052cc, #4d9fff);
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 700; color: #fff; font-size: 0.85rem; flex-shrink: 0;
                }
                .adm-user-name { font-size: 0.82rem; font-weight: 600; color: #fff; }
                .adm-user-role { font-size: 0.68rem; color: #4d9fff; font-weight: 500; }
                .adm-logout {
                    margin-top: 0.5rem; width: 100%; padding: 0.55rem;
                    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
                    color: rgba(255,255,255,0.6); border-radius: 8px; cursor: pointer;
                    font-size: 0.8rem; transition: all 0.15s;
                }
                .adm-logout:hover { background: rgba(192,57,43,0.3); color: #ff8a80; border-color: rgba(192,57,43,0.4); }

                /* Main */
                .adm-main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; transition: margin-left 0.25s; }
                .adm-main.full { margin-left: 0; }

                /* Topbar */
                .adm-topbar {
                    background: #fff; padding: 1rem 1.5rem;
                    display: flex; align-items: center; justify-content: space-between;
                    border-bottom: 1px solid #e8f0fe;
                    box-shadow: 0 1px 8px rgba(0,0,0,0.04); position: sticky; top: 0; z-index: 50;
                }
                .adm-topbar-left { display: flex; align-items: center; gap: 1rem; }
                .adm-menu-btn {
                    background: #f0f4ff; border: none; border-radius: 8px;
                    width: 36px; height: 36px; cursor: pointer; font-size: 1rem;
                    display: flex; align-items: center; justify-content: center;
                }
                .adm-breadcrumb { font-size: 1rem; font-weight: 600; color: #1a3c6b; }

                /* Content */
                .adm-content { padding: 1.5rem; }

                /* Stat cards */
                .adm-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
                .adm-stat-card {
                    background: #fff; border-radius: 14px; padding: 1.25rem 1rem;
                    border: 1px solid #e8f0fe; display: flex; flex-direction: column; gap: 0.5rem;
                }
                .adm-stat-icon { font-size: 1.5rem; }
                .adm-stat-value { font-family: 'Nunito', sans-serif; font-size: 1.5rem; font-weight: 800; color: #1a3c6b; }
                .adm-stat-label { font-size: 0.78rem; color: #6b8cbf; font-weight: 500; }

                /* Revenue chart (simple bars) */
                .adm-chart-card { background: #fff; border-radius: 14px; padding: 1.25rem; border: 1px solid #e8f0fe; margin-bottom: 1.5rem; }
                .adm-chart-title { font-family: 'Nunito', sans-serif; font-size: 0.95rem; font-weight: 700; color: #1a3c6b; margin-bottom: 1rem; }
                .adm-bars { display: flex; align-items: flex-end; gap: 8px; height: 100px; }
                .adm-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
                .adm-bar { width: 100%; background: linear-gradient(180deg, #4d9fff, #0052cc); border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.3s; }
                .adm-bar-label { font-size: 0.65rem; color: #6b8cbf; text-align: center; white-space: nowrap; }

                /* Table */
                .adm-table-card { background: #fff; border-radius: 14px; border: 1px solid #e8f0fe; overflow: hidden; }
                .adm-table-header {
                    padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between;
                    border-bottom: 1px solid #e8f0fe;
                }
                .adm-table-title { font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700; color: #1a3c6b; }
                .adm-add-btn {
                    background: #0052cc; color: #fff; border: none; border-radius: 8px;
                    padding: 0.55rem 1rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;
                    display: flex; align-items: center; gap: 0.4rem;
                }
                .adm-add-btn:hover { opacity: 0.9; }

                .adm-table-wrap { overflow-x: auto; }
                table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
                th { background: #f8faff; color: #6b8cbf; font-weight: 600; text-align: left; padding: 0.75rem 1rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap; }
                td { padding: 0.75rem 1rem; border-top: 1px solid #f0f4ff; color: #1a3c6b; vertical-align: middle; }
                tr:hover td { background: #f8faff; }

                .adm-badge {
                    display: inline-block; padding: 0.25rem 0.65rem;
                    border-radius: 99px; font-size: 0.72rem; font-weight: 700;
                }
                .adm-action-btn {
                    padding: 0.3rem 0.7rem; border-radius: 6px; border: none;
                    font-size: 0.75rem; font-weight: 600; cursor: pointer; margin-right: 4px;
                }
                .adm-edit-btn { background: #e8f0fe; color: #0052cc; }
                .adm-del-btn { background: #fff0f0; color: #c0392b; }
                .adm-edit-btn:hover { background: #c8deff; }
                .adm-del-btn:hover { background: #ffcdd2; }

                select.adm-select {
                    border: 1px solid #e8f0fe; border-radius: 6px;
                    padding: 0.25rem 0.5rem; font-size: 0.78rem; cursor: pointer;
                    background: #f8faff; color: #1a3c6b;
                }

                .adm-chart-toggle { display: flex; gap: 4px; background: #f0f4ff; border-radius: 8px; padding: 3px; }
                .adm-chart-toggle-btn {
                    padding: 0.3rem 0.85rem; border: none; border-radius: 6px;
                    font-size: 0.78rem; font-weight: 600; cursor: pointer;
                    background: transparent; color: #6b8cbf; transition: all 0.15s;
                }
                .adm-chart-toggle-btn.active { background: #fff; color: #0052cc; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }

                .adm-loading { padding: 3rem; text-align: center; color: #6b8cbf; font-size: 0.9rem; }
                .adm-empty { padding: 2.5rem; text-align: center; color: #6b8cbf; font-size: 0.88rem; }
            `}</style>

            {/* Sidebar */}
            <aside className={`adm-sidebar${sidebarOpen ? "" : " closed"}`}>
                <div className="adm-logo">
                    VIVU<span>.</span>
                    <span className="adm-logo-sub">Admin Panel</span>
                </div>
                <nav className="adm-nav">
                    {navItems.map(item => (
                        <div
                            key={item.key}
                            className={`adm-nav-item${section === item.key ? " active" : ""}`}
                            onClick={() => setSection(item.key)}
                        >
                            <span className="icon">{item.icon}</span>
                            {item.label}
                        </div>
                    ))}
                </nav>
                <div className="adm-sidebar-footer">
                    <div className="adm-user-info">
                        <div className="adm-avatar">{user.full_name?.[0] || "A"}</div>
                        <div>
                            <div className="adm-user-name">{user.full_name || "Admin"}</div>
                            <div className="adm-user-role">ADMINISTRATOR</div>
                        </div>
                    </div>
                    <button className="adm-logout" onClick={() => { useAuthStore.getState().logout(); router.push("/login"); }}>
                        🚪 Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className={`adm-main${sidebarOpen ? "" : " full"}`}>
                {/* Topbar */}
                <div className="adm-topbar">
                    <div className="adm-topbar-left">
                        <button className="adm-menu-btn" onClick={() => setSidebarOpen(o => !o)}>☰</button>
                        <span className="adm-breadcrumb">
                            {navItems.find(n => n.key === section)?.icon}{" "}
                            {navItems.find(n => n.key === section)?.label}
                        </span>
                    </div>
                    <span style={{ fontSize: "0.82rem", color: "#6b8cbf" }}>
                        {new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </span>
                </div>

                <div className="adm-content">

                    {/* ── DASHBOARD ── */}
                    {section === "dashboard" && (
                        <>
                            <div className="adm-stats">
                                {statCards.map((c, i) => (
                                    <div key={i} className="adm-stat-card">
                                        <div className="adm-stat-icon">{c.icon}</div>
                                        <div className="adm-stat-value" style={{ color: c.color }}>
                                            {typeof c.value === "number" ? c.value.toLocaleString("vi-VN") : c.value}
                                        </div>
                                        <div className="adm-stat-label">{c.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="adm-chart-card">
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                                    <div className="adm-chart-title" style={{ margin: 0 }}>
                                        📈 Doanh thu {chartPeriod === "7d" ? "7 ngày gần nhất" : "theo tháng"}
                                    </div>
                                    <div className="adm-chart-toggle">
                                        <button
                                            className={`adm-chart-toggle-btn${chartPeriod === "7d" ? " active" : ""}`}
                                            onClick={() => setChartPeriod("7d")}
                                        >
                                            7 ngày
                                        </button>
                                        <button
                                            className={`adm-chart-toggle-btn${chartPeriod === "monthly" ? " active" : ""}`}
                                            onClick={() => setChartPeriod("monthly")}
                                        >
                                            Theo tháng
                                        </button>
                                    </div>
                                </div>

                                {chartData.length === 0 ? (
                                    <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b8cbf", fontSize: "0.85rem" }}>
                                        Chưa có dữ liệu doanh thu
                                    </div>
                                ) : (
                                    <div className="adm-bars">
                                        {(() => {
                                            const max = Math.max(...chartData.map(r => r.total), 1);
                                            return chartData.map((r, i) => {
                                                const shortLabel = chartPeriod === "monthly"
                                                    ? r.label.slice(5).replace("-", "/")  // "2025-03" → "03"
                                                    : r.label.slice(5);                    // "2025-03-15" → "03-15"
                                                return (
                                                    <div key={i} className="adm-bar-wrap" title={`${r.label}: ${fmt(r.total)}`}>
                                                        <div
                                                            className="adm-bar"
                                                            style={{ height: `${Math.max(4, (r.total / max) * 88)}px` }}
                                                        />
                                                        <div className="adm-bar-label">{shortLabel}</div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                )}

                                {chartData.length > 0 && (
                                    <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end", fontSize: "0.78rem", color: "#6b8cbf" }}>
                                        Tổng: <strong style={{ color: "#0052cc", marginLeft: 4 }}>
                                            {fmt(chartData.reduce((s, r) => s + r.total, 0))}
                                        </strong>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: "1rem" }}>
                                {[
                                    { key: "bookings", icon: "🗂️", label: "Quản lý đặt chỗ" },
                                    { key: "hotels", icon: "🏨", label: "Quản lý khách sạn" },
                                    { key: "flights", icon: "✈️", label: "Quản lý chuyến bay" },
                                    { key: "buses", icon: "🚌", label: "Quản lý xe khách" },
                                    { key: "users", icon: "👥", label: "Quản lý người dùng" },
                                ].map(item => (
                                    <div
                                        key={item.key}
                                        onClick={() => setSection(item.key as Section)}
                                        style={{
                                            background: "#fff", borderRadius: 14, padding: "1.25rem",
                                            border: "1px solid #e8f0fe", cursor: "pointer",
                                            display: "flex", alignItems: "center", gap: "0.75rem",
                                            fontWeight: 600, color: "#1a3c6b", fontSize: "0.9rem",
                                            transition: "box-shadow 0.15s",
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,82,204,0.12)")}
                                        onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                                    >
                                        <span style={{ fontSize: "1.5rem" }}>{item.icon}</span>
                                        {item.label}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── BOOKINGS ── */}
                    {section === "bookings" && (
                        <div className="adm-table-card">
                            <div className="adm-table-header">
                                <div className="adm-table-title">🗂️ Danh sách đặt chỗ</div>
                            </div>
                            <div className="adm-table-wrap">
                                {loading ? <div className="adm-loading">Đang tải...</div> : data.length === 0 ? <div className="adm-empty">Không có dữ liệu</div> : (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>#</th><th>Khách hàng</th><th>Dịch vụ</th>
                                                <th>Tổng tiền</th><th>Ngày đặt</th><th>Trạng thái</th><th>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.map((row, i) => (
                                                <tr key={String(row.booking_id ?? i)}>
                                                    <td>#{String(row.booking_id)}</td>
                                                    <td>
                                                        <div style={{ fontWeight: 600 }}>{String(row.user_name || "—")}</div>
                                                        <div style={{ fontSize: "0.75rem", color: "#6b8cbf" }}>{String(row.user_email || "")}</div>
                                                    </td>
                                                    <td>
                                                        <div>{String(row.entity_name || "—")}</div>
                                                        <div style={{ fontSize: "0.72rem", color: "#6b8cbf", textTransform: "capitalize" }}>{String(row.entity_type || "")}</div>
                                                    </td>
                                                    <td style={{ fontWeight: 700, color: "#0052cc" }}>{fmt(Number(row.final_amount))}</td>
                                                    <td style={{ color: "#6b8cbf", fontSize: "0.8rem" }}>
                                                        {row.booking_date ? new Date(String(row.booking_date)).toLocaleDateString("vi-VN") : "—"}
                                                    </td>
                                                    <td>
                                                        <select
                                                            className="adm-select"
                                                            value={String(row.status)}
                                                            style={{ color: statusColor[String(row.status)] || "#1a3c6b" }}
                                                            onChange={e => handleStatusChange(Number(row.booking_id), e.target.value)}
                                                        >
                                                            <option value="pending">Chờ thanh toán</option>
                                                            <option value="confirmed">Đã xác nhận</option>
                                                            <option value="cancelled">Đã huỷ</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <span
                                                            className="adm-badge"
                                                            style={{ background: `${statusColor[String(row.status)]}18`, color: statusColor[String(row.status)] || "#1a3c6b" }}
                                                        >
                                                            {statusLabel[String(row.status)] || String(row.status)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── HOTELS ── */}
                    {section === "hotels" && (
                        <div className="adm-table-card">
                            <div className="adm-table-header">
                                <div className="adm-table-title">🏨 Danh sách khách sạn</div>
                                <button className="adm-add-btn" onClick={openCreate}>＋ Thêm mới</button>
                            </div>
                            <div className="adm-table-wrap">
                                {loading ? <div className="adm-loading">Đang tải...</div> : data.length === 0 ? <div className="adm-empty">Chưa có khách sạn nào</div> : (
                                    <table>
                                        <thead><tr><th>#</th><th>Tên</th><th>Thành phố</th><th>Sao</th><th>Địa chỉ</th><th>Thao tác</th></tr></thead>
                                        <tbody>
                                            {data.map((row, i) => (
                                                <tr key={String(row.hotel_id ?? i)}>
                                                    <td style={{ color: "#6b8cbf" }}>#{String(row.hotel_id)}</td>
                                                    <td style={{ fontWeight: 600 }}>{String(row.name)}</td>
                                                    <td>{String(row.city || row.dest_city || "—")}</td>
                                                    <td>{"⭐".repeat(Number(row.star_rating) || 0)}</td>
                                                    <td style={{ color: "#6b8cbf", fontSize: "0.8rem", maxWidth: 200 }}>{String(row.address || "—")}</td>
                                                    <td>
                                                        <button className="adm-action-btn adm-edit-btn" onClick={() => openEdit(row)}>✏️ Sửa</button>
                                                        <button className="adm-action-btn adm-del-btn" onClick={() => handleDelete(row)}>🗑 Xóa</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── FLIGHTS ── */}
                    {section === "flights" && (
                        <div className="adm-table-card">
                            <div className="adm-table-header">
                                <div className="adm-table-title">✈️ Danh sách chuyến bay</div>
                                <button className="adm-add-btn" onClick={openCreate}>＋ Thêm mới</button>
                            </div>
                            <div className="adm-table-wrap">
                                {loading ? <div className="adm-loading">Đang tải...</div> : data.length === 0 ? <div className="adm-empty">Chưa có chuyến bay nào</div> : (
                                    <table>
                                        <thead><tr><th>#</th><th>Hãng bay</th><th>Tuyến</th><th>Khởi hành</th><th>Đến</th><th>Giá</th><th>Ghế</th><th>Thao tác</th></tr></thead>
                                        <tbody>
                                            {data.map((row, i) => (
                                                <tr key={String(row.flight_id ?? i)}>
                                                    <td style={{ color: "#6b8cbf" }}>#{String(row.flight_id)}</td>
                                                    <td style={{ fontWeight: 600 }}>{String(row.airline)}</td>
                                                    <td>{String(row.from_city)} → {String(row.to_city)}</td>
                                                    <td style={{ fontSize: "0.8rem" }}>{row.depart_time ? new Date(String(row.depart_time)).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                                                    <td style={{ fontSize: "0.8rem" }}>{row.arrive_time ? new Date(String(row.arrive_time)).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                                                    <td style={{ color: "#0052cc", fontWeight: 700 }}>{fmt(Number(row.price))}</td>
                                                    <td>{String(row.available_seats)}</td>
                                                    <td>
                                                        <button className="adm-action-btn adm-edit-btn" onClick={() => openEdit(row)}>✏️ Sửa</button>
                                                        <button className="adm-action-btn adm-del-btn" onClick={() => handleDelete(row)}>🗑 Xóa</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── BUSES ── */}
                    {section === "buses" && (
                        <div className="adm-table-card">
                            <div className="adm-table-header">
                                <div className="adm-table-title">🚌 Danh sách xe khách</div>
                                <button className="adm-add-btn" onClick={openCreate}>＋ Thêm mới</button>
                            </div>
                            <div className="adm-table-wrap">
                                {loading ? <div className="adm-loading">Đang tải...</div> : data.length === 0 ? <div className="adm-empty">Chưa có xe khách nào</div> : (
                                    <table>
                                        <thead><tr><th>#</th><th>Nhà xe</th><th>Tuyến</th><th>Khởi hành</th><th>Đến</th><th>Giá</th><th>Ghế</th><th>Thao tác</th></tr></thead>
                                        <tbody>
                                            {data.map((row, i) => (
                                                <tr key={String(row.bus_id ?? i)}>
                                                    <td style={{ color: "#6b8cbf" }}>#{String(row.bus_id)}</td>
                                                    <td style={{ fontWeight: 600 }}>{String(row.company)}</td>
                                                    <td>{String(row.from_city)} → {String(row.to_city)}</td>
                                                    <td style={{ fontSize: "0.8rem" }}>{row.depart_time ? new Date(String(row.depart_time)).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                                                    <td style={{ fontSize: "0.8rem" }}>{row.arrive_time ? new Date(String(row.arrive_time)).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                                                    <td style={{ color: "#0052cc", fontWeight: 700 }}>{fmt(Number(row.price))}</td>
                                                    <td>{String(row.available_seats)}</td>
                                                    <td>
                                                        <button className="adm-action-btn adm-edit-btn" onClick={() => openEdit(row)}>✏️ Sửa</button>
                                                        <button className="adm-action-btn adm-del-btn" onClick={() => handleDelete(row)}>🗑 Xóa</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── USERS ── */}
                    {section === "users" && (
                        <div className="adm-table-card">
                            <div className="adm-table-header">
                                <div className="adm-table-title">👥 Danh sách người dùng</div>
                            </div>
                            <div className="adm-table-wrap">
                                {loading ? <div className="adm-loading">Đang tải...</div> : data.length === 0 ? <div className="adm-empty">Không có người dùng</div> : (
                                    <table>
                                        <thead><tr><th>#</th><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Ví</th><th>Role</th><th>Đăng ký</th><th>Thao tác</th></tr></thead>
                                        <tbody>
                                            {data.map((row, i) => (
                                                <tr key={String(row.user_id ?? i)}>
                                                    <td style={{ color: "#6b8cbf" }}>#{String(row.user_id)}</td>
                                                    <td style={{ fontWeight: 600 }}>{String(row.full_name || "—")}</td>
                                                    <td style={{ color: "#6b8cbf", fontSize: "0.82rem" }}>{String(row.email)}</td>
                                                    <td>{String(row.phone || "—")}</td>
                                                    <td style={{ color: "#00875a", fontWeight: 600 }}>{fmt(Number(row.wallet || 0))}</td>
                                                    <td>
                                                        <select
                                                            className="adm-select"
                                                            value={String(row.role)}
                                                            style={{ color: roleColor[String(row.role)] || "#1a3c6b", fontWeight: 700 }}
                                                            onChange={e => handleRoleChange(Number(row.user_id), e.target.value)}
                                                            disabled={Number(row.user_id) === user.user_id}
                                                        >
                                                            <option value="USER">USER</option>
                                                            <option value="ADMIN">ADMIN</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ color: "#6b8cbf", fontSize: "0.8rem" }}>
                                                        {row.created_at ? new Date(String(row.created_at)).toLocaleDateString("vi-VN") : "—"}
                                                    </td>
                                                    <td>
                                                        {Number(row.user_id) !== user.user_id && (
                                                            <button className="adm-action-btn adm-del-btn" onClick={() => handleDelete(row)}>🗑 Xóa</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </main>

            {/* Modal */}
            {modal && fieldDefs[section] && (
                <Modal
                    title={modal.mode === "create" ? `Thêm ${navItems.find(n => n.key === section)?.label}` : `Chỉnh sửa ${navItems.find(n => n.key === section)?.label}`}
                    fields={fieldDefs[section]}
                    values={formValues}
                    onChange={(k, v) => setFormValues(prev => ({ ...prev, [k]: v }))}
                    onSave={handleSave}
                    onClose={() => setModal(null)}
                    saving={saving}
                />
            )}
        </>
    );
}
