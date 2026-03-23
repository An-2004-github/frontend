"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";

interface WalletTransaction {
    transaction_id: number;
    amount: number;
    type: "deposit" | "payment" | "refund";
    description: string;
    status: string;
    created_at: string;
}

const TYPE_MAP: Record<string, { label: string; color: string; bg: string; icon: string; sign: string }> = {
    deposit: { label: "Nạp tiền",    color: "#00875a", bg: "#d4edda18", icon: "💳", sign: "+" },
    payment: { label: "Thanh toán",  color: "#c0392b", bg: "#fff0f018", icon: "🛒", sign: "-" },
    refund:  { label: "Hoàn tiền",   color: "#0052cc", bg: "#e8f0fe18", icon: "↩️", sign: "+" },
};

export default function TransactionsPage() {
    const [txs, setTxs] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "deposit" | "payment" | "refund">("all");

    useEffect(() => {
        api.get("/api/wallet/transactions")
            .then(res => setTxs(res.data))
            .catch(() => setTxs([]))
            .finally(() => setLoading(false));
    }, []);

    const filtered = filter === "all" ? txs : txs.filter(t => t.type === filter);

    const totalDeposit = txs.filter(t => t.type === "deposit").reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalPayment = txs.filter(t => t.type === "payment").reduce((s, t) => s + Math.abs(t.amount), 0);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
                .tx-title { font-family:'Nunito',sans-serif; font-size:1.2rem; font-weight:800; color:#1a3c6b; margin-bottom:1.25rem; }
                .tx-summary { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1.25rem; }
                .tx-sum-card { background:#fff; border-radius:12px; border:1px solid #e8f0fe; padding:1rem 1.25rem; }
                .tx-sum-label { font-size:0.75rem; color:#6b8cbf; font-weight:500; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:0.4rem; }
                .tx-sum-value { font-family:'Nunito',sans-serif; font-size:1.15rem; font-weight:800; }

                .tx-filters { display:flex; gap:0.4rem; margin-bottom:1rem; flex-wrap:wrap; }
                .tx-filter-btn { padding:0.35rem 0.9rem; border-radius:99px; border:1.5px solid #e8f0fe; background:#fff; color:#6b8cbf; font-size:0.8rem; font-weight:600; cursor:pointer; transition:all 0.15s; }
                .tx-filter-btn.active { background:#0052cc; color:#fff; border-color:#0052cc; }
                .tx-filter-btn:hover:not(.active) { border-color:#0052cc; color:#0052cc; }

                .tx-card { background:#fff; border-radius:14px; border:1px solid #e8f0fe; overflow:hidden; }
                .tx-row { display:flex; align-items:center; gap:1rem; padding:1rem 1.25rem; border-bottom:1px solid #f0f4ff; transition:background 0.15s; }
                .tx-row:last-child { border-bottom:none; }
                .tx-row:hover { background:#fafbff; }
                .tx-icon { width:42px; height:42px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:1.15rem; flex-shrink:0; }
                .tx-info { flex:1; min-width:0; }
                .tx-desc { font-size:0.88rem; font-weight:500; color:#1a3c6b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                .tx-meta { display:flex; align-items:center; gap:0.5rem; margin-top:0.2rem; }
                .tx-date { font-size:0.73rem; color:#6b8cbf; }
                .tx-badge { font-size:0.65rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:99px; }
                .tx-amount { font-family:'Nunito',sans-serif; font-size:1rem; font-weight:700; flex-shrink:0; }

                .tx-empty { text-align:center; padding:3rem; background:#fff; border-radius:14px; border:1px solid #e8f0fe; color:#6b8cbf; }
                .tx-spinner { width:32px; height:32px; margin:3rem auto; border:3px solid #e8f0fe; border-top-color:#0052cc; border-radius:50%; animation:spin 0.8s linear infinite; }
                @keyframes spin { to { transform:rotate(360deg); } }
            `}</style>

            <div className="tx-title">📋 Lịch sử giao dịch</div>

            {/* Tóm tắt */}
            <div className="tx-summary">
                <div className="tx-sum-card">
                    <div className="tx-sum-label">Tổng nạp</div>
                    <div className="tx-sum-value" style={{ color: "#00875a" }}>
                        +{totalDeposit.toLocaleString("vi-VN")}₫
                    </div>
                </div>
                <div className="tx-sum-card">
                    <div className="tx-sum-label">Tổng chi</div>
                    <div className="tx-sum-value" style={{ color: "#c0392b" }}>
                        -{totalPayment.toLocaleString("vi-VN")}₫
                    </div>
                </div>
            </div>

            {/* Bộ lọc */}
            <div className="tx-filters">
                {([["all", "Tất cả"], ["deposit", "💳 Nạp tiền"], ["payment", "🛒 Thanh toán"], ["refund", "↩️ Hoàn tiền"]] as const).map(([key, label]) => (
                    <button
                        key={key}
                        className={`tx-filter-btn${filter === key ? " active" : ""}`}
                        onClick={() => setFilter(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Danh sách */}
            {loading ? (
                <div className="tx-spinner" />
            ) : filtered.length === 0 ? (
                <div className="tx-empty">
                    <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
                    <p style={{ fontWeight: 600, color: "#1a3c6b" }}>Chưa có giao dịch nào</p>
                </div>
            ) : (
                <div className="tx-card">
                    {filtered.map(tx => {
                        const t = TYPE_MAP[tx.type] ?? { label: tx.type, color: "#6b8cbf", bg: "#f0f4ff18", icon: "📋", sign: "" };
                        return (
                            <div key={tx.transaction_id} className="tx-row">
                                <div className="tx-icon" style={{ background: t.bg }}>
                                    {t.icon}
                                </div>
                                <div className="tx-info">
                                    <div className="tx-desc">{tx.description || t.label}</div>
                                    <div className="tx-meta">
                                        <span className="tx-date">
                                            {tx.created_at ? new Date(tx.created_at).toLocaleString("vi-VN") : "—"}
                                        </span>
                                        <span className="tx-badge" style={{ background: `${t.color}18`, color: t.color }}>
                                            {t.label}
                                        </span>
                                    </div>
                                </div>
                                <div className="tx-amount" style={{ color: t.color }}>
                                    {t.sign}{Math.abs(Number(tx.amount)).toLocaleString("vi-VN")}₫
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
