"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import CloudinaryUpload from "@/components/CloudinaryUpload";
import CloudinaryMultiUpload from "@/components/CloudinaryMultiUpload";

type Section = "dashboard" | "bookings" | "hotels" | "flights" | "buses" | "trains" | "users" | "wallets" | "promotions" | "banners" | "reviews";

interface Stats {
    total_users: number; total_bookings: number; confirmed_bookings: number;
    pending_bookings: number; total_revenue: number;
    total_hotels: number; total_flights: number; total_buses: number; total_trains: number;
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
    // values is also used for image fields — onChange sets the URL directly
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
                        {f.type === "images" ? (
                            <CloudinaryMultiUpload
                                label={f.label + (f.required ? " *" : "")}
                                value={values[f.key] || ""}
                                onChange={csv => onChange(f.key, csv)}
                                max={3}
                            />
                        ) : f.type === "image" ? (
                            <CloudinaryUpload
                                label={f.label + (f.required ? " *" : "")}
                                value={values[f.key] || ""}
                                onChange={url => onChange(f.key, url)}
                            />
                        ) : (
                            <>
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
                            </>
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

// ── WALLET SECTION COMPONENT ──────────────────────────────────────
function WalletSection() {
    const [tab, setTab] = useState<"wallets" | "withdrawals">("wallets");

    // Wallets tab state
    const [wallets, setWallets] = useState<Record<string, unknown>[]>([]);
    const [walletsLoading, setWalletsLoading] = useState(true);
    const [walletSearch, setWalletSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<Record<string, unknown> | null>(null);
    const [txns, setTxns] = useState<Record<string, unknown>[]>([]);
    const [txnLoading, setTxnLoading] = useState(false);

    // Withdrawals tab state
    const [withdrawals, setWithdrawals] = useState<Record<string, unknown>[]>([]);
    const [wdLoading, setWdLoading] = useState(false);
    const [wdSearch, setWdSearch] = useState("");
    const [pendingCount, setPendingCount] = useState(0);

    const loadWallets = () => {
        setWalletsLoading(true);
        api.get("/api/admin/wallets")
            .then(r => setWallets(r.data))
            .finally(() => setWalletsLoading(false));
    };

    const loadWithdrawals = () => {
        setWdLoading(true);
        api.get("/api/admin/withdrawals")
            .then(r => {
                setWithdrawals(r.data);
                setPendingCount(r.data.filter((w: Record<string, unknown>) => w.status === "pending").length);
            })
            .finally(() => setWdLoading(false));
    };

    useEffect(() => { loadWallets(); loadWithdrawals(); }, []);

    const openTxns = async (user: Record<string, unknown>) => {
        setSelectedUser(user);
        setTxnLoading(true);
        setTxns([]);
        try {
            const r = await api.get(`/api/admin/wallets/${user.user_id}/transactions`);
            setTxns(r.data);
        } finally { setTxnLoading(false); }
    };

    const handleWithdrawalAction = async (id: number, action: "approve" | "reject") => {
        const label = action === "approve" ? "xác nhận chuyển tiền" : "từ chối";
        if (!confirm(`Xác nhận ${label} yêu cầu #${id}?`)) return;
        try {
            await api.post(`/api/admin/withdrawals/${id}/${action}`);
            loadWithdrawals();
            loadWallets(); // cập nhật số dư ví sau khi duyệt
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            alert(detail || "Thao tác thất bại");
        }
    };

    const fmtAmt = (n: number) => {
        const abs = Math.abs(n).toLocaleString("vi-VN") + "₫";
        return n >= 0 ? `+${abs}` : `-${abs}`;
    };

    const typeLabel: Record<string, string> = { deposit: "Nạp tiền", withdrawal: "Rút tiền", payment: "Thanh toán", refund: "Hoàn tiền", cashback: "Cashback" };
    const typeColor: Record<string, string> = { deposit: "#00875a", withdrawal: "#c0392b", payment: "#b8860b", refund: "#0052cc", cashback: "#7b2d8b" };
    const typeBg: Record<string, string> = { deposit: "#e6f9f0", withdrawal: "#fff0f0", payment: "#fffbe6", refund: "#e8f0fe", cashback: "#f3e8ff" };

    const wdStatusColor: Record<string, string> = { pending: "#b8860b", completed: "#00875a", rejected: "#c0392b" };
    const wdStatusLabel: Record<string, string> = { pending: "Chờ xử lý", completed: "Đã hoàn tất", rejected: "Bị từ chối" };
    const wdStatusBg: Record<string, string> = { pending: "#fffbe6", completed: "#e6f9f0", rejected: "#fff0f0" };

    const filteredWallets = wallets.filter(w =>
        String(w.full_name || "").toLowerCase().includes(walletSearch.toLowerCase()) ||
        String(w.email || "").toLowerCase().includes(walletSearch.toLowerCase())
    );

    const filteredWd = withdrawals.filter(w =>
        String(w.full_name || "").toLowerCase().includes(wdSearch.toLowerCase()) ||
        String(w.email || "").toLowerCase().includes(wdSearch.toLowerCase()) ||
        String(w.bank_name || "").toLowerCase().includes(wdSearch.toLowerCase()) ||
        String(w.account_no || "").toLowerCase().includes(wdSearch.toLowerCase())
    );

    const tabStyle = (active: boolean) => ({
        padding: "0.55rem 1.4rem", borderRadius: 8, border: "none", cursor: "pointer",
        fontWeight: 700, fontSize: "0.88rem",
        background: active ? "#0052cc" : "#f0f4ff",
        color: active ? "#fff" : "#6b8cbf",
        transition: "all 0.15s", position: "relative" as const,
    });

    return (
        <div>
            {/* Tabs */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", alignItems: "center" }}>
                <button style={tabStyle(tab === "wallets")} onClick={() => setTab("wallets")}>👛 Danh sách ví</button>
                <button style={tabStyle(tab === "withdrawals")} onClick={() => setTab("withdrawals")}>
                    💸 Yêu cầu rút tiền
                    {pendingCount > 0 && (
                        <span style={{ marginLeft: 6, background: "#c0392b", color: "#fff", borderRadius: 99, fontSize: "0.7rem", padding: "0.1rem 0.45rem", fontWeight: 800 }}>
                            {pendingCount}
                        </span>
                    )}
                </button>
            </div>

            {/* ── TAB: DANH SÁCH VÍ ── */}
            {tab === "wallets" && (
                <div className="adm-table-card">
                    <div className="adm-table-header">
                        <div className="adm-table-title">👛 Ví người dùng</div>
                        <div className="adm-table-actions">
                            <input className="adm-search" value={walletSearch} onChange={e => setWalletSearch(e.target.value)} placeholder="🔍 Tìm tên, email..." />
                        </div>
                    </div>
                    <div className="adm-table-wrap">
                        {walletsLoading ? <div className="adm-loading">Đang tải...</div> : filteredWallets.length === 0 ? <div className="adm-empty">Không tìm thấy</div> : (
                            <table>
                                <thead><tr><th>#</th><th>Họ tên</th><th>Email</th><th>Số dư ví</th><th>Thao tác</th></tr></thead>
                                <tbody>
                                    {filteredWallets.map((w, i) => (
                                        <tr key={String(w.user_id)}>
                                            <td style={{ color: "#6b8cbf" }}>{i + 1}</td>
                                            <td style={{ fontWeight: 600 }}>{String(w.full_name || "—")}</td>
                                            <td style={{ color: "#6b8cbf", fontSize: "0.82rem" }}>{String(w.email || "")}</td>
                                            <td style={{ fontWeight: 700, color: Number(w.wallet) > 0 ? "#00875a" : "#6b8cbf" }}>
                                                {Number(w.wallet || 0).toLocaleString("vi-VN")}₫
                                            </td>
                                            <td>
                                                <button className="adm-action-btn" style={{ background: "#e8f0fe", color: "#0052cc" }} onClick={() => openTxns(w)}>
                                                    📋 Lịch sử giao dịch
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB: RÚT TIỀN ── */}
            {tab === "withdrawals" && (
                <div className="adm-table-card">
                    <div className="adm-table-header">
                        <div className="adm-table-title">💸 Yêu cầu rút tiền</div>
                        <div className="adm-table-actions">
                            <input className="adm-search" value={wdSearch} onChange={e => setWdSearch(e.target.value)} placeholder="🔍 Tìm tên, ngân hàng..." />
                        </div>
                    </div>
                    <div className="adm-table-wrap">
                        {wdLoading ? <div className="adm-loading">Đang tải...</div> : filteredWd.length === 0 ? <div className="adm-empty">Không có yêu cầu rút tiền nào</div> : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th><th>Khách hàng</th><th>Số tiền</th>
                                        <th>Ngân hàng</th><th>Số TK / Chủ TK</th>
                                        <th>Ngày yêu cầu</th><th>Trạng thái</th><th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredWd.map((row, i) => (
                                        <tr key={String(row.id ?? i)}>
                                            <td style={{ color: "#6b8cbf" }}>#{String(row.id)}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{String(row.full_name || "—")}</div>
                                                <div style={{ fontSize: "0.75rem", color: "#6b8cbf" }}>{String(row.email || "")}</div>
                                            </td>
                                            <td style={{ fontWeight: 800, color: "#c0392b" }}>
                                                -{Number(row.amount).toLocaleString("vi-VN")}₫
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{String(row.bank_name || "—")}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{String(row.account_no || "—")}</div>
                                                <div style={{ fontSize: "0.75rem", color: "#6b8cbf" }}>{String(row.account_name || "")}</div>
                                            </td>
                                            <td style={{ color: "#6b8cbf", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                                                {row.created_at ? new Date(String(row.created_at)).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                                            </td>
                                            <td>
                                                <span className="adm-badge" style={{ background: wdStatusBg[String(row.status)] || "#f0f4ff", color: wdStatusColor[String(row.status)] || "#6b8cbf" }}>
                                                    {wdStatusLabel[String(row.status)] || String(row.status)}
                                                </span>
                                            </td>
                                            <td>
                                                {String(row.status) === "pending" && (
                                                    <>
                                                        <button className="adm-action-btn adm-approve-btn" onClick={() => handleWithdrawalAction(Number(row.id), "approve")}>✅ Xác nhận CK</button>
                                                        <button className="adm-action-btn adm-reject-btn" onClick={() => handleWithdrawalAction(Number(row.id), "reject")}>✕ Từ chối</button>
                                                    </>
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

            {/* ── Modal lịch sử giao dịch ── */}
            {selectedUser && (
                <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => setSelectedUser(null)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 760, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                            <div>
                                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1a3c6b" }}>📋 Lịch sử giao dịch — {String(selectedUser.full_name)}</div>
                                <div style={{ fontSize: "0.82rem", color: "#6b8cbf", marginTop: 3 }}>
                                    {String(selectedUser.email)} &nbsp;|&nbsp; Số dư: <strong style={{ color: "#00875a" }}>{Number(selectedUser.wallet || 0).toLocaleString("vi-VN")}₫</strong>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "#6b8cbf" }}>×</button>
                        </div>

                        {txnLoading ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "#6b8cbf" }}>Đang tải...</div>
                        ) : txns.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "#6b8cbf" }}>Chưa có giao dịch nào</div>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                                    <thead>
                                        <tr style={{ background: "#f0f4ff" }}>
                                            {["Thời gian", "Loại", "Số tiền", "Mô tả", "Người duyệt", "Trạng thái"].map(h => (
                                                <th key={h} style={{ padding: "0.6rem 0.85rem", textAlign: "left", fontWeight: 700, color: "#1a3c6b", whiteSpace: "nowrap" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {txns.map((t) => (
                                            <tr key={String(t.transaction_id)} style={{ borderBottom: "1px solid #f0f4ff" }}>
                                                <td style={{ padding: "0.6rem 0.85rem", color: "#6b8cbf", whiteSpace: "nowrap" }}>
                                                    {new Date(String(t.created_at)).toLocaleString("vi-VN")}
                                                </td>
                                                <td style={{ padding: "0.6rem 0.85rem" }}>
                                                    <span style={{ padding: "0.2rem 0.6rem", borderRadius: 99, fontSize: "0.78rem", fontWeight: 600, background: typeBg[String(t.type)] || "#f0f4ff", color: typeColor[String(t.type)] || "#1a3c6b" }}>
                                                        {typeLabel[String(t.type)] || String(t.type)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "0.6rem 0.85rem", fontWeight: 700, color: Number(t.amount) >= 0 ? "#00875a" : "#c0392b", whiteSpace: "nowrap" }}>
                                                    {fmtAmt(Number(t.amount))}
                                                </td>
                                                <td style={{ padding: "0.6rem 0.85rem", color: "#4a5568" }}>{String(t.description || "—")}</td>
                                                <td style={{ padding: "0.6rem 0.85rem", color: t.approved_by_name ? "#0052cc" : "#b0bcd8", fontStyle: t.approved_by_name ? "normal" : "italic", whiteSpace: "nowrap" }}>
                                                    {t.approved_by_name ? `👤 ${String(t.approved_by_name)}` : "—"}
                                                </td>
                                                <td style={{ padding: "0.6rem 0.85rem" }}>
                                                    <span style={{ padding: "0.2rem 0.5rem", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600, background: t.status === "success" ? "#e6f9f0" : "#fff0f0", color: t.status === "success" ? "#00875a" : "#c0392b" }}>
                                                        {t.status === "success" ? "Thành công" : String(t.status)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminPage() {
    const router = useRouter();
    const { user, hasHydrated } = useAuthStore();
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
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [importing, setImporting] = useState(false);
    const excelInputRef = useRef<HTMLInputElement>(null);
    const offsetRef = useRef(0);
    const hasMoreRef = useRef(false);
    const loadingMoreRef = useRef(false);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef("");
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState("");
    const [bannerTab, setBannerTab] = useState<"banners" | "destinations">("banners");
    const [destData, setDestData] = useState<Record<string, unknown>[]>([]);
    const [destLoading, setDestLoading] = useState(false);
    const [destModal, setDestModal] = useState<{ mode: "create" | "edit"; row?: Record<string, unknown> } | null>(null);
    const [destFormValues, setDestFormValues] = useState<Record<string, string>>({});
    const [destSaving, setDestSaving] = useState(false);
    const [destSearch, setDestSearch] = useState("");
    const [reviewData, setReviewData] = useState<Record<string, unknown>[]>([]);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewSearch, setReviewSearch] = useState("");

    // Bookings + Modifications merged
    const [bookingTab, setBookingTab] = useState<"bookings" | "modifications">("bookings");
    const [modData, setModData] = useState<Record<string, unknown>[]>([]);
    const [modLoading, setModLoading] = useState(false);
    const [modSearch, setModSearch] = useState("");

    // Booking detail modal (admin)
    const [bookingDetail, setBookingDetail] = useState<Record<string, unknown> | null>(null);
    const [bookingDetailLoading, setBookingDetailLoading] = useState(false);

    // Hotel detail / room types
    const [selectedHotel, setSelectedHotel] = useState<Record<string, unknown> | null>(null);
    const [roomData, setRoomData] = useState<Record<string, unknown>[]>([]);
    const [roomLoading, setRoomLoading] = useState(false);
    const [roomModal, setRoomModal] = useState<{ mode: "create" | "edit"; row?: Record<string, unknown> } | null>(null);
    const [roomFormValues, setRoomFormValues] = useState<Record<string, string>>({});
    const [roomSaving, setRoomSaving] = useState(false);

    // Auth guard — chờ Zustand rehydrate từ localStorage xong mới kiểm tra
    useEffect(() => {
        if (!hasHydrated) return;
        if (!user) router.replace("/login");
        else if (user.role !== "ADMIN") router.replace("/");
    }, [hasHydrated, user, router]);

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

    // Load section data with server-side pagination
    const PAGINATED = ["bookings", "hotels", "flights", "buses", "trains", "users", "promotions"];
    const loadSection = useCallback(async (s: Section, append = false) => {
        if (s === "dashboard" || s === "wallets") return;
        if (append) {
            if (loadingMoreRef.current || !hasMoreRef.current) return;
            loadingMoreRef.current = true;
            setLoadingMore(true);
        } else {
            setLoading(true);
            setData([]);
            offsetRef.current = 0;
            hasMoreRef.current = false;
        }
        try {
            const usePagination = PAGINATED.includes(s);
            const params = usePagination
                ? { skip: offsetRef.current, limit: 50, search: searchRef.current }
                : {};
            const res = await api.get(`/api/admin/${s}`, { params });
            const rows = res.data as Record<string, unknown>[];
            if (append) setData(prev => {
                const ID_KEYS: Record<string, string> = {
                    users: "user_id", bookings: "booking_id", hotels: "hotel_id",
                    flights: "flight_id", buses: "bus_id", trains: "train_id", promotions: "promo_id",
                };
                const idKey = ID_KEYS[s];
                if (!idKey) return [...prev, ...rows];
                const seen = new Set(prev.map(r => r[idKey]));
                return [...prev, ...rows.filter(r => !seen.has(r[idKey]))];
            });
            else setData(rows);
            if (usePagination) {
                offsetRef.current += rows.length;
                hasMoreRef.current = rows.length >= 50;
            }
        } catch { if (!append) setData([]); }
        finally {
            setLoading(false);
            setLoadingMore(false);
            loadingMoreRef.current = false;
        }
    }, []);

    useEffect(() => {
        searchRef.current = "";
        setSearch("");
        setSelectedHotel(null);
        loadSection(section);
    }, [section, loadSection]);

    const loadDestData = useCallback(async () => {
        setDestLoading(true);
        try { const r = await api.get("/api/admin/destinations"); setDestData(r.data); }
        catch { setDestData([]); }
        finally { setDestLoading(false); }
    }, []);
    useEffect(() => { if (section === "banners" && bannerTab === "destinations") loadDestData(); }, [section, bannerTab, loadDestData]);

    // Infinite scroll observer
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
                loadSection(section, true);
            }
        }, { rootMargin: "300px" });
        observer.observe(el);
        return () => observer.disconnect();
    }, [section, loadSection]);

    const loadReviews = useCallback(async () => {
        setReviewLoading(true);
        try { const r = await api.get("/api/admin/reviews"); setReviewData(r.data); }
        catch { setReviewData([]); }
        finally { setReviewLoading(false); }
    }, []);
    useEffect(() => { if (section === "reviews") loadReviews(); }, [section, loadReviews]);

    const loadModData = useCallback(async () => {
        setModLoading(true);
        try { const r = await api.get("/api/admin/modifications"); setModData(r.data); }
        catch { setModData([]); }
        finally { setModLoading(false); }
    }, []);
    useEffect(() => { if (section === "bookings" && bookingTab === "modifications") loadModData(); }, [section, bookingTab, loadModData]);

    const openBookingDetail = async (bookingId: number) => {
        setBookingDetail(null);
        setBookingDetailLoading(true);
        try {
            const r = await api.get(`/api/admin/bookings/${bookingId}/detail`);
            setBookingDetail(r.data);
        } catch { setBookingDetail({}); }
        finally { setBookingDetailLoading(false); }
    };

    const destFieldDefs = [
        { key: "city", label: "Thành phố", required: true },
        { key: "name", label: "Tên địa điểm", required: true },
        { key: "description", label: "Mô tả", type: "textarea" },
        { key: "image_url", label: "Ảnh đại diện", type: "image" },
    ];

    const handleDestSave = async () => {
        if (!destFormValues.city?.trim() || !destFormValues.name?.trim()) {
            alert("Vui lòng điền Thành phố và Tên địa điểm"); return;
        }
        setDestSaving(true);
        try {
            const payload = { city: destFormValues.city, name: destFormValues.name, description: destFormValues.description || null, image_url: destFormValues.image_url || null };
            if (destModal?.mode === "create") await api.post("/api/admin/destinations", payload);
            else await api.put(`/api/admin/destinations/${destModal?.row?.destination_id}`, payload);
            setDestModal(null);
            loadDestData();
        } catch { alert("Lưu thất bại"); }
        finally { setDestSaving(false); }
    };

    const handleDestDelete = async (row: Record<string, unknown>) => {
        if (!confirm(`Xóa địa điểm "${row.name}"?`)) return;
        try { await api.delete(`/api/admin/destinations/${row.destination_id}`); loadDestData(); }
        catch { alert("Xóa thất bại"); }
    };

    const loadRooms = useCallback(async (hotelId: number) => {
        setRoomLoading(true);
        try {
            const res = await api.get(`/api/admin/hotels/${hotelId}/rooms`);
            setRoomData(res.data);
        } catch { setRoomData([]); }
        finally { setRoomLoading(false); }
    }, []);

    const openHotelDetail = (hotel: Record<string, unknown>) => {
        setSelectedHotel(hotel);
        loadRooms(Number(hotel.hotel_id));
    };

    const roomFieldDefs = [
        { key: "name", label: "Tên loại phòng", required: true },
        { key: "price_per_night", label: "Giá/đêm (₫)", type: "number", required: true },
        { key: "max_guests", label: "Số khách tối đa", type: "number" },
        { key: "image_url", label: "Ảnh phòng (tối đa 3)", type: "images" },
    ];

    const handleRoomSave = async () => {
        const missing = roomFieldDefs.filter(f => f.required && !roomFormValues[f.key]?.trim());
        if (missing.length > 0) { alert(`Vui lòng điền: ${missing.map(f => f.label).join(", ")}`); return; }
        setRoomSaving(true);
        const hotelId = Number(selectedHotel!.hotel_id);
        const payload = {
            name: roomFormValues.name,
            price_per_night: Number(roomFormValues.price_per_night),
            max_guests: roomFormValues.max_guests ? Number(roomFormValues.max_guests) : 2,
            image_url: roomFormValues.image_url || null,
        };
        try {
            if (roomModal?.mode === "create") {
                await api.post(`/api/admin/hotels/${hotelId}/rooms`, payload);
            } else {
                const rid = roomModal?.row?.room_type_id;
                await api.put(`/api/admin/hotels/${hotelId}/rooms/${rid}`, payload);
            }
            setRoomModal(null);
            loadRooms(hotelId);
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            alert(detail || "Lỗi, vui lòng thử lại");
        } finally { setRoomSaving(false); }
    };

    const handleRoomDelete = async (row: Record<string, unknown>) => {
        if (!confirm(`Xóa loại phòng "${row.name}"?`)) return;
        const hotelId = Number(selectedHotel!.hotel_id);
        try {
            await api.delete(`/api/admin/hotels/${hotelId}/rooms/${row.room_type_id}`);
            loadRooms(hotelId);
        } catch { alert("Xóa thất bại"); }
    };

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
            { key: "image_url", label: "Ảnh khách sạn (tối đa 3)", type: "images" },
        ],
        flights: [
            { key: "airline", label: "Hãng bay", required: true },
            { key: "from_city", label: "Điểm đi", required: true },
            { key: "to_city", label: "Điểm đến", required: true },
            { key: "depart_time", label: "Giờ khởi hành", type: "datetime-local" },
            { key: "arrive_time", label: "Giờ đến", type: "datetime-local" },
            { key: "price", label: "Giá (₫)", type: "number", required: true },
            { key: "available_seats", label: "Số ghế", type: "number" },
            { key: "status", label: "Trạng thái", type: "select", options: [{ value: "active", label: "Đang chạy" }, { value: "cancelled", label: "Đã hủy" }] },
            { key: "image_url", label: "Ảnh", type: "image" },
        ],
        buses: [
            { key: "company", label: "Nhà xe", required: true },
            { key: "from_city", label: "Điểm đi", required: true },
            { key: "to_city", label: "Điểm đến", required: true },
            { key: "depart_time", label: "Giờ khởi hành", type: "datetime-local" },
            { key: "arrive_time", label: "Giờ đến", type: "datetime-local" },
            { key: "price", label: "Giá (₫)", type: "number", required: true },
            { key: "available_seats", label: "Số ghế", type: "number" },
            { key: "status", label: "Trạng thái", type: "select", options: [{ value: "active", label: "Đang chạy" }, { value: "cancelled", label: "Đã hủy" }] },
            { key: "image_url", label: "Ảnh", type: "image" },
        ],
        trains: [
            { key: "train_code", label: "Mã tàu (VD: SE1)", required: true },
            { key: "from_city", label: "Thành phố đi", required: true },
            { key: "to_city", label: "Thành phố đến", required: true },
            { key: "from_station", label: "Ga đi", required: true },
            { key: "to_station", label: "Ga đến", required: true },
            { key: "depart_time", label: "Giờ khởi hành", type: "datetime-local", required: true },
            { key: "arrive_time", label: "Giờ đến", type: "datetime-local", required: true },
            { key: "status", label: "Trạng thái", type: "select", options: [{ value: "active", label: "Đang chạy" }, { value: "cancelled", label: "Đã hủy" }] },
        ],
    };

    const bannerFieldDefs = [
        { key: "title", label: "Tiêu đề" },
        { key: "subtitle", label: "Mô tả phụ" },
        { key: "image_url", label: "Ảnh banner", type: "image", required: true },
        { key: "link_url", label: "URL liên kết (khi click)" },
        { key: "page_display", label: "Vị trí hiển thị", type: "select", required: true, options: [{ value: "home", label: "Trang chủ" }, { value: "promotion", label: "Trang Khuyến mãi" }] },
        { key: "display_order", label: "Thứ tự hiển thị", type: "number" },
        { key: "start_date", label: "Ngày bắt đầu", type: "date" },
        { key: "end_date", label: "Ngày kết thúc", type: "date" },
        { key: "is_active", label: "Trạng thái", type: "select", options: [{ value: "1", label: "Đang hiển thị" }, { value: "0", label: "Ẩn" }] },
    ];

    const promotionFieldDefs = [
        { key: "code", label: "Mã giảm giá", required: true },
        { key: "description", label: "Mô tả", type: "textarea" },
        { key: "discount_type", label: "Loại giảm", type: "select", options: [{ value: "percent", label: "Theo %" }, { value: "fixed", label: "Số tiền cố định" }] },
        { key: "discount_percent", label: "Giá trị giảm (% hoặc ₫)", type: "number", required: true },
        { key: "max_discount", label: "Giảm tối đa (₫)", type: "number" },
        { key: "min_order_value", label: "Đơn hàng tối thiểu (₫)", type: "number" },
        { key: "usage_limit", label: "Số lần dùng tối đa", type: "number" },
        { key: "applies_to", label: "Áp dụng cho", type: "select", options: [{ value: "all", label: "Tất cả" }, { value: "hotel", label: "Khách sạn" }, { value: "flight", label: "Chuyến bay" }, { value: "bus", label: "Xe khách" }, { value: "train", label: "Tàu hỏa" }] },
        { key: "status", label: "Trạng thái", type: "select", options: [{ value: "active", label: "Đang hoạt động" }, { value: "inactive", label: "Tắt" }] },
        { key: "per_user_limit", label: "Giới hạn/tài khoản (để trống = không giới hạn)", type: "number" },
        { key: "expired_at", label: "Hạn sử dụng", type: "datetime-local" },
    ];

    const userCreateFieldDefs = [
        { key: "full_name", label: "Họ tên", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        { key: "password", label: "Mật khẩu", type: "password", required: true },
        { key: "phone", label: "Số điện thoại" },
        { key: "role", label: "Role", type: "select", options: [{ value: "USER", label: "USER" }, { value: "ADMIN", label: "ADMIN" }] },
    ];
    const userEditFieldDefs = [
        { key: "full_name", label: "Họ tên", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        { key: "phone", label: "Số điện thoại" },
        { key: "role", label: "Role", type: "select", options: [{ value: "USER", label: "USER" }, { value: "ADMIN", label: "ADMIN" }] },
        { key: "new_password", label: "Mật khẩu mới (để trống nếu không đổi)", type: "password" },
    ];
    // Alias kept for backward compat with existing code using userFieldDefs
    const userFieldDefs = modal?.mode === "edit" ? userEditFieldDefs : userCreateFieldDefs;

    const idKey: Record<string, string> = { hotels: "hotel_id", flights: "flight_id", buses: "bus_id", trains: "train_id", users: "user_id", bookings: "booking_id", promotions: "promo_id", banners: "banner_id" };

    const q = search.trim().toLowerCase();
    // Paginated sections: server already filtered, skip client-side filter
    // Banners/non-paginated: keep client-side filter
    const filteredData = (["hotels","flights","buses","trains","bookings","users","promotions"].includes(section))
        ? data
        : q === "" ? data : data.filter(row => {
            if (section === "banners") return String(row.title || "").toLowerCase().includes(q) || String(row.subtitle || "").toLowerCase().includes(q);
            return true;
        });

    const openCreate = () => {
        if (section === "hotels" && destinations.length === 0) loadDestinations();
        if (section === "users") setFormValues({ role: "USER" });
        else if (section === "promotions") setFormValues({ discount_type: "percent", applies_to: "all", status: "active", usage_limit: "100" });
        else if (section === "banners") setFormValues({ is_active: "1", display_order: "0", page_display: "home" });
        else setFormValues({});
        setModal({ mode: "create" });
    };
    const openEdit = (row: Record<string, unknown>) => {
        if (section === "hotels" && destinations.length === 0) loadDestinations();
        const vals: Record<string, string> = {};
        Object.entries(row).forEach(([k, v]) => { vals[k] = v != null ? String(v) : ""; });
        setFormValues(vals);
        setModal({ mode: "edit", row });
    };

    const handleSearchChange = (val: string) => {
        setSearch(val);
        searchRef.current = val;
        const PAGINATED_S = ["bookings", "hotels", "flights", "buses", "trains", "users", "promotions"];
        if (!PAGINATED_S.includes(section)) return;
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => { loadSection(section); }, 400);
    };

    const EXCEL_SECTIONS = ["hotels", "flights", "buses", "trains", "promotions"];

    const downloadTemplate = () => {
        api.get(`/api/admin/template/${section}`, { responseType: "blob" })
            .then(res => {
                const blob = new Blob([res.data], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `template_${section}.xlsx`;
                a.click();
                URL.revokeObjectURL(a.href);
            })
            .catch(() => alert("Không thể tải file mẫu. Vui lòng thử lại."));
    };

    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            alert("Chỉ hỗ trợ file .xlsx hoặc .xls");
            e.target.value = "";
            return;
        }
        setImporting(true);
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res = await api.post(`/api/admin/import/${section}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const { inserted, skipped, errors } = res.data;
            let msg = `✅ Nhập thành công ${inserted} bản ghi.`;
            if (skipped > 0) msg += ` Bỏ qua ${skipped} bản ghi trùng.`;
            if (errors?.length > 0) msg += `\n⚠️ Lỗi:\n${errors.slice(0, 5).join("\n")}`;
            alert(msg);
            loadSection(section);
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            alert("Nhập thất bại: " + (detail || "Lỗi không xác định"));
        } finally {
            setImporting(false);
            e.target.value = "";
        }
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
        const fields = section === "users" ? userFieldDefs : section === "promotions" ? promotionFieldDefs : section === "banners" ? bannerFieldDefs : (fieldDefs[section] ?? []);
        const missing = fields.filter(f => f.required && !formValues[f.key]?.trim());
        if (missing.length > 0) {
            alert(`Vui lòng điền: ${missing.map(f => f.label).join(", ")}`);
            return;
        }

        setSaving(true);
        try {
            const payload = section === "users"
                ? modal?.mode === "edit"
                    ? { full_name: formValues.full_name, email: formValues.email, phone: formValues.phone || null, role: formValues.role || "USER", new_password: formValues.new_password || null }
                    : { full_name: formValues.full_name, email: formValues.email, password: formValues.password, phone: formValues.phone || null, role: formValues.role || "USER" }
                : section === "promotions"
                    ? {
                        code: formValues.code,
                        description: formValues.description || null,
                        discount_type: formValues.discount_type || "percent",
                        discount_percent: Number(formValues.discount_percent) || 0,
                        max_discount: Number(formValues.max_discount) || 0,
                        min_order_value: Number(formValues.min_order_value) || 0,
                        usage_limit: Number(formValues.usage_limit) || 100,
                        applies_to: formValues.applies_to || "all",
                        status: formValues.status || "active",
                        expired_at: formValues.expired_at || null,
                        per_user_limit: formValues.per_user_limit ? Number(formValues.per_user_limit) : null,
                    }
                    : section === "banners"
                        ? {
                            title: formValues.title,
                            subtitle: formValues.subtitle || null,
                            image_url: formValues.image_url,
                            link_url: formValues.link_url || null,
                            page_display: formValues.page_display || "home",
                            display_order: Number(formValues.display_order) || 0,
                            is_active: formValues.is_active === "0" ? 0 : 1,
                            start_date: formValues.start_date || null,
                            end_date: formValues.end_date || null,
                        }
                        : buildPayload();
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

    const showToast = (message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleDelete = async (row: Record<string, unknown>) => {
        if (!confirm("Xác nhận xóa?")) return;
        try {
            await api.delete(`/api/admin/${section}/${row[idKey[section]]}`);
            loadSection(section);
            showToast("Xóa thành công!");
        } catch { showToast("Xóa thất bại", "error"); }
    };



    const handleReviewDelete = async (reviewId: number) => {
        if (!confirm("Xác nhận xóa đánh giá này?")) return;
        try {
            await api.delete(`/api/admin/reviews/${reviewId}`);
            setReviewData(prev => prev.filter(r => Number(r.review_id) !== reviewId));
            showToast("Đã xóa đánh giá!");
        } catch { showToast("Xóa thất bại", "error"); }
    };

    const handleRoleChange = async (userId: number, role: string) => {
        try {
            await api.put(`/api/admin/users/${userId}/role`, null, { params: { role } });
            loadSection("users");
        } catch { alert("Cập nhật thất bại"); }
    };

    const handleTogglePromo = async (promoId: number) => {
        try {
            await api.put(`/api/admin/promotions/${promoId}/toggle`);
            loadSection("promotions");
        } catch { alert("Cập nhật thất bại"); }
    };

    const handleToggleBanner = async (bannerId: number) => {
        try {
            await api.put(`/api/admin/banners/${bannerId}/toggle`);
            loadSection("banners");
        } catch { alert("Cập nhật thất bại"); }
    };

    const handleWithdrawalAction = async (id: number, action: "approve" | "reject") => {
        const label = action === "approve" ? "xác nhận chuyển tiền" : "từ chối";
        if (!confirm(`Xác nhận ${label} yêu cầu #${id}?`)) return;
        try {
            await api.post(`/api/admin/withdrawals/${id}/${action}`);
            loadSection("withdrawals");
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            alert(detail || "Thao tác thất bại");
        }
    };

    const handleModificationAction = async (id: number, action: "approve" | "reject") => {
        const label = action === "approve" ? "duyệt" : "từ chối";
        if (!confirm(`Xác nhận ${label} yêu cầu #${id}?`)) return;
        try {
            await api.post(`/api/admin/modifications/${id}/${action}`);
            loadModData();
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            alert(detail || "Thao tác thất bại");
        }
    };

    const navGroups = [
        {
            title: "Tổng quan",
            items: [
                { key: "dashboard", icon: "📊", label: "Dashboard" },
                { key: "reviews", icon: "⭐", label: "Đánh giá" },
                { key: "promotions", icon: "🎟️", label: "Mã giảm giá" },
                { key: "banners", icon: "🖼️", label: "Banner & Địa điểm" },
            ]
        },
        {
            title: "Dịch vụ",
            items: [
                { key: "hotels", icon: "🏨", label: "Khách sạn" },
                { key: "flights", icon: "✈️", label: "Chuyến bay" },
                { key: "buses", icon: "🚌", label: "Xe khách" },
                { key: "trains", icon: "🚆", label: "Tàu hỏa" },
            ]
        },
        {
            title: "User",
            items: [
                { key: "users", icon: "👥", label: "Người dùng" },
                { key: "wallets", icon: "👛", label: "Ví" },
            ]
        },
        {
            title: "Quản lý đặt chỗ",
            items: [
                { key: "bookings", icon: "🗂️", label: "Đặt chỗ & Đổi/Hủy" },
            ]
        }
    ];

    const navItems = navGroups.flatMap(g => g.items) as { key: Section; icon: string; label: string }[];

    const statCards = stats ? [
        { icon: "👥", label: "Người dùng", value: stats.total_users, color: "#0052cc" },
        { icon: "🗂️", label: "Tổng đặt chỗ", value: stats.total_bookings, color: "#00875a" },
        { icon: "✅", label: "Đã xác nhận", value: stats.confirmed_bookings, color: "#00875a" },
        { icon: "⏳", label: "Chờ thanh toán", value: stats.pending_bookings, color: "#b8860b" },
        { icon: "💰", label: "Doanh thu", value: fmt(stats.total_revenue), color: "#0052cc" },
        { icon: "🏨", label: "Khách sạn", value: stats.total_hotels, color: "#6f42c1" },
        { icon: "✈️", label: "Chuyến bay", value: stats.total_flights, color: "#0052cc" },
        { icon: "🚌", label: "Xe khách", value: stats.total_buses, color: "#fd7e14" },
        { icon: "🚆", label: "Tàu hỏa", value: stats.total_trains, color: "#003580" },
    ] : [];

    if (!hasHydrated) return null;
    if (!user || user.role !== "ADMIN") return null;

    return (
        <>
            {toast && (
                <div style={{
                    position: "fixed", bottom: 28, right: 28, zIndex: 9999,
                    background: toast.type === "success" ? "#00875a" : "#c0392b",
                    color: "#fff", padding: "0.85rem 1.4rem", borderRadius: 12,
                    fontWeight: 600, fontSize: "0.95rem", boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    display: "flex", alignItems: "center", gap: 10,
                    animation: "fadeInUp 0.25s ease",
                }}>
                    <span>{toast.type === "success" ? "✓" : "✕"}</span>
                    {toast.message}
                </div>
            )}
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
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
                .adm-nav-group-title {
                    padding: 0 1.25rem; font-size: 0.72rem; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.5px;
                    color: rgba(255,255,255,0.4); margin-bottom: 0.4rem; margin-top: 1.25rem;
                }
                .adm-nav-group:first-child .adm-nav-group-title { margin-top: 0; }
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
                .adm-import-btn {
                    background: #fff; color: #0052cc; border: 1.5px solid #0052cc; border-radius: 8px;
                    padding: 0.55rem 1rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;
                    display: flex; align-items: center; gap: 0.4rem; transition: background 0.15s;
                }
                .adm-import-btn:hover { background: #f0f4ff; }
                .adm-import-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .adm-template-btn {
                    background: #fff; color: #00875a; border: 1.5px solid #00875a; border-radius: 8px;
                    padding: 0.55rem 1rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;
                    display: flex; align-items: center; gap: 0.4rem; transition: background 0.15s;
                    text-decoration: none;
                }
                .adm-template-btn:hover { background: #e6f9f0; }

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

                .adm-search {
                    padding: 0.45rem 0.85rem; border: 1.5px solid #e8f0fe; border-radius: 8px;
                    font-size: 0.84rem; color: #1a3c6b; background: #f8faff; width: 220px;
                    outline: none; transition: border-color 0.15s;
                }
                .adm-search:focus { border-color: #0052cc; background: #fff; }
                .adm-table-actions { display: flex; align-items: center; gap: 0.65rem; }

                /* Hotel detail */
                .adm-back-btn {
                    display: inline-flex; align-items: center; gap: 0.4rem;
                    padding: 0.45rem 1rem; background: #f0f4ff; color: #0052cc;
                    border: 1.5px solid #c8d8ff; border-radius: 8px;
                    font-size: 0.85rem; font-weight: 600; cursor: pointer; margin-bottom: 1rem;
                    transition: background 0.15s;
                }
                .adm-back-btn:hover { background: #e0ebff; }
                .adm-hotel-info-card {
                    background: linear-gradient(135deg, #0a1f44, #003580);
                    border-radius: 14px; padding: 1.25rem 1.5rem;
                    margin-bottom: 1.25rem; color: #fff;
                    display: flex; align-items: flex-start; gap: 1rem;
                }
                .adm-hotel-info-icon { font-size: 2.5rem; flex-shrink: 0; }
                .adm-hotel-info-name { font-family: 'Nunito', sans-serif; font-size: 1.15rem; font-weight: 800; }
                .adm-hotel-info-meta { font-size: 0.82rem; opacity: 0.75; margin-top: 0.25rem; }
                .adm-detail-btn { background: #e8f0fe; color: #0052cc; }
                .adm-detail-btn:hover { background: #c8deff; }
                .adm-approve-btn { background: #d4edda; color: #00875a; }
                .adm-approve-btn:hover { background: #b7dfbb; }
                .adm-reject-btn { background: #fff0f0; color: #c0392b; }
                .adm-reject-btn:hover { background: #ffcdd2; }
            `}</style>

            {/* Sidebar */}
            <aside className={`adm-sidebar${sidebarOpen ? "" : " closed"}`}>
                <div className="adm-logo">
                    VIVU<span>.</span>
                    <span className="adm-logo-sub">Admin Panel</span>
                </div>
                <nav className="adm-nav">
                    {navGroups.map((group, gIdx) => (
                        <div key={gIdx} className="adm-nav-group" style={{ marginBottom: "0.5rem" }}>
                            <div className="adm-nav-group-title">{group.title}</div>
                            {group.items.map(item => (
                                <div
                                    key={item.key}
                                    className={`adm-nav-item${section === item.key ? " active" : ""}`}
                                    onClick={() => setSection(item.key as Section)}
                                >
                                    <span className="icon">{item.icon}</span>
                                    {item.label}
                                </div>
                            ))}
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
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontSize: "0.82rem", color: "#6b8cbf" }}>
                            {new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        </span>
                        <button
                            onClick={() => router.push("/")}
                            style={{
                                display: "flex", alignItems: "center", gap: "0.4rem",
                                padding: "0.4rem 1rem", borderRadius: 8, border: "none",
                                background: "linear-gradient(135deg,#0052cc,#0065ff)",
                                color: "#fff", fontWeight: 700, fontSize: "0.82rem",
                                cursor: "pointer", whiteSpace: "nowrap",
                                transition: "opacity 0.15s",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                        >
                            🛒 Trang mua hàng
                        </button>
                    </div>
                </div>

                {/* Hidden Excel input */}
                <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: "none" }}
                    onChange={handleExcelImport}
                />

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
                                    { key: "bookings", icon: "🗂️", label: "Quản lý đặt chỗ & Đổi/Hủy" },
                                    { key: "hotels", icon: "🏨", label: "Quản lý khách sạn" },
                                    { key: "flights", icon: "✈️", label: "Quản lý chuyến bay" },
                                    { key: "buses", icon: "🚌", label: "Quản lý xe khách" },
                                    { key: "trains", icon: "🚆", label: "Quản lý tàu hỏa" },
                                    { key: "users", icon: "👥", label: "Quản lý người dùng" },
                                    { key: "withdrawals", icon: "💸", label: "Quản lý rút tiền" },
                                    { key: "promotions", icon: "🎟️", label: "Mã giảm giá" },
                                    { key: "banners", icon: "🖼️", label: "Banner & Địa điểm" },
                                    { key: "reviews", icon: "⭐", label: "Quản lý đánh giá" },
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

                    {/* ── REVIEWS ── */}
                    {section === "reviews" && (
                        <div className="adm-table-card">
                            <div className="adm-table-header">
                                <div className="adm-table-title">⭐ Quản lý đánh giá</div>
                                <input
                                    className="adm-search"
                                    placeholder="🔍 Tìm theo người dùng, khách sạn..."
                                    value={reviewSearch}
                                    onChange={e => setReviewSearch(e.target.value)}
                                />
                            </div>
                            <div className="adm-table-wrap">
                                {reviewLoading ? <div className="adm-loading">Đang tải...</div> : (() => {
                                    const q = reviewSearch.toLowerCase();
                                    const filtered = reviewData.filter(r =>
                                        String(r.full_name || "").toLowerCase().includes(q) ||
                                        String(r.entity_name || "").toLowerCase().includes(q) ||
                                        String(r.comment || "").toLowerCase().includes(q)
                                    );
                                    if (filtered.length === 0) return <div className="adm-empty">Chưa có đánh giá nào</div>;
                                    return (
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Người dùng</th>
                                                    <th>Loại</th>
                                                    <th>Đối tượng</th>
                                                    <th style={{ textAlign: "center" }}>Sao</th>
                                                    <th>Nội dung</th>
                                                    <th>Ngày</th>
                                                    <th>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filtered.map((r, i) => {
                                                    const rating = Number(r.rating ?? 0);
                                                    const entityLabel: Record<string, string> = { hotel: "Khách sạn", DESTINATION: "Địa điểm" };
                                                    return (
                                                        <tr key={String(r.review_id ?? i)}>
                                                            <td style={{ color: "#6b8cbf" }}>#{String(r.review_id)}</td>
                                                            <td>
                                                                <div style={{ fontWeight: 600 }}>{String(r.full_name || "—")}</div>
                                                                <div style={{ fontSize: "0.75rem", color: "#6b8cbf" }}>{String(r.email || "")}</div>
                                                            </td>
                                                            <td>
                                                                <span style={{
                                                                    padding: "2px 8px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 600,
                                                                    background: r.entity_type === "hotel" ? "#e8f0fe" : "#f0f4ff",
                                                                    color: r.entity_type === "hotel" ? "#0052cc" : "#6b8cbf",
                                                                }}>
                                                                    {entityLabel[String(r.entity_type)] || String(r.entity_type)}
                                                                </span>
                                                            </td>
                                                            <td style={{ fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                {String(r.entity_name || `#${r.entity_id}`)}
                                                            </td>
                                                            <td style={{ textAlign: "center" }}>
                                                                <span style={{
                                                                    display: "inline-flex", alignItems: "center", gap: 3,
                                                                    fontWeight: 700, fontSize: "0.9rem",
                                                                    color: rating >= 4 ? "#00875a" : rating >= 3 ? "#b8860b" : "#c0392b",
                                                                }}>
                                                                    {"★".repeat(rating)}{"☆".repeat(5 - rating)}
                                                                    <span style={{ marginLeft: 3 }}>{rating}</span>
                                                                </span>
                                                            </td>
                                                            <td style={{ maxWidth: 220, fontSize: "0.85rem", color: "#3a5f9a" }}>
                                                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={String(r.comment || "")}>
                                                                    {String(r.comment || "—")}
                                                                </div>
                                                            </td>
                                                            <td style={{ fontSize: "0.78rem", color: "#6b8cbf", whiteSpace: "nowrap" }}>
                                                                {r.created_at ? new Date(String(r.created_at)).toLocaleDateString("vi-VN") : "—"}
                                                            </td>
                                                            <td>
                                                                <button className="adm-action-btn adm-del-btn" onClick={() => handleReviewDelete(Number(r.review_id))}>🗑 Xóa</button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* ── BOOKINGS ── */}
                    {section === "bookings" && (() => {
                        const modTypeLabel: Record<string, string> = { reschedule: "Đổi lịch", cancel: "Hủy" };
                        const modTypeColor: Record<string, string> = { reschedule: "#0052cc", cancel: "#c0392b" };
                        const modStatusLabel: Record<string, string> = { pending: "Chờ xử lý", approved: "Đã duyệt", rejected: "Đã từ chối" };
                        const modStatusColor: Record<string, string> = { pending: "#b8860b", approved: "#00875a", rejected: "#c0392b" };
                        const modStatusBg: Record<string, string> = { pending: "#fffbe6", approved: "#e6f9f0", rejected: "#fff0f0" };
                        const fmtN = (n: unknown) => n ? Number(n).toLocaleString("vi-VN") + "₫" : "—";

                        const filteredMod = modData.filter(row => {
                            const q = modSearch.toLowerCase();
                            if (!q) return true;
                            return String(row.user_name || "").toLowerCase().includes(q)
                                || String(row.user_email || "").toLowerCase().includes(q)
                                || String(row.entity_name || "").toLowerCase().includes(q)
                                || String(row.type || "").toLowerCase().includes(q);
                        });

                        return (
                            <div className="adm-table-card">
                                {/* Sub-tabs */}
                                <div style={{ display: "flex", gap: "0.25rem", padding: "0.75rem 1rem", borderBottom: "1px solid #e8f0fe", background: "#fafbff" }}>
                                    {([
                                        { key: "bookings", label: "🗂️ Danh sách đặt chỗ" },
                                        { key: "modifications", label: "🔄 Đổi/Hủy lịch" },
                                    ] as { key: "bookings" | "modifications"; label: string }[]).map(t => (
                                        <button
                                            key={t.key}
                                            onClick={() => setBookingTab(t.key)}
                                            style={{
                                                padding: "0.45rem 1rem", border: "none", borderRadius: 8, cursor: "pointer",
                                                fontWeight: 600, fontSize: "0.85rem",
                                                background: bookingTab === t.key ? "#0052cc" : "transparent",
                                                color: bookingTab === t.key ? "#fff" : "#6b8cbf",
                                                transition: "background 0.15s, color 0.15s",
                                            }}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>

                                {bookingTab === "bookings" && (
                                    <>
                                        <div className="adm-table-header">
                                            <div className="adm-table-title">🗂️ Danh sách đặt chỗ</div>
                                            <div className="adm-table-actions">
                                                <input className="adm-search" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => handleSearchChange(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="adm-table-wrap">
                                            {loading ? <div className="adm-loading">Đang tải...</div> : filteredData.length === 0 ? <div className="adm-empty">Không có dữ liệu</div> : (
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>#</th><th>Khách hàng</th><th>Dịch vụ</th>
                                                            <th>Tổng tiền</th><th>Ngày đặt</th><th>Trạng thái</th><th></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredData.map((row, i) => (
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
                                                                    <span
                                                                        className="adm-badge"
                                                                        style={{ background: `${statusColor[String(row.status)]}18`, color: statusColor[String(row.status)] || "#1a3c6b" }}
                                                                    >
                                                                        {statusLabel[String(row.status)] || String(row.status)}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <button
                                                                        className="adm-action-btn"
                                                                        style={{ background: "#e8f0fe", color: "#0052cc", border: "none" }}
                                                                        onClick={() => openBookingDetail(Number(row.booking_id))}
                                                                    >
                                                                        🔍 Chi tiết
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </>
                                )}

                                {bookingTab === "modifications" && (
                                    <>
                                        <div className="adm-table-header">
                                            <div className="adm-table-title">🔄 Yêu cầu Đổi/Hủy lịch</div>
                                            <div className="adm-table-actions">
                                                <input className="adm-search" placeholder="🔍 Tìm kiếm..." value={modSearch} onChange={e => setModSearch(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="adm-table-wrap">
                                            {modLoading ? <div className="adm-loading">Đang tải...</div> :
                                                filteredMod.length === 0 ? <div className="adm-empty">Không có yêu cầu nào</div> : (
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                <th>#</th>
                                                                <th>Loại</th>
                                                                <th>Khách hàng</th>
                                                                <th>Đặt chỗ</th>
                                                                <th>Giá cũ → Mới</th>
                                                                <th>Phí hủy / Hoàn</th>
                                                                <th>P.thức hoàn</th>
                                                                <th>Ngày gửi</th>
                                                                <th>Trạng thái</th>
                                                                <th>Người duyệt</th>
                                                                <th>Thao tác</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredMod.map((row, i) => (
                                                                <tr key={String(row.mod_id ?? i)}>
                                                                    <td style={{ color: "#6b8cbf" }}>#{String(row.mod_id)}</td>
                                                                    <td>
                                                                        <span className="adm-badge" style={{
                                                                            background: `${modTypeColor[String(row.type)] || "#6b8cbf"}18`,
                                                                            color: modTypeColor[String(row.type)] || "#6b8cbf",
                                                                        }}>
                                                                            {String(row.type) === "reschedule" ? "🔄" : "❌"} {modTypeLabel[String(row.type)] || String(row.type)}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <div style={{ fontWeight: 600 }}>{String(row.user_name || "—")}</div>
                                                                        <div style={{ fontSize: "0.75rem", color: "#6b8cbf" }}>{String(row.user_email || "")}</div>
                                                                    </td>
                                                                    <td>
                                                                        <div style={{ fontWeight: 600 }}>#{String(row.booking_id)}</div>
                                                                        <div style={{ fontSize: "0.75rem", color: "#6b8cbf" }}>{String(row.entity_name || "")}</div>
                                                                    </td>
                                                                    <td style={{ fontSize: "0.82rem" }}>
                                                                        {row.old_price ? (
                                                                            <>
                                                                                <div style={{ color: "#6b8cbf" }}>{fmtN(row.old_price)}</div>
                                                                                {row.new_price && <div style={{ color: "#0052cc", fontWeight: 700 }}>→ {fmtN(row.new_price)}</div>}
                                                                            </>
                                                                        ) : "—"}
                                                                    </td>
                                                                    <td style={{ fontSize: "0.82rem" }}>
                                                                        {!!row.cancel_fee && Number(row.cancel_fee) > 0 && (
                                                                            <div style={{ color: "#c0392b" }}>Phí: {fmtN(row.cancel_fee)}</div>
                                                                        )}
                                                                        {!!row.refund_amount && Number(row.refund_amount) > 0 && (
                                                                            <div style={{ color: "#00875a", fontWeight: 700 }}>Hoàn: {fmtN(row.refund_amount)}</div>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ fontSize: "0.82rem" }}>
                                                                        {String(row.refund_method) === "wallet" ? "💰 Ví" : "🏦 Ngân hàng"}
                                                                        {String(row.refund_method) === "bank" && !!row.bank_info && (
                                                                            <div style={{ fontSize: "0.75rem", color: "#6b8cbf", marginTop: 2 }}>{String(row.bank_info)}</div>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ color: "#6b8cbf", fontSize: "0.8rem" }}>
                                                                        {row.created_at ? new Date(String(row.created_at)).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                                                                    </td>
                                                                    <td>
                                                                        <span className="adm-badge" style={{
                                                                            background: modStatusBg[String(row.status)] || "#f0f4ff",
                                                                            color: modStatusColor[String(row.status)] || "#6b8cbf",
                                                                        }}>
                                                                            {modStatusLabel[String(row.status)] || String(row.status)}
                                                                        </span>
                                                                        {!!row.admin_note && (
                                                                            <div style={{ fontSize: "0.73rem", color: "#6b8cbf", marginTop: 2, maxWidth: 120 }}>{String(row.admin_note)}</div>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ fontSize: "0.82rem" }}>
                                                                        {row.approved_by_name ? (
                                                                            <>
                                                                                <div style={{ fontWeight: 600, color: "#1a3c6b" }}>👤 {String(row.approved_by_name)}</div>
                                                                                {row.approved_at && (
                                                                                    <div style={{ fontSize: "0.73rem", color: "#6b8cbf" }}>
                                                                                        {new Date(String(row.approved_at)).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        ) : (
                                                                            <span style={{ color: "#c8d8ff" }}>—</span>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        {String(row.status) === "pending" && (
                                                                            <>
                                                                                <button
                                                                                    className="adm-action-btn adm-approve-btn"
                                                                                    onClick={() => handleModificationAction(Number(row.mod_id), "approve")}
                                                                                >
                                                                                    ✅ Duyệt
                                                                                </button>
                                                                                <button
                                                                                    className="adm-action-btn adm-reject-btn"
                                                                                    onClick={() => handleModificationAction(Number(row.mod_id), "reject")}
                                                                                >
                                                                                    ✕ Từ chối
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })()}

                    {/* ── HOTELS ── */}
                    {section === "hotels" && !selectedHotel && (
                        <div className="adm-table-card">
                            <div className="adm-table-header">
                                <div className="adm-table-title">🏨 Danh sách khách sạn</div>
                                <div className="adm-table-actions">
                                    <input className="adm-search" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => handleSearchChange(e.target.value)} />
                                    <button className="adm-template-btn" onClick={downloadTemplate}>📄 File mẫu</button>
                                    <button className="adm-import-btn" disabled={importing} onClick={() => excelInputRef.current?.click()}>
                                        {importing ? "⏳ Đang nhập..." : "📥 Nhập Excel"}
                                    </button>
                                    <button className="adm-add-btn" onClick={openCreate}>＋ Thêm mới</button>
                                </div>
                            </div>
                            <div className="adm-table-wrap">
                                {loading ? <div className="adm-loading">Đang tải...</div> : filteredData.length === 0 ? <div className="adm-empty">Chưa có khách sạn nào</div> : (
                                    <table>
                                        <thead><tr><th>#</th><th>Tên</th><th>Thành phố</th><th>Địa chỉ</th><th style={{ textAlign: "center" }}>Phòng trống</th><th>Thao tác</th></tr></thead>
                                        <tbody>
                                            {filteredData.map((row, i) => {
                                                const avail = Number(row.available_rooms ?? 0);
                                                const total = Number(row.total_rooms ?? 0);
                                                return (
                                                <tr key={String(row.hotel_id ?? i)}>
                                                    <td style={{ color: "#6b8cbf" }}>#{String(row.hotel_id)}</td>
                                                    <td style={{ fontWeight: 600 }}>{String(row.name)}</td>
                                                    <td>{String(row.dest_city || row.city || "—")}</td>
                                                    <td style={{ color: "#6b8cbf", fontSize: "0.8rem", maxWidth: 180 }}>{String(row.address || "—")}</td>
                                                    <td style={{ textAlign: "center" }}>
                                                        <span style={{
                                                            display: "inline-block",
                                                            padding: "3px 10px",
                                                            borderRadius: 20,
                                                            fontWeight: 700,
                                                            fontSize: "0.85rem",
                                                            background: avail === 0 ? "#fff0f0" : avail < total * 0.3 ? "#fffbe6" : "#e6f9f0",
                                                            color: avail === 0 ? "#c0392b" : avail < total * 0.3 ? "#b8860b" : "#00875a",
                                                        }}>
                                                            {avail}/{total}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button className="adm-action-btn adm-detail-btn" onClick={() => openHotelDetail(row)}>🏠 Chi tiết</button>
                                                        <button className="adm-action-btn adm-edit-btn" onClick={() => openEdit(row)}>✏️ Sửa</button>
                                                        <button className="adm-action-btn adm-del-btn" onClick={() => handleDelete(row)}>🗑 Xóa</button>
                                                    </td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── HOTEL DETAIL (Room Types) ── */}
                    {section === "hotels" && selectedHotel && (
                        <>
                            <button className="adm-back-btn" onClick={() => setSelectedHotel(null)}>
                                ← Quay lại danh sách
                            </button>

                            {/* Hotel info banner */}
                            <div className="adm-hotel-info-card">
                                <div className="adm-hotel-info-icon">🏨</div>
                                <div>
                                    <div className="adm-hotel-info-name">{String(selectedHotel.name)}</div>
                                    <div className="adm-hotel-info-meta">
                                        📍 {String(selectedHotel.address || "—")}
                                        {selectedHotel.dest_city ? ` · ${String(selectedHotel.dest_city)}` : ""}
                                    </div>
                                    {!!selectedHotel.description && (
                                        <div className="adm-hotel-info-meta" style={{ marginTop: "0.35rem", opacity: 0.65 }}>
                                            {String(selectedHotel.description)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Room types table */}
                            <div className="adm-table-card">
                                <div className="adm-table-header">
                                    <div className="adm-table-title">🛏 Loại phòng</div>
                                    <button className="adm-add-btn" onClick={() => {
                                        setRoomFormValues({ max_guests: "2" });
                                        setRoomModal({ mode: "create" });
                                    }}>＋ Thêm loại phòng</button>
                                </div>
                                <div className="adm-table-wrap">
                                    {roomLoading ? <div className="adm-loading">Đang tải...</div> :
                                        roomData.length === 0 ? <div className="adm-empty">Chưa có loại phòng nào. Hãy thêm mới!</div> : (
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Ảnh</th>
                                                        <th>Tên loại phòng</th>
                                                        <th>Giá/đêm</th>
                                                        <th>Khách tối đa</th>
                                                        <th style={{ textAlign: "center" }}>Phòng trống</th>
                                                        <th>Thao tác</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {roomData.map((room, i) => {
                                                        const avail = Number(room.available_rooms ?? 0);
                                                        const total = Number(room.total_rooms ?? 0);
                                                        return (
                                                        <tr key={String(room.room_type_id ?? i)}>
                                                            <td style={{ color: "#6b8cbf" }}>#{String(room.room_type_id)}</td>
                                                            <td>
                                                                {room.image_url ? (
                                                                    <img
                                                                        src={String(room.image_url)}
                                                                        alt={String(room.name)}
                                                                        style={{ width: 72, height: 52, objectFit: "cover", borderRadius: 6, border: "1px solid #e8f0fe", display: "block" }}
                                                                    />
                                                                ) : (
                                                                    <div style={{ width: 72, height: 52, background: "#f0f4ff", borderRadius: 6, border: "1px solid #e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>🏨</div>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <div style={{ fontWeight: 600 }}>{String(room.name)}</div>
                                                            </td>
                                                            <td style={{ color: "#0052cc", fontWeight: 700 }}>{fmt(Number(room.price_per_night))}</td>
                                                            <td style={{ textAlign: "center" }}>👤 {String(room.max_guests || 2)}</td>
                                                            <td style={{ textAlign: "center" }}>
                                                                <span style={{
                                                                    display: "inline-block",
                                                                    padding: "3px 10px",
                                                                    borderRadius: 20,
                                                                    fontWeight: 700,
                                                                    fontSize: "0.85rem",
                                                                    background: avail === 0 ? "#fff0f0" : avail < total * 0.3 ? "#fffbe6" : "#e6f9f0",
                                                                    color: avail === 0 ? "#c0392b" : avail < total * 0.3 ? "#b8860b" : "#00875a",
                                                                }}>
                                                                    {avail}/{total}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <button
                                                                    className="adm-action-btn adm-edit-btn"
                                                                    onClick={() => {
                                                                        const vals: Record<string, string> = {};
                                                                        Object.entries(room).forEach(([k, v]) => { vals[k] = v != null ? String(v) : ""; });
                                                                        setRoomFormValues(vals);
                                                                        setRoomModal({ mode: "edit", row: room });
                                                                    }}
                                                                >✏️ Sửa</button>
                                                                <button className="adm-action-btn adm-del-btn" onClick={() => handleRoomDelete(room)}>🗑 Xóa</button>
                                                            </td>
                                                        </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── FLIGHTS ── */}
                    {section === "flights" && (
                        <div className="adm-table-card">
                            <div className="adm-table-header">
                                <div className="adm-table-title">✈️ Danh sách chuyến bay</div>
                                <div className="adm-table-actions">
                                    <input className="adm-search" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => handleSearchChange(e.target.value)} />
                                    <button className="adm-template-btn" onClick={downloadTemplate}>📄 File mẫu</button>
                                    <button className="adm-import-btn" disabled={importing} onClick={() => excelInputRef.current?.click()}>
                                        {importing ? "⏳ Đang nhập..." : "📥 Nhập Excel"}
                                    </button>
                                    <button className="adm-add-btn" onClick={openCreate}>＋ Thêm mới</button>
                                </div>
                            </div>
                            <div className="adm-table-wrap">
                                {loading ? <div className="adm-loading">Đang tải...</div> : filteredData.length === 0 ? <div className="adm-empty">Chưa có chuyến bay nào</div> : (
                                    <table>
                                        <thead><tr><th>#</th><th>Hãng bay</th><th>Tuyến</th><th>Khởi hành</th><th>Đến</th><th>Giá</th><th style={{ textAlign: "center" }}>Ghế trống</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                                        <tbody>
                                            {filteredData.map((row, i) => {
                                                const avail = Number(row.avail_total ?? row.available_seats ?? 0);
                                                const total = Number(row.total_seats ?? 0);
                                                const eco = Number(row.avail_economy ?? 0);
                                                const biz = Number(row.avail_business ?? 0);
                                                const first = Number(row.avail_first ?? 0);
                                                const status = String(row.status ?? "active");
                                                return (
                                                <tr key={String(row.flight_id ?? i)}>
                                                    <td style={{ color: "#6b8cbf" }}>#{String(row.flight_id)}</td>
                                                    <td style={{ fontWeight: 600 }}>{String(row.airline)}</td>
                                                    <td>{String(row.from_city)} → {String(row.to_city)}</td>
                                                    <td style={{ fontSize: "0.8rem" }}>{row.depart_time ? new Date(String(row.depart_time)).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                                                    <td style={{ fontSize: "0.8rem" }}>{row.arrive_time ? new Date(String(row.arrive_time)).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                                                    <td style={{ color: "#0052cc", fontWeight: 700 }}>{fmt(Number(row.price))}</td>
                                                    <td style={{ textAlign: "center" }}>
                                                        <span style={{
                                                            display: "inline-block",
                                                            padding: "3px 10px",
                                                            borderRadius: 20,
                                                            fontWeight: 700,
                                                            fontSize: "0.85rem",
                                                            background: avail === 0 ? "#fff0f0" : avail < total * 0.3 ? "#fffbe6" : "#e6f9f0",
                                                            color: avail === 0 ? "#c0392b" : avail < total * 0.3 ? "#b8860b" : "#00875a",
                                                            marginBottom: 3,
                                                        }}>
                                                            {avail}/{total}
                                                        </span>
                                                        {total > 0 && (
                                                            <div style={{ fontSize: "0.72rem", color: "#6b8cbf", lineHeight: 1.5 }}>
                                                                {eco > 0 && <span style={{ marginRight: 4 }}>🪑 Eco: {eco}</span>}
                                                                {biz > 0 && <span style={{ marginRight: 4 }}>💼 Biz: {biz}</span>}
                                                                {first > 0 && <span>👑 First: {first}</span>}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className="adm-badge" style={{
                                                            background: status === "active" ? "#e6f9f0" : status === "cancelled" ? "#fff0f0" : "#f0f4ff",
                                                            color: status === "active" ? "#00875a" : status === "cancelled" ? "#c0392b" : "#6b8cbf",
                                                        }}>
                                                            {status === "active" ? "Đang chạy" : status === "cancelled" ? "Đã hủy" : "Đã hoàn thành"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button className="adm-action-btn adm-edit-btn" onClick={() => openEdit(row)}>✏️ Sửa</button>
                                                        <button className="adm-action-btn adm-del-btn" onClick={() => handleDelete(row)}>🗑 Xóa</button>
                                                    </td>
                                                </tr>
                                                );
                                            })}
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
                                <div className="adm-table-actions">
                                    <input className="adm-search" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => handleSearchChange(e.target.value)} />
                                    <button className="adm-template-btn" onClick={downloadTemplate}>📄 File mẫu</button>
                                    <button className="adm-import-btn" disabled={importing} onClick={() => excelInputRef.current?.click()}>
                                        {importing ? "⏳ Đang nhập..." : "📥 Nhập Excel"}
                                    </button>
                                    <button className="adm-add-btn" onClick={openCreate}>＋ Thêm mới</button>
                                </div>
                            </div>
                            <div className="adm-table-wrap">
                                {loading ? <div className="adm-loading">Đang tải...</div> : filteredData.length === 0 ? <div className="adm-empty">Chưa có xe khách nào</div> : (
                                    <table>
                                        <thead><tr><th>#</th><th>Nhà xe</th><th>Tuyến</th><th>Khởi hành</th><th>Đến</th><th>Giá</th><th style={{ textAlign: "center" }}>Ghế trống</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                                        <tbody>
                                            {filteredData.map((row, i) => {
                                                const avail = Number(row.avail_total ?? row.available_seats ?? 0);
                                                const total = Number(row.total_seats ?? 0);
                                                const std = Number(row.avail_standard ?? 0);
                                                const vip = Number(row.avail_vip ?? 0);
                                                const sleeper = Number(row.avail_sleeper ?? 0);
                                                const status = String(row.status ?? "active");
                                                return (
                                                <tr key={String(row.bus_id ?? i)}>
                                                    <td style={{ color: "#6b8cbf" }}>#{String(row.bus_id)}</td>
                                                    <td style={{ fontWeight: 600 }}>{String(row.company)}</td>
                                                    <td>{String(row.from_city)} → {String(row.to_city)}</td>
                                                    <td style={{ fontSize: "0.8rem" }}>{row.depart_time ? new Date(String(row.depart_time)).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                                                    <td style={{ fontSize: "0.8rem" }}>{row.arrive_time ? new Date(String(row.arrive_time)).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                                                    <td style={{ color: "#0052cc", fontWeight: 700 }}>{fmt(Number(row.price))}</td>
                                                    <td style={{ textAlign: "center" }}>
                                                        <span style={{
                                                            display: "inline-block",
                                                            padding: "3px 10px",
                                                            borderRadius: 20,
                                                            fontWeight: 700,
                                                            fontSize: "0.85rem",
                                                            background: avail === 0 ? "#fff0f0" : avail < total * 0.3 ? "#fffbe6" : "#e6f9f0",
                                                            color: avail === 0 ? "#c0392b" : avail < total * 0.3 ? "#b8860b" : "#00875a",
                                                            marginBottom: 3,
                                                        }}>
                                                            {avail}/{total}
                                                        </span>
                                                        {total > 0 && (
                                                            <div style={{ fontSize: "0.72rem", color: "#6b8cbf", lineHeight: 1.5 }}>
                                                                {std > 0 && <span style={{ marginRight: 4 }}>🪑 Thường: {std}</span>}
                                                                {vip > 0 && <span style={{ marginRight: 4 }}>⭐ VIP: {vip}</span>}
                                                                {sleeper > 0 && <span>🛏 Nằm: {sleeper}</span>}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className="adm-badge" style={{
                                                            background: status === "active" ? "#e6f9f0" : status === "cancelled" ? "#fff0f0" : "#f0f4ff",
                                                            color: status === "active" ? "#00875a" : status === "cancelled" ? "#c0392b" : "#6b8cbf",
                                                        }}>
                                                            {status === "active" ? "Đang chạy" : status === "cancelled" ? "Đã hủy" : "Đã hoàn thành"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button className="adm-action-btn adm-edit-btn" onClick={() => openEdit(row)}>✏️ Sửa</button>
                                                        <button className="adm-action-btn adm-del-btn" onClick={() => handleDelete(row)}>🗑 Xóa</button>
                                                    </td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── TRAINS ── */}
                    {section === "trains" && (
                        <div className="adm-table-card">
                            <div className="adm-table-header">
                                <div className="adm-table-title">🚆 Danh sách chuyến tàu</div>
                                <div className="adm-table-actions">
                                    <input className="adm-search" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => handleSearchChange(e.target.value)} />
                                    <button className="adm-template-btn" onClick={downloadTemplate}>📄 File mẫu</button>
                                    <button className="adm-import-btn" disabled={importing} onClick={() => excelInputRef.current?.click()}>
                                        {importing ? "⏳ Đang nhập..." : "📥 Nhập Excel"}
                                    </button>
                                    <button className="adm-add-btn" onClick={openCreate}>＋ Thêm mới</button>
                                </div>
                            </div>
                            <div className="adm-table-wrap">
                                {loading ? <div className="adm-loading">Đang tải...</div> : filteredData.length === 0 ? <div className="adm-empty">Chưa có chuyến tàu nào</div> : (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>#</th><th>Mã tàu</th><th>Tuyến</th><th>Ga đi / Ga đến</th>
                                                <th>Khởi hành</th><th>Đến</th><th>Ghế trống</th><th>Trạng thái</th><th>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredData.map((row, i) => {
                                                const avail = Number(row.avail_total ?? row.available_seats ?? 0);
                                                const total = Number(row.total_seats ?? 0);
                                                const hardSeat = Number(row.avail_hard_seat ?? 0);
                                                const softSeat = Number(row.avail_soft_seat ?? 0);
                                                const hardSleeper = Number(row.avail_hard_sleeper ?? 0);
                                                const softSleeper = Number(row.avail_soft_sleeper ?? 0);
                                                return (
                                                <tr key={String(row.train_id ?? i)}>
                                                    <td style={{ color: "#6b8cbf" }}>#{String(row.train_id)}</td>
                                                    <td>
                                                        <span style={{ background: "#003580", color: "#fff", padding: "0.2rem 0.6rem", borderRadius: 99, fontSize: "0.8rem", fontWeight: 700 }}>
                                                            {String(row.train_code)}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>{String(row.from_city)} → {String(row.to_city)}</td>
                                                    <td style={{ fontSize: "0.78rem", color: "#6b8cbf" }}>
                                                        {String(row.from_station)} → {String(row.to_station)}
                                                    </td>
                                                    <td style={{ fontSize: "0.8rem" }}>{row.depart_time ? new Date(String(row.depart_time)).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                                                    <td style={{ fontSize: "0.8rem" }}>{row.arrive_time ? new Date(String(row.arrive_time)).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                                                    <td style={{ textAlign: "center" }}>
                                                        <span style={{
                                                            display: "inline-block",
                                                            padding: "3px 10px",
                                                            borderRadius: 20,
                                                            fontWeight: 700,
                                                            fontSize: "0.85rem",
                                                            background: avail === 0 ? "#fff0f0" : avail < total * 0.3 ? "#fffbe6" : "#e6f9f0",
                                                            color: avail === 0 ? "#c0392b" : avail < total * 0.3 ? "#b8860b" : "#00875a",
                                                            marginBottom: 3,
                                                        }}>
                                                            {avail}/{total}
                                                        </span>
                                                        {total > 0 && (
                                                            <div style={{ fontSize: "0.72rem", color: "#6b8cbf", lineHeight: 1.5 }}>
                                                                {hardSeat > 0 && <span style={{ marginRight: 4 }}>🪑 Cứng: {hardSeat}</span>}
                                                                {softSeat > 0 && <span style={{ marginRight: 4 }}>💺 Mềm: {softSeat}</span>}
                                                                {hardSleeper > 0 && <span style={{ marginRight: 4 }}>🛏 Nằm cứng: {hardSleeper}</span>}
                                                                {softSleeper > 0 && <span>🛌 Nằm mềm: {softSleeper}</span>}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className="adm-badge" style={{
                                                            background: row.status === "active" ? "#e6f9f0" : row.status === "cancelled" ? "#fff0f0" : "#f0f4ff",
                                                            color: row.status === "active" ? "#00875a" : row.status === "cancelled" ? "#c0392b" : "#6b8cbf",
                                                        }}>
                                                            {row.status === "active" ? "Đang chạy" : row.status === "cancelled" ? "Đã hủy" : row.status === "completed" ? "Đã hoàn thành" : "Không hoạt động"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button className="adm-action-btn adm-edit-btn" onClick={() => openEdit(row)}>✏️ Sửa</button>
                                                        <button className="adm-action-btn adm-del-btn" onClick={() => handleDelete(row)}>🗑 Xóa</button>
                                                    </td>
                                                </tr>
                                                );
                                            })}
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
                                <div className="adm-table-actions">
                                    <input className="adm-search" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => handleSearchChange(e.target.value)} />
                                    <button className="adm-add-btn" onClick={openCreate}>＋ Thêm mới</button>
                                </div>
                            </div>
                            <div className="adm-table-wrap">
                                {loading ? <div className="adm-loading">Đang tải...</div> : filteredData.length === 0 ? <div className="adm-empty">Không có người dùng</div> : (
                                    <table>
                                        <thead><tr><th>#</th><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Role</th><th>Đăng ký</th><th>Thao tác</th></tr></thead>
                                        <tbody>
                                            {filteredData.map((row, i) => (
                                                <tr key={String(row.user_id ?? i)}>
                                                    <td style={{ color: "#6b8cbf" }}>#{String(row.user_id)}</td>
                                                    <td style={{ fontWeight: 600 }}>{String(row.full_name || "—")}</td>
                                                    <td style={{ color: "#6b8cbf", fontSize: "0.82rem" }}>{String(row.email)}</td>
                                                    <td>{String(row.phone || "—")}</td>

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
                                                        <button className="adm-action-btn adm-edit-btn" onClick={() => openEdit(row)}>✏️ Sửa</button>
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

                    {/* ── PROMOTIONS ── */}
                    {section === "promotions" && (() => {
                        const promoStatusColor: Record<string, string> = { active: "#00875a", inactive: "#c0392b" };
                        const promoStatusBg: Record<string, string> = { active: "#e6f9f0", inactive: "#fff0f0" };
                        const promoStatusLabel: Record<string, string> = { active: "Đang hoạt động", inactive: "Tắt" };
                        const appliesToLabel: Record<string, string> = { all: "Tất cả", hotel: "Khách sạn", flight: "Chuyến bay", bus: "Xe khách" };
                        return (
                            <div className="adm-table-card">
                                <div className="adm-table-header">
                                    <div className="adm-table-title">🎟️ Mã giảm giá</div>
                                    <div className="adm-table-actions">
                                        <input className="adm-search" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => handleSearchChange(e.target.value)} />
                                        <button className="adm-import-btn" disabled={importing} onClick={() => excelInputRef.current?.click()}>
                                            {importing ? "⏳ Đang nhập..." : "📥 Nhập Excel"}
                                        </button>
                                        <button className="adm-add-btn" onClick={openCreate}>＋ Thêm mới</button>
                                    </div>
                                </div>
                                <div className="adm-table-wrap">
                                    {loading ? <div className="adm-loading">Đang tải...</div> :
                                        filteredData.length === 0 ? <div className="adm-empty">Chưa có mã giảm giá nào</div> : (
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Mã</th>
                                                        <th>Giảm giá</th>
                                                        <th>Tối thiểu</th>
                                                        <th>Áp dụng</th>
                                                        <th>Đã dùng</th>
                                                        <th>Hạn dùng</th>
                                                        <th>Trạng thái</th>
                                                        <th>Thao tác</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredData.map((row, i) => {
                                                        const isExpired = !!row.expired_at && new Date(String(row.expired_at)) < new Date();
                                                        return (
                                                            <tr key={String(row.promo_id ?? i)}>
                                                                <td style={{ color: "#6b8cbf" }}>#{String(row.promo_id)}</td>
                                                                <td>
                                                                    <div style={{ fontWeight: 800, fontFamily: "Nunito, sans-serif", fontSize: "0.95rem", color: "#0052cc", letterSpacing: 1 }}>
                                                                        {String(row.code)}
                                                                    </div>
                                                                    {!!row.description && (
                                                                        <div style={{ fontSize: "0.72rem", color: "#6b8cbf", marginTop: 2 }}>{String(row.description)}</div>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    {String(row.discount_type) === "percent" ? (
                                                                        <span style={{ fontWeight: 700, color: "#00875a" }}>
                                                                            -{Number(row.discount_percent)}%
                                                                            {Number(row.max_discount) > 0 && (
                                                                                <span style={{ fontWeight: 400, fontSize: "0.75rem", color: "#6b8cbf" }}> (tối đa {Number(row.max_discount).toLocaleString("vi-VN")}₫)</span>
                                                                            )}
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ fontWeight: 700, color: "#00875a" }}>-{Number(row.max_discount).toLocaleString("vi-VN")}₫</span>
                                                                    )}
                                                                </td>
                                                                <td style={{ color: "#6b8cbf", fontSize: "0.82rem" }}>
                                                                    {Number(row.min_order_value) > 0 ? Number(row.min_order_value).toLocaleString("vi-VN") + "₫" : "—"}
                                                                </td>
                                                                <td>
                                                                    <span className="adm-badge" style={{ background: "#f0f4ff", color: "#0052cc" }}>
                                                                        {appliesToLabel[String(row.applies_to)] || String(row.applies_to)}
                                                                    </span>
                                                                </td>
                                                                <td style={{ textAlign: "center", fontSize: "0.85rem" }}>
                                                                    <span style={{ color: Number(row.used_count) >= Number(row.usage_limit) ? "#c0392b" : "#1a3c6b", fontWeight: 600 }}>
                                                                        {String(row.used_count || 0)}/{String(row.usage_limit || "∞")}
                                                                    </span>
                                                                </td>
                                                                <td style={{ fontSize: "0.78rem", color: isExpired ? "#c0392b" : "#6b8cbf" }}>
                                                                    {row.expired_at ? new Date(String(row.expired_at)).toLocaleDateString("vi-VN") : "Không giới hạn"}
                                                                    {isExpired && <div style={{ fontWeight: 600 }}>⛔ Hết hạn</div>}
                                                                </td>
                                                                <td>
                                                                    <span className="adm-badge" style={{
                                                                        background: promoStatusBg[String(row.status)] || "#f0f4ff",
                                                                        color: promoStatusColor[String(row.status)] || "#6b8cbf",
                                                                    }}>
                                                                        {promoStatusLabel[String(row.status)] || String(row.status)}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <button
                                                                        className="adm-action-btn"
                                                                        style={{ background: String(row.status) === "active" ? "#fff8e1" : "#e6f9f0", color: String(row.status) === "active" ? "#b8860b" : "#00875a" }}
                                                                        onClick={() => handleTogglePromo(Number(row.promo_id))}
                                                                    >
                                                                        {String(row.status) === "active" ? "⏸ Tắt" : "▶ Bật"}
                                                                    </button>
                                                                    <button className="adm-action-btn adm-edit-btn" onClick={() => openEdit(row)}>✏️ Sửa</button>
                                                                    <button className="adm-action-btn adm-del-btn" onClick={() => handleDelete(row)}>🗑 Xóa</button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                </div>
                            </div>
                        );
                    })()}


                    {/* ── BANNERS ── */}
                    {section === "banners" && (
                        <div className="adm-table-card">
                            {/* Tab switcher */}
                            <div style={{ display: "flex", gap: 8, padding: "1rem 1.25rem 0", borderBottom: "2px solid #e8f0fe", marginBottom: "1rem" }}>
                                {([["banners", "🖼️ Banner"], ["destinations", "📍 Địa điểm du lịch"]] as const).map(([key, label]) => (
                                    <button key={key} onClick={() => setBannerTab(key)} style={{
                                        padding: "0.45rem 1.1rem", fontWeight: 700, fontSize: "0.88rem", border: "none", cursor: "pointer", borderRadius: "8px 8px 0 0",
                                        background: bannerTab === key ? "#0052cc" : "transparent",
                                        color: bannerTab === key ? "#fff" : "#6b8cbf",
                                        marginBottom: -2, borderBottom: bannerTab === key ? "2px solid #0052cc" : "2px solid transparent",
                                    }}>{label}</button>
                                ))}
                            </div>

                            {bannerTab === "destinations" ? (
                                // ── Destinations tab ──────────────────────────────
                                <>
                                    <div className="adm-table-header">
                                        <div className="adm-table-title">📍 Địa điểm du lịch</div>
                                        <div className="adm-table-actions">
                                            <input className="adm-search" placeholder="🔍 Tìm thành phố, tên địa điểm..." value={destSearch} onChange={e => setDestSearch(e.target.value)} />
                                            <button className="adm-add-btn" onClick={() => { setDestFormValues({}); setDestModal({ mode: "create" }); }}>＋ Thêm địa điểm</button>
                                        </div>
                                    </div>
                                    <div className="adm-table-wrap">
                                        {destLoading ? <div className="adm-loading">Đang tải...</div> :
                                            destData.length === 0 ? <div className="adm-empty">Chưa có địa điểm nào.</div> : (() => {
                                                const q = destSearch.trim().toLowerCase();
                                                const filtered = q === "" ? destData : destData.filter(r =>
                                                    String(r.city || "").toLowerCase().includes(q) ||
                                                    String(r.name || "").toLowerCase().includes(q) ||
                                                    String(r.description || "").toLowerCase().includes(q)
                                                );
                                                return filtered.length === 0 ? <div className="adm-empty">Không tìm thấy địa điểm nào.</div> : (
                                                    <table>
                                                        <thead><tr><th>#</th><th>Ảnh</th><th>Thành phố</th><th>Tên địa điểm</th><th>Mô tả</th><th>Thao tác</th></tr></thead>
                                                        <tbody>
                                                            {filtered.map((row, i) => (
                                                                <tr key={String(row.destination_id ?? i)}>
                                                                    <td style={{ color: "#6b8cbf" }}>#{String(row.destination_id)}</td>
                                                                    <td>
                                                                        {row.image_url ? (
                                                                            // eslint-disable-next-line @next/next/no-img-element
                                                                            <img src={String(row.image_url)} alt="" style={{ width: 72, height: 52, objectFit: "cover", borderRadius: 6, border: "1px solid #e8f0fe" }} />
                                                                        ) : (
                                                                            <div style={{ width: 72, height: 52, background: "#f0f4ff", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>📍</div>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ fontWeight: 700, color: "#0052cc" }}>{String(row.city)}</td>
                                                                    <td style={{ fontWeight: 600 }}>{String(row.name)}</td>
                                                                    <td style={{ fontSize: "0.8rem", color: "#6b8cbf", maxWidth: 200 }}>{row.description ? String(row.description).slice(0, 80) + (String(row.description).length > 80 ? "…" : "") : "—"}</td>
                                                                    <td>
                                                                        <button className="adm-action-btn adm-edit-btn" onClick={() => {
                                                                            const vals: Record<string, string> = {};
                                                                            Object.entries(row).forEach(([k, v]) => { vals[k] = v != null ? String(v) : ""; });
                                                                            setDestFormValues(vals);
                                                                            setDestModal({ mode: "edit", row });
                                                                        }}>✏️ Sửa</button>
                                                                        <button className="adm-action-btn adm-del-btn" onClick={() => handleDestDelete(row)}>🗑 Xóa</button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                );
                                            })()}
                                    </div>
                                </>
                            ) : (
                                // ── Banners tab ───────────────────────────────────
                                <>
                                    <div className="adm-table-header">
                                        <div className="adm-table-title">🖼️ Quản lý Banner</div>
                                        <div className="adm-table-actions">
                                            <input className="adm-search" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => handleSearchChange(e.target.value)} />
                                            <button className="adm-add-btn" onClick={openCreate}>＋ Thêm banner</button>
                                        </div>
                                    </div>
                                    <div className="adm-table-wrap">
                                        {loading ? <div className="adm-loading">Đang tải...</div> :
                                            filteredData.length === 0 ? <div className="adm-empty">Chưa có banner nào. Hãy thêm mới!</div> : (
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Ảnh preview</th>
                                                            <th>Tiêu đề</th>
                                                            <th>Vị trí</th>
                                                            <th>Liên kết</th>
                                                            <th>Thứ tự</th>
                                                            <th>Thời gian hiển thị</th>
                                                            <th>Trạng thái</th>
                                                            <th>Thao tác</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredData.map((row, i) => {
                                                            const isActive = Number(row.is_active) === 1;
                                                            const now = new Date();
                                                            const start = row.start_date ? new Date(String(row.start_date)) : null;
                                                            const end = row.end_date ? new Date(String(row.end_date)) : null;
                                                            const outOfRange = (start && start > now) || (end && end < now);
                                                            return (
                                                                <tr key={String(row.banner_id ?? i)}>
                                                                    <td style={{ color: "#6b8cbf" }}>#{String(row.banner_id)}</td>
                                                                    <td>
                                                                        {row.image_url ? (
                                                                            // eslint-disable-next-line @next/next/no-img-element
                                                                            <img
                                                                                src={String(row.image_url)}
                                                                                alt="banner"
                                                                                style={{ width: 110, height: 55, objectFit: "cover", borderRadius: 8, border: "1px solid #e8f0fe" }}
                                                                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                                                            />
                                                                        ) : (
                                                                            <div style={{ width: 110, height: 55, background: "#f0f4ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b8cbf", fontSize: "0.75rem" }}>
                                                                                Không có ảnh
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <div style={{ fontWeight: 600, maxWidth: 200 }}>{String(row.title)}</div>
                                                                        {!!row.subtitle && <div style={{ fontSize: "0.75rem", color: "#6b8cbf", marginTop: 2 }}>{String(row.subtitle)}</div>}
                                                                    </td>
                                                                    <td>
                                                                        <span style={{
                                                                            display: "inline-block",
                                                                            padding: "0.2rem 0.6rem",
                                                                            borderRadius: 99,
                                                                            fontSize: "0.75rem",
                                                                            fontWeight: 600,
                                                                            background: row.page_display === "promotion" ? "#fff0e6" : "#e8f0fe",
                                                                            color: row.page_display === "promotion" ? "#c05000" : "#0052cc",
                                                                        }}>
                                                                            {row.page_display === "promotion" ? "🎟️ Khuyến mãi" : "🏠 Trang chủ"}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ maxWidth: 160 }}>
                                                                        {row.link_url ? (
                                                                            <span style={{ fontSize: "0.78rem", color: "#0052cc", wordBreak: "break-all" }}>{String(row.link_url)}</span>
                                                                        ) : <span style={{ color: "#c8d8ff" }}>—</span>}
                                                                    </td>
                                                                    <td style={{ textAlign: "center", fontWeight: 700, color: "#0052cc" }}>
                                                                        {String(row.display_order ?? 0)}
                                                                    </td>
                                                                    <td style={{ fontSize: "0.78rem" }}>
                                                                        {start || end ? (
                                                                            <div style={{ color: outOfRange ? "#c0392b" : "#00875a" }}>
                                                                                {start ? <div>Từ: {start.toLocaleDateString("vi-VN")}</div> : <div>Từ: —</div>}
                                                                                {end ? <div>Đến: {end.toLocaleDateString("vi-VN")}</div> : <div>Đến: —</div>}
                                                                                {outOfRange && <div style={{ fontWeight: 700 }}>⛔ Ngoài thời hạn</div>}
                                                                            </div>
                                                                        ) : (
                                                                            <span style={{ color: "#6b8cbf" }}>Không giới hạn</span>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <span className="adm-badge" style={{
                                                                            background: isActive ? "#e6f9f0" : "#fff0f0",
                                                                            color: isActive ? "#00875a" : "#c0392b",
                                                                        }}>
                                                                            {isActive ? "🟢 Hiển thị" : "⭕ Ẩn"}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <button
                                                                            className="adm-action-btn"
                                                                            style={{ background: isActive ? "#fff8e1" : "#e6f9f0", color: isActive ? "#b8860b" : "#00875a" }}
                                                                            onClick={() => handleToggleBanner(Number(row.banner_id))}
                                                                        >
                                                                            {isActive ? "⏸ Ẩn" : "▶ Hiện"}
                                                                        </button>
                                                                        <button className="adm-action-btn adm-edit-btn" onClick={() => openEdit(row)}>✏️ Sửa</button>
                                                                        <button className="adm-action-btn adm-del-btn" onClick={() => handleDelete(row)}>🗑 Xóa</button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── WALLETS ── */}
                    {section === "wallets" && <WalletSection />}

                    {/* ── MODIFICATIONS ── */}

                    {/* Infinite scroll sentinel */}
                    <div ref={sentinelRef} style={{ height: 1, marginTop: 8 }} />
                    {loadingMore && (
                        <div style={{ textAlign: "center", padding: "1rem 0 0.5rem", color: "#6b8cbf", fontSize: "0.85rem" }}>
                            Đang tải thêm...
                        </div>
                    )}
                </div>
            </main>

            {/* Room Type Modal */}
            {roomModal && (
                <Modal
                    title={roomModal.mode === "create" ? "Thêm loại phòng" : "Chỉnh sửa loại phòng"}
                    fields={roomFieldDefs}
                    values={roomFormValues}
                    onChange={(k, v) => setRoomFormValues(prev => ({ ...prev, [k]: v }))}
                    onSave={handleRoomSave}
                    onClose={() => setRoomModal(null)}
                    saving={roomSaving}
                />
            )}

            {/* Destination Modal */}
            {destModal && (
                <Modal
                    title={destModal.mode === "create" ? "Thêm địa điểm" : "Chỉnh sửa địa điểm"}
                    fields={destFieldDefs}
                    values={destFormValues}
                    onChange={(k, v) => setDestFormValues(prev => ({ ...prev, [k]: v }))}
                    onSave={handleDestSave}
                    onClose={() => setDestModal(null)}
                    saving={destSaving}
                />
            )}

            {/* Modal */}
            {modal && (fieldDefs[section] || section === "users" || section === "promotions" || section === "banners") && (
                <Modal
                    title={modal.mode === "create" ? `Thêm ${navItems.find(n => n.key === section)?.label}` : `Chỉnh sửa ${navItems.find(n => n.key === section)?.label}`}
                    fields={section === "users" ? userFieldDefs : section === "promotions" ? promotionFieldDefs : section === "banners" ? bannerFieldDefs : fieldDefs[section]}
                    values={formValues}
                    onChange={(k, v) => setFormValues(prev => ({ ...prev, [k]: v }))}
                    onSave={handleSave}
                    onClose={() => setModal(null)}
                    saving={saving}
                />
            )}

            {/* ── Booking detail modal ── */}
            {(bookingDetail !== null || bookingDetailLoading) && (() => {
                const fmtN = (n: unknown) => n ? Number(n).toLocaleString("vi-VN") + "₫" : "—";
                const fmtDT = (s: unknown) => s ? new Date(String(s)).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";
                const modTypeLabel: Record<string, string> = { reschedule: "🔄 Đổi lịch", cancel: "❌ Hủy" };
                const modTypeColor: Record<string, string> = { reschedule: "#0052cc", cancel: "#c0392b" };
                const modStatusLabel: Record<string, string> = { pending: "Chờ xử lý", approved: "Đã duyệt", rejected: "Đã từ chối" };
                const modStatusColor: Record<string, string> = { pending: "#b8860b", approved: "#00875a", rejected: "#c0392b" };
                const modifications = (bookingDetail?.modifications as Record<string, unknown>[]) ?? [];
                const payments = (bookingDetail?.payments as Record<string, unknown>[]) ?? [];
                const item = ((bookingDetail?.items as Record<string, unknown>[]) ?? [])[0];
                const METHOD_LABEL: Record<string, string> = { wallet: "Ví VIVU", qr_transfer: "Chuyển khoản QR", combined: "Kết hợp Ví + QR" };

                return (
                    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
                        onClick={() => setBookingDetail(null)}>
                        <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
                            onClick={e => e.stopPropagation()}>
                            <div style={{ padding: "1.5rem 1.5rem 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#1a3c6b" }}>
                                    🔍 Chi tiết đặt chỗ #{String(bookingDetail?.booking_id ?? "...")}
                                </h2>
                                <button onClick={() => setBookingDetail(null)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "#6b8cbf" }}>×</button>
                            </div>

                            <div style={{ padding: "1.25rem 1.5rem 1.5rem" }}>
                                {bookingDetailLoading ? (
                                    <div style={{ textAlign: "center", padding: "2rem", color: "#6b8cbf" }}>Đang tải...</div>
                                ) : (
                                    <>
                                        {/* Basic info */}
                                        <div style={{ background: "#f8faff", borderRadius: 10, padding: "0.85rem 1rem", marginBottom: "1rem", fontSize: "0.88rem" }}>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem 1rem" }}>
                                                <div><span style={{ color: "#6b8cbf" }}>Khách hàng: </span><strong>{String(bookingDetail?.user_name ?? "—")}</strong></div>
                                                <div><span style={{ color: "#6b8cbf" }}>Email: </span>{String(bookingDetail?.user_email ?? "—")}</div>
                                                <div><span style={{ color: "#6b8cbf" }}>Dịch vụ: </span>{String(item?.entity_name ?? "—")}</div>
                                                <div><span style={{ color: "#6b8cbf" }}>Trạng thái: </span>
                                                    <span style={{ fontWeight: 700, color: statusColor[String(bookingDetail?.status)] || "#1a3c6b" }}>
                                                        {statusLabel[String(bookingDetail?.status)] || String(bookingDetail?.status)}
                                                    </span>
                                                </div>
                                                {item?.check_in_date && <div><span style={{ color: "#6b8cbf" }}>Nhận phòng: </span>{String(item.check_in_date).slice(0, 10)}</div>}
                                                {item?.check_out_date && <div><span style={{ color: "#6b8cbf" }}>Trả phòng: </span>{String(item.check_out_date).slice(0, 10)}</div>}
                                                <div><span style={{ color: "#6b8cbf" }}>Tổng tiền: </span><strong style={{ color: "#0052cc" }}>{fmtN(bookingDetail?.final_amount)}</strong></div>
                                                <div><span style={{ color: "#6b8cbf" }}>Ngày đặt: </span>{fmtDT(bookingDetail?.booking_date)}</div>
                                            </div>
                                        </div>

                                        {/* Payment history */}
                                        {payments.length > 0 && (
                                            <div style={{ marginBottom: "1rem" }}>
                                                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#6b8cbf", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "0.5rem" }}>
                                                    💳 Lịch sử thanh toán
                                                </div>
                                                {payments.map((p, i) => (
                                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", background: "#f0fff8", borderRadius: 8, padding: "0.5rem 0.75rem", marginBottom: "0.3rem", fontSize: "0.83rem" }}>
                                                        <span style={{ color: "#00875a", fontWeight: 600 }}>{METHOD_LABEL[String(p.method)] ?? String(p.method)}</span>
                                                        <span style={{ fontWeight: 700 }}>{fmtN(p.amount)}</span>
                                                        <span style={{ color: "#6b8cbf" }}>{fmtDT(p.paid_at)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Modification history */}
                                        <div>
                                            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#6b8cbf", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "0.5rem" }}>
                                                📋 Lịch sử đổi / hủy ({modifications.length} lần)
                                            </div>
                                            {modifications.length === 0 ? (
                                                <div style={{ color: "#6b8cbf", fontSize: "0.85rem", padding: "0.75rem 0" }}>Chưa có thay đổi nào.</div>
                                            ) : (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                                    {modifications.map((m, i) => {
                                                        const extraCharge = Number(m.reschedule_fee ?? 0) + Math.max(0, Number(m.price_diff ?? 0));
                                                        const refund = Number(m.refund_amount ?? 0);
                                                        const cancelFee = Number(m.cancel_fee ?? 0);
                                                        return (
                                                            <div key={i} style={{ background: "#f8f9ff", border: `1px solid ${modTypeColor[String(m.type)] ?? "#e8f0fe"}22`, borderLeft: `3px solid ${modTypeColor[String(m.type)] ?? "#6b8cbf"}`, borderRadius: "0 8px 8px 0", padding: "0.65rem 0.85rem", fontSize: "0.83rem" }}>
                                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                                                                    <span style={{ fontWeight: 700, color: modTypeColor[String(m.type)] ?? "#6b8cbf" }}>
                                                                        {modTypeLabel[String(m.type)] ?? String(m.type)} #{i + 1}
                                                                    </span>
                                                                    <span style={{ fontSize: "0.75rem", color: "#6b8cbf" }}>{fmtDT(m.created_at)}</span>
                                                                </div>
                                                                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                                                                    {m.old_price && m.new_price && (
                                                                        <span style={{ color: "#6b8cbf" }}>{fmtN(m.old_price)} → <strong style={{ color: "#1a3c6b" }}>{fmtN(m.new_price)}</strong></span>
                                                                    )}
                                                                    {extraCharge > 0 && <span style={{ color: "#c0392b" }}>Phát sinh: +{fmtN(extraCharge)}</span>}
                                                                    {cancelFee > 0 && <span style={{ color: "#c0392b" }}>Phí hủy: {fmtN(cancelFee)}</span>}
                                                                    {refund > 0 && <span style={{ color: "#00875a", fontWeight: 700 }}>Hoàn: {fmtN(refund)} ({String(m.refund_method) === "bank" ? "Ngân hàng" : "Ví"})</span>}
                                                                    <span style={{ padding: "0.1rem 0.5rem", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700, background: `${modStatusColor[String(m.status)]}18`, color: modStatusColor[String(m.status)] ?? "#6b8cbf" }}>
                                                                        {modStatusLabel[String(m.status)] ?? String(m.status)}
                                                                    </span>
                                                                </div>
                                                                {m.new_check_in && (
                                                                    <div style={{ marginTop: "0.2rem", color: "#0052cc", fontSize: "0.8rem" }}>
                                                                        Ngày mới: {String(m.new_check_in).slice(0, 10)} → {String(m.new_check_out ?? "").slice(0, 10)}
                                                                    </div>
                                                                )}
                                                                {m.admin_note && <div style={{ marginTop: "0.2rem", color: "#6b8cbf", fontStyle: "italic" }}>{String(m.admin_note)}</div>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
}
