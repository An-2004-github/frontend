"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

interface DepositInfo {
    bank_id: string;
    account_no: string;
    account_name: string;
    transfer_content: string;
    qr_url: string;
    note: string;
}

export default function WalletDeposit() {
    const { user, login } = useAuthStore();
    const [info, setInfo] = useState<DepositInfo | null>(null);
    const [balance, setBalance] = useState<number>(user?.wallet ?? 0);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
    const [amount, setAmount] = useState<string>("");

    // ✅ Helper cập nhật balance + authStore cùng lúc
    const refreshBalance = async () => {
        const res = await api.get("/api/wallet/balance");
        const newBalance = res.data.balance;
        setBalance(newBalance);
        // Cập nhật store để Navbar hiển thị đúng
        if (user) {
            // Lấy token từ auth-storage (zustand persist)
            let token = "";
            try {
                const raw = localStorage.getItem("auth-storage");
                if (raw) token = JSON.parse(raw)?.state?.token ?? "";
            } catch { }
            if (!token) token = localStorage.getItem("token") ?? "";
            login({ ...user, wallet: newBalance }, token);
        }
        return newBalance;
    };

    // ✅ QR thay đổi theo số tiền nhập
    const qrUrl = info
        ? `https://img.vietqr.io/image/${info.bank_id}-${info.account_no}-compact2.png` +
        `?amount=${amount || 0}` +
        `&addInfo=${info.transfer_content}` +
        `&accountName=${info.account_name}`
        : null;

    const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000];

    useEffect(() => {
        // ✅ Lấy số dư thật từ server khi vào trang
        refreshBalance().catch(() => { });

        api.get("/api/wallet/deposit-info")
            .then(res => setInfo(res.data))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [checkMsg, setCheckMsg] = useState<string | null>(null);

    // ── Polling kiểm tra số dư mỗi 5 giây, timeout sau 2 phút ──
    useEffect(() => {
        if (!checking) return;

        let attempts = 0;
        const MAX_ATTEMPTS = 24; // 24 × 5s = 2 phút

        const interval = setInterval(async () => {
            attempts++;
            try {
                const newBalance = await refreshBalance();
                if (newBalance > balance) {
                    setChecking(false);
                    setCheckMsg("✅ Nạp tiền thành công!");
                    clearInterval(interval);
                    return;
                }
            } catch { }

            if (attempts >= MAX_ATTEMPTS) {
                setChecking(false);
                setCheckMsg("⏱ Không tìm thấy giao dịch. Vui lòng kiểm tra lại nội dung chuyển khoản.");
                clearInterval(interval);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [checking, balance]);

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
            <div className="wd-spinner" />
        </div>
    );

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

                .wd-root { font-family: 'DM Sans', sans-serif; max-width: 520px; margin: 0 auto; padding: 1.5rem; }

                .wd-balance {
                    background: linear-gradient(135deg, #003580, #0065ff);
                    border-radius: 16px; padding: 1.5rem 2rem;
                    margin-bottom: 1.5rem; color: #fff;
                    display: flex; justify-content: space-between; align-items: center;
                    position: relative; overflow: hidden;
                }
                .wd-balance-bg {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
                    background-size: 20px 20px;
                }
                .wd-balance-label { font-size: 0.85rem; opacity: 0.75; position: relative; }
                .wd-balance-amount {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1.75rem; font-weight: 800; position: relative;
                }
                .wd-balance-updated {
                    font-size: 0.75rem; opacity: 0.7; position: relative; margin-top: 0.2rem;
                    color: #90ff90;
                }

                .wd-card {
                    background: #fff; border-radius: 16px;
                    border: 1px solid #e8f0fe; padding: 1.5rem;
                    margin-bottom: 1rem;
                }
                .wd-card-title {
                    font-family: 'Nunito', sans-serif;
                    font-size: 1rem; font-weight: 700; color: #1a3c6b;
                    margin-bottom: 1.25rem; padding-bottom: 0.75rem;
                    border-bottom: 2px solid #e8f0fe;
                    display: flex; align-items: center; gap: 0.5rem;
                }

                /* QR */
                .wd-qr-wrap {
                    display: flex; justify-content: center;
                    background: #f0f4ff; border-radius: 12px;
                    padding: 1.25rem; margin-bottom: 1.25rem;
                }
                .wd-qr-img { border-radius: 8px; }

                /* Info rows */
                .wd-info-row {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 0.6rem 0; border-bottom: 1px solid #f0f4ff;
                }
                .wd-info-row:last-child { border-bottom: none; }
                .wd-info-label { font-size: 0.82rem; color: #6b8cbf; }
                .wd-info-value {
                    font-size: 0.88rem; font-weight: 500; color: #1a3c6b;
                    display: flex; align-items: center; gap: 0.5rem;
                }
                .wd-copy-btn {
                    font-size: 0.72rem; padding: 0.2rem 0.6rem;
                    background: #e8f0fe; color: #0052cc;
                    border: none; border-radius: 6px; cursor: pointer;
                    transition: background 0.15s;
                }
                .wd-copy-btn:hover { background: #c8d8ff; }
                .wd-copy-btn.copied { background: #d4edda; color: #00875a; }

                /* Warning */
                .wd-warning {
                    background: #fff8e1; border: 1px solid #ffe082;
                    border-radius: 10px; padding: 0.85rem 1rem;
                    font-size: 0.82rem; color: #7b5700; line-height: 1.6;
                    margin-bottom: 1rem;
                }

                /* Check button */
                .wd-check-btn {
                    width: 100%; padding: 0.85rem;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; border: none; border-radius: 10px;
                    font-family: 'Nunito', sans-serif;
                    font-size: 0.95rem; font-weight: 700; cursor: pointer;
                    transition: opacity 0.15s;
                    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
                }
                .wd-check-btn:hover { opacity: 0.9; }
                .wd-check-btn:disabled { opacity: 0.6; cursor: not-allowed; }

                .wd-checking-note {
                    text-align: center; font-size: 0.8rem; color: #6b8cbf;
                    margin-top: 0.75rem;
                }

                .wd-spinner {
                    width: 32px; height: 32px;
                    border: 3px solid #e8f0fe; border-top-color: #0052cc;
                    border-radius: 50%; animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div className="wd-root">
                {/* Số dư hiện tại */}
                <div className="wd-balance">
                    <div className="wd-balance-bg" />
                    <div>
                        <div className="wd-balance-label">Số dư ví</div>
                        <div className="wd-balance-amount">
                            {balance.toLocaleString("vi-VN")}₫
                        </div>
                        {checking && (
                            <div className="wd-balance-updated">⏳ Đang chờ xác nhận...</div>
                        )}
                    </div>
                    <div style={{ fontSize: "2.5rem" }}>💰</div>
                </div>

                {info && (
                    <>
                        {/* ── Nhập số tiền ── */}
                        <div style={{ marginBottom: "1.25rem" }}>
                            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6b778c", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "0.5rem" }}>
                                Số tiền muốn nạp
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                <input
                                    type="number"
                                    min={1000}
                                    step={1000}
                                    placeholder="Nhập số tiền..."
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    style={{
                                        flex: 1, padding: "0.7rem 1rem",
                                        border: "1.5px solid #dde3f0", borderRadius: "10px",
                                        fontFamily: "DM Sans, sans-serif", fontSize: "0.95rem",
                                        color: "#1a3c6b", outline: "none",
                                    }}
                                />
                                <span style={{ fontSize: "0.9rem", color: "#6b8cbf", flexShrink: 0 }}>₫</span>
                            </div>
                            {/* Quick amount buttons */}
                            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
                                {QUICK_AMOUNTS.map((a) => (
                                    <button
                                        key={a}
                                        onClick={() => setAmount(String(a))}
                                        style={{
                                            padding: "0.3rem 0.7rem",
                                            borderRadius: "99px", cursor: "pointer",
                                            fontSize: "0.75rem", fontWeight: 500,
                                            border: amount === String(a) ? "1.5px solid #0052cc" : "1.5px solid #dde3f0",
                                            background: amount === String(a) ? "#e8f0fe" : "#f8faff",
                                            color: amount === String(a) ? "#0052cc" : "#6b8cbf",
                                            transition: "all 0.15s",
                                        }}
                                    >
                                        {(a / 1000).toFixed(0)}k
                                    </button>
                                ))}
                            </div>
                            {amount && Number(amount) > 0 && (
                                <div style={{ fontSize: "0.82rem", color: "#0052cc", marginTop: "0.4rem", fontWeight: 500 }}>
                                    = {Number(amount).toLocaleString("vi-VN")}₫
                                </div>
                            )}
                        </div>

                        {/* QR Code */}
                        <div className="wd-card">
                            <div className="wd-card-title">📱 Quét QR để nạp tiền</div>
                            <div className="wd-qr-wrap">
                                <Image
                                    src={qrUrl ?? info.qr_url}
                                    alt="QR Nạp tiền"
                                    width={220} height={220}
                                    className="wd-qr-img"
                                    unoptimized
                                />
                            </div>

                            {/* Thông tin tài khoản */}
                            <div className="wd-info-row">
                                <span className="wd-info-label">Ngân hàng</span>
                                <span className="wd-info-value">{info.bank_id}</span>
                            </div>
                            <div className="wd-info-row">
                                <span className="wd-info-label">Số tài khoản</span>
                                <span className="wd-info-value">
                                    {info.account_no}
                                    <button
                                        className={`wd-copy-btn${copied === "account" ? " copied" : ""}`}
                                        onClick={() => handleCopy(info.account_no, "account")}
                                    >
                                        {copied === "account" ? "✓ Đã copy" : "Copy"}
                                    </button>
                                </span>
                            </div>
                            <div className="wd-info-row">
                                <span className="wd-info-label">Chủ tài khoản</span>
                                <span className="wd-info-value">{info.account_name}</span>
                            </div>
                            <div className="wd-info-row">
                                <span className="wd-info-label" style={{ color: "#c0392b", fontWeight: 600 }}>
                                    ⚠ Nội dung CK
                                </span>
                                <span className="wd-info-value" style={{ color: "#0052cc", fontWeight: 700 }}>
                                    {info.transfer_content}
                                    <button
                                        className={`wd-copy-btn${copied === "content" ? " copied" : ""}`}
                                        onClick={() => handleCopy(info.transfer_content, "content")}
                                    >
                                        {copied === "content" ? "✓ Đã copy" : "Copy"}
                                    </button>
                                </span>
                            </div>
                        </div>

                        {/* Cảnh báo */}
                        <div className="wd-warning">
                            ⚠️ <strong>Lưu ý quan trọng:</strong><br />
                            Nhập <strong>đúng nội dung chuyển khoản: {info.transfer_content}</strong><br />
                            Hệ thống tự động cập nhật số dư sau 5–30 giây khi nhận được tiền.
                        </div>

                        {/* Nút kiểm tra */}
                        <button
                            className="wd-check-btn"
                            onClick={() => { setChecking(true); setCheckMsg(null); }}
                            disabled={checking}
                        >
                            {checking ? (
                                <><div className="wd-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Đang kiểm tra...</>
                            ) : (
                                "✅ Tôi đã chuyển khoản xong"
                            )}
                        </button>

                        {checking && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.75rem" }}>
                                <p className="wd-checking-note" style={{ margin: 0 }}>
                                    Đang kiểm tra giao dịch (tối đa 2 phút)...
                                </p>
                                <button
                                    onClick={() => { setChecking(false); setCheckMsg(null); }}
                                    style={{ fontSize: "0.78rem", color: "#6b8cbf", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                                >
                                    Hủy
                                </button>
                            </div>
                        )}

                        {checkMsg && (
                            <div style={{
                                marginTop: "0.75rem", padding: "0.75rem 1rem",
                                borderRadius: "10px", fontSize: "0.88rem", textAlign: "center",
                                background: checkMsg.startsWith("✅") ? "#d4edda" : "#fff8e1",
                                color: checkMsg.startsWith("✅") ? "#00875a" : "#7b5700",
                                border: `1px solid ${checkMsg.startsWith("✅") ? "#b7dfbb" : "#ffe082"}`,
                            }}>
                                {checkMsg}
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}