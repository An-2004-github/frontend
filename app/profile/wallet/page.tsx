"use client";

import { useState } from "react";
import WalletDeposit from "@/components/wallet/WalletDeposit";

const TABS = [
    { key: "deposit", label: "💳 Nạp tiền" },
    { key: "transactions", label: "📋 Lịch sử" },
];

export default function WalletPage() {
    const [activeTab, setActiveTab] = useState("deposit");

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

                .wp-root { min-height: 100vh; background: #f0f4ff; font-family: 'DM Sans', sans-serif; }

                .wp-hero {
                    background: linear-gradient(135deg, #003580 0%, #0052cc 55%, #0065ff 100%);
                    padding: 2.5rem 1.5rem 4rem; text-align: center;
                    position: relative; overflow: hidden;
                }
                .wp-hero-bg {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
                    background-size: 24px 24px;
                }
                .wp-hero h1 {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1.75rem; font-weight: 800; color: #fff;
                    margin: 0 0 0.4rem; position: relative;
                }
                .wp-hero p { color: rgba(255,255,255,0.7); font-size: 0.9rem; position: relative; }

                .wp-content {
                    max-width: 600px; margin: -2rem auto 0;
                    padding: 0 1.5rem 4rem; position: relative; z-index: 5;
                }

                /* Tabs */
                .wp-tabs {
                    display: flex; background: #fff;
                    border-radius: 12px; padding: 4px;
                    border: 1px solid #e8f0fe;
                    box-shadow: 0 2px 12px rgba(0,82,204,0.07);
                    margin-bottom: 1.25rem;
                }
                .wp-tab {
                    flex: 1; padding: 0.65rem;
                    border: none; border-radius: 9px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.9rem; font-weight: 500; color: #6b8cbf;
                    background: transparent; cursor: pointer;
                    transition: background 0.18s, color 0.18s;
                }
                .wp-tab.active { background: #0052cc; color: #fff; font-weight: 600; }
                .wp-tab:hover:not(.active) { background: #f0f4ff; color: #0052cc; }
            `}</style>

            <div className="wp-root">
                <div className="wp-hero">
                    <div className="wp-hero-bg" />
                    <h1>💰 Ví của tôi</h1>
                    <p>Nạp tiền và quản lý giao dịch</p>
                </div>

                <div className="wp-content">
                    {/* Tabs */}
                    <div className="wp-tabs">
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                className={`wp-tab${activeTab === tab.key ? " active" : ""}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    {activeTab === "deposit" && <WalletDeposit />}
                    {activeTab === "transactions" && <TransactionHistory />}
                </div>
            </div>
        </>
    );
}

// ── Lịch sử giao dịch ──────────────────────────────────────────
import { useEffect, useState as useStateT } from "react";
import api from "@/lib/axios";

interface WalletTransaction {
    transaction_id: number;
    user_id: number;
    amount: number;
    type: "deposit" | "payment" | "refund";
    description: string;
    status: string;
    created_at: string;
}

function TransactionHistory() {
    const [txs, setTxs] = useStateT<WalletTransaction[]>([]);
    const [loading, setLoading] = useStateT(true);

    useEffect(() => {
        api.get("/api/wallet/transactions")
            .then(res => setTxs(res.data))
            .finally(() => setLoading(false));
    }, []);

    const TYPE_LABEL: Record<string, { label: string; color: string; sign: string }> = {
        deposit: { label: "Nạp tiền", color: "#00875a", sign: "+" },
        payment: { label: "Thanh toán", color: "#c0392b", sign: "-" },
        refund: { label: "Hoàn tiền", color: "#0052cc", sign: "+" },
    };

    return (
        <>
            <style>{`
                .th-card {
                    background: #fff; border-radius: 14px;
                    border: 1px solid #e8f0fe; overflow: hidden;
                }
                .th-row {
                    display: flex; align-items: center; gap: 1rem;
                    padding: 1rem 1.25rem;
                    border-bottom: 1px solid #f0f4ff;
                    transition: background 0.15s;
                }
                .th-row:last-child { border-bottom: none; }
                .th-row:hover { background: #fafbff; }
                .th-icon {
                    width: 40px; height: 40px; border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.1rem; flex-shrink: 0;
                }
                .th-info { flex: 1; min-width: 0; }
                .th-desc { font-size: 0.88rem; font-weight: 500; color: #1a3c6b; }
                .th-date { font-size: 0.75rem; color: #6b8cbf; margin-top: 0.15rem; }
                .th-amount {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1rem; font-weight: 700; flex-shrink: 0;
                }
                .th-empty {
                    text-align: center; padding: 3rem; color: #6b8cbf;
                    background: #fff; border-radius: 14px; border: 1px solid #e8f0fe;
                }
                .th-spinner {
                    width: 32px; height: 32px; margin: 3rem auto;
                    border: 3px solid #e8f0fe; border-top-color: #0052cc;
                    border-radius: 50%; animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            {loading ? (
                <div className="th-spinner" />
            ) : txs.length === 0 ? (
                <div className="th-empty">
                    <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
                    <p style={{ fontWeight: 600, color: "#1a3c6b" }}>Chưa có giao dịch nào</p>
                </div>
            ) : (
                <div className="th-card">
                    {txs.map((tx) => {
                        const type = TYPE_LABEL[tx.type] ?? { label: tx.type, color: "#6b8cbf", sign: "" };
                        return (
                            <div key={tx.transaction_id} className="th-row">
                                <div className="th-icon" style={{ background: `${type.color}18` }}>
                                    {tx.type === "deposit" ? "💳" : tx.type === "refund" ? "↩️" : "🛒"}
                                </div>
                                <div className="th-info">
                                    <div className="th-desc">{tx.description || type.label}</div>
                                    <div className="th-date">
                                        {new Date(tx.created_at).toLocaleString("vi-VN")}
                                    </div>
                                </div>
                                <div className="th-amount" style={{ color: type.color }}>
                                    {type.sign}{Number(tx.amount).toLocaleString("vi-VN")}₫
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}