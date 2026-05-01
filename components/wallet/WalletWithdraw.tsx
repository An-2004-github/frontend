"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/axios";

interface WithdrawalRequest {
    wr_id: number;
    amount: number;
    bank_name: string;
    account_no: string;
    account_name: string;
    status: "pending" | "completed" | "rejected";
    created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: "Đang xử lý", color: "#b8860b", bg: "#fffbe6" },
    completed: { label: "Đã hoàn tất", color: "#00875a", bg: "#e6f9f0" },
    rejected:  { label: "Bị từ chối",  color: "#c0392b", bg: "#fff0f0" },
};

export default function WalletWithdraw() {
    const [balance, setBalance] = useState<number>(0);
    const [loadingBalance, setLoadingBalance] = useState(true);

    // Form
    const [bankName, setBankName]     = useState("");
    const [accountNo, setAccountNo]   = useState("");
    const [accountName, setAccountName] = useState("");
    const [amount, setAmount]         = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg]     = useState<string | null>(null);

    // History
    const [history, setHistory] = useState<WithdrawalRequest[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [polling, setPolling] = useState(false);
    const hasPendingRef = useRef(false);
    const historyRef = useRef<WithdrawalRequest[]>([]);

    const amountNum = parseFloat(amount.replace(/,/g, "")) || 0;
    const insufficient = amountNum > balance;
    const canSubmit = bankName.trim() && accountNo.trim() && accountName.trim() && amountNum >= 10000 && !insufficient;

    const loadBalance = () => {
        api.get("/api/wallet/balance")
            .then(r => setBalance(r.data.balance))
            .catch(() => {})
            .finally(() => setLoadingBalance(false));
    };

    const loadHistory = () => {
        api.get("/api/wallet/withdrawals")
            .then(r => setHistory(r.data))
            .catch(() => setHistory([]))
            .finally(() => setLoadingHistory(false));
    };

    useEffect(() => { loadBalance(); loadHistory(); }, []);

    // Sync refs khi history thay đổi
    useEffect(() => {
        historyRef.current = history;
        hasPendingRef.current = history.some(h => h.status === "pending");
        setPolling(hasPendingRef.current);
    }, [history]);

    // Polling chạy liên tục từ khi mount, dùng ref để không cần re-create interval
    useEffect(() => {
        const interval = setInterval(async () => {
            if (!hasPendingRef.current) return;
            try {
                const res = await api.get("/api/wallet/withdrawals");
                const newHistory: WithdrawalRequest[] = res.data;

                // Phát hiện item nào vừa được xử lý (pending → completed/rejected)
                const anyResolved = historyRef.current.some(prev => {
                    if (prev.status !== "pending") return false;
                    const updated = newHistory.find(n => n.wr_id === prev.wr_id);
                    return updated && updated.status !== "pending";
                });

                setHistory(newHistory);
                if (anyResolved) loadBalance();
            } catch { }
        }, 3000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = async () => {
        setSubmitting(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        try {
            await api.post("/api/wallet/withdraw", {
                amount: amountNum,
                bank_name: bankName.trim(),
                account_no: accountNo.trim(),
                account_name: accountName.trim(),
            });
            setSuccessMsg("✅ Yêu cầu rút tiền đã được gửi! Admin sẽ xử lý trong thời gian sớm nhất.");
            setBankName(""); setAccountNo(""); setAccountName(""); setAmount("");
            loadHistory();
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setErrorMsg(detail || "Gửi yêu cầu thất bại, vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <style>{`
                .wd-card {
                    background: #fff; border-radius: 16px;
                    border: 1px solid #e8f0fe; padding: 1.5rem;
                    margin-bottom: 1.25rem;
                }
                .wd-title {
                    font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700;
                    color: #1a3c6b; margin-bottom: 1.25rem; padding-bottom: 0.75rem;
                    border-bottom: 2px solid #e8f0fe;
                    display: flex; align-items: center; gap: 0.5rem;
                }
                .wd-balance {
                    display: flex; justify-content: space-between; align-items: center;
                    background: #f0f4ff; border-radius: 10px; padding: 0.85rem 1rem;
                    margin-bottom: 1.25rem;
                }
                .wd-balance-label { font-size: 0.85rem; color: #6b8cbf; }
                .wd-balance-value {
                    font-family: 'Nunito', sans-serif; font-size: 1.1rem;
                    font-weight: 800; color: #1a3c6b;
                }
                .wd-field { margin-bottom: 1rem; }
                .wd-label {
                    display: block; font-size: 0.78rem; font-weight: 600;
                    color: #6b8cbf; margin-bottom: 0.35rem; text-transform: uppercase;
                }
                .wd-input {
                    width: 100%; padding: 0.65rem 0.9rem;
                    border: 1.5px solid #e8f0fe; border-radius: 9px;
                    font-size: 0.9rem; color: #1a3c6b; background: #fff;
                    outline: none; transition: border-color 0.15s; box-sizing: border-box;
                }
                .wd-input:focus { border-color: #0052cc; }
                .wd-input.error { border-color: #ffcdd2; }
                .wd-quick { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem; }
                .wd-quick-btn {
                    padding: 0.3rem 0.75rem; border-radius: 99px;
                    border: 1.5px solid #c8d8ff; background: #f0f4ff;
                    color: #0052cc; font-size: 0.78rem; font-weight: 600;
                    cursor: pointer; transition: all 0.15s;
                }
                .wd-quick-btn:hover { background: #0052cc; color: #fff; border-color: #0052cc; }
                .wd-insufficient {
                    font-size: 0.78rem; color: #c0392b; margin-top: 0.3rem;
                }
                .wd-btn {
                    width: 100%; padding: 0.9rem;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; border: none; border-radius: 12px;
                    font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700;
                    cursor: pointer; margin-top: 0.75rem;
                    transition: opacity 0.15s;
                }
                .wd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .wd-btn:hover:not(:disabled) { opacity: 0.9; }
                .wd-msg {
                    margin-top: 0.75rem; padding: 0.75rem 1rem;
                    border-radius: 10px; font-size: 0.88rem; line-height: 1.5;
                }
                .wd-note {
                    background: #fff8e1; border: 1px solid #ffe082; border-radius: 10px;
                    padding: 0.85rem 1rem; font-size: 0.82rem; color: #7b5700;
                    line-height: 1.6; margin-bottom: 1.25rem;
                }
                /* History */
                .wd-hist-row {
                    display: flex; align-items: flex-start; gap: 1rem;
                    padding: 1rem 0; border-bottom: 1px solid #f0f4ff;
                }
                .wd-hist-row:last-child { border-bottom: none; }
                .wd-hist-icon {
                    width: 40px; height: 40px; border-radius: 10px;
                    background: #f0f4ff; display: flex; align-items: center;
                    justify-content: center; font-size: 1.1rem; flex-shrink: 0;
                }
                .wd-hist-info { flex: 1; min-width: 0; }
                .wd-hist-bank { font-size: 0.88rem; font-weight: 600; color: #1a3c6b; }
                .wd-hist-meta { font-size: 0.75rem; color: #6b8cbf; margin-top: 0.15rem; }
                .wd-hist-right { text-align: right; flex-shrink: 0; }
                .wd-hist-amount {
                    font-family: 'Nunito', sans-serif; font-size: 0.95rem;
                    font-weight: 800; color: #c0392b;
                }
                .wd-hist-badge {
                    display: inline-block; padding: 0.18rem 0.6rem;
                    border-radius: 99px; font-size: 0.7rem; font-weight: 700;
                    margin-top: 0.3rem;
                }
            `}</style>

            {/* Balance */}
            <div className="wd-card">
                <div className="wd-title">💸 Yêu cầu rút tiền</div>

                <div className="wd-balance">
                    <span className="wd-balance-label">Số dư ví hiện tại</span>
                    <span className="wd-balance-value">
                        {loadingBalance ? "..." : balance.toLocaleString("vi-VN") + "₫"}
                    </span>
                </div>

                <div className="wd-note">
                    ⚠️ <strong>Lưu ý:</strong> Yêu cầu rút tiền sẽ được admin xem xét và chuyển khoản thủ công.
                    Số tiền sẽ bị trừ khỏi ví sau khi admin xác nhận. Tối thiểu <strong>10,000₫</strong>.
                </div>

                {/* Form */}
                <div className="wd-field">
                    <label className="wd-label">Ngân hàng thụ hưởng *</label>
                    <input
                        className="wd-input"
                        placeholder="VD: Vietcombank, MB, Techcombank..."
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                    />
                </div>

                <div className="wd-field">
                    <label className="wd-label">Số tài khoản *</label>
                    <input
                        className="wd-input"
                        placeholder="Nhập số tài khoản"
                        value={accountNo}
                        onChange={e => setAccountNo(e.target.value)}
                    />
                </div>

                <div className="wd-field">
                    <label className="wd-label">Chủ tài khoản *</label>
                    <input
                        className="wd-input"
                        placeholder="Tên chủ tài khoản (IN HOA)"
                        value={accountName}
                        onChange={e => setAccountName(e.target.value.toUpperCase())}
                    />
                </div>

                <div className="wd-field">
                    <label className="wd-label">Số tiền muốn rút (₫) *</label>
                    <input
                        className={`wd-input${insufficient ? " error" : ""}`}
                        placeholder="Nhập số tiền"
                        type="number"
                        min={10000}
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                    />
                    <div className="wd-quick">
                        {[50000, 100000, 200000, 500000, 1000000].map(v => (
                            <button key={v} className="wd-quick-btn" onClick={() => setAmount(String(v))}>
                                {v >= 1000000 ? `${v / 1000000}M` : `${v / 1000}k`}
                            </button>
                        ))}
                    </div>
                    {insufficient && (
                        <div className="wd-insufficient">⚠️ Số dư không đủ để rút {amountNum.toLocaleString("vi-VN")}₫</div>
                    )}
                </div>

                <button className="wd-btn" disabled={!canSubmit || submitting} onClick={handleSubmit}>
                    {submitting ? "Đang gửi..." : "📤 Gửi yêu cầu rút tiền"}
                </button>

                {successMsg && (
                    <div className="wd-msg" style={{ background: "#d4edda", color: "#00875a", border: "1px solid #b7dfbb" }}>
                        {successMsg}
                    </div>
                )}
                {errorMsg && (
                    <div className="wd-msg" style={{ background: "#fff0f0", color: "#c0392b", border: "1px solid #ffcdd2" }}>
                        ❌ {errorMsg}
                    </div>
                )}
            </div>

            {/* History */}
            <div className="wd-card">
                <div className="wd-title">
                    📋 Lịch sử yêu cầu rút tiền
                    {polling && (
                        <span style={{
                            marginLeft: "auto", fontSize: "0.72rem", fontWeight: 600,
                            color: "#0052cc", background: "#e8f0fe",
                            padding: "0.15rem 0.6rem", borderRadius: 99,
                            display: "flex", alignItems: "center", gap: "0.35rem",
                        }}>
                            <span style={{
                                width: 7, height: 7, borderRadius: "50%",
                                background: "#0052cc",
                                animation: "wd-pulse 1.2s ease-in-out infinite",
                                display: "inline-block", flexShrink: 0,
                            }} />
                            Đang cập nhật
                        </span>
                    )}
                </div>
                <style>{`@keyframes wd-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>

                {loadingHistory ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "#6b8cbf" }}>Đang tải...</div>
                ) : history.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "#6b8cbf" }}>
                        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📭</div>
                        Chưa có yêu cầu rút tiền nào
                    </div>
                ) : (
                    history.map(req => {
                        const st = STATUS_MAP[req.status] ?? { label: req.status, color: "#6b8cbf", bg: "#f0f4ff" };
                        return (
                            <div key={req.wr_id} className="wd-hist-row">
                                <div className="wd-hist-icon">🏦</div>
                                <div className="wd-hist-info">
                                    <div className="wd-hist-bank">{req.bank_name}</div>
                                    <div className="wd-hist-meta">
                                        TK: {req.account_no} · {req.account_name}
                                    </div>
                                    <div className="wd-hist-meta">
                                        {new Date(req.created_at).toLocaleString("vi-VN")}
                                    </div>
                                </div>
                                <div className="wd-hist-right">
                                    <div className="wd-hist-amount">-{Number(req.amount).toLocaleString("vi-VN")}₫</div>
                                    <div className="wd-hist-badge" style={{ background: st.bg, color: st.color }}>
                                        {st.label}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </>
    );
}
