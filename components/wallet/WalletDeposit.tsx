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

const QR_TIMEOUT = 15 * 60;

const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
};

export default function WalletDeposit() {
    const { user, login } = useAuthStore();
    const [info, setInfo] = useState<DepositInfo | null>(null);
    const [balance, setBalance] = useState<number>(user?.wallet ?? 0);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
    const [checkMsg, setCheckMsg] = useState<string | null>(null);
    const [amount, setAmount] = useState<string>("");
    // Bước 1: nhập tiền | Bước 2: hiển thị QR
    const [showQr, setShowQr] = useState(false);
    const [qrTimeLeft, setQrTimeLeft] = useState(QR_TIMEOUT);
    const qrExpired = qrTimeLeft <= 0;

    const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000];

    // ── Refresh balance ──
    const refreshBalance = async () => {
        const res = await api.get("/api/wallet/balance");
        const newBalance = res.data.balance;
        setBalance(newBalance);
        if (user) {
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

    // ── Load ──
    useEffect(() => {
        refreshBalance().catch(() => { });
        api.get("/api/wallet/deposit-info")
            .then(res => setInfo(res.data))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Đếm ngược timer khi QR đang hiển thị ──
    useEffect(() => {
        if (!showQr || qrExpired) return;
        const interval = setInterval(() => {
            setQrTimeLeft(t => Math.max(0, t - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [showQr, qrExpired]);

    // ── Polling sau khi nhấn "Đã chuyển khoản" ──
    useEffect(() => {
        if (!checking) return;
        let attempts = 0;
        const MAX_ATTEMPTS = 24;
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checking, balance]);

    const handleShowQr = () => {
        setQrTimeLeft(QR_TIMEOUT);
        setCheckMsg(null);
        setChecking(false);
        setShowQr(true);
    };

    const handleBackToAmount = () => {
        setShowQr(false);
        setChecking(false);
        setCheckMsg(null);
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    const qrUrl = info
        ? `https://img.vietqr.io/image/${info.bank_id}-${info.account_no}-compact2.png` +
        `?amount=${amount || 0}` +
        `&addInfo=${info.transfer_content}` +
        `&accountName=${info.account_name}`
        : null;

    const amountValid = Number(amount) >= 1000;

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
                .wd-balance-amount { font-family: 'Nunito', sans-serif; font-size: 1.75rem; font-weight: 800; position: relative; }
                .wd-balance-updated { font-size: 0.75rem; opacity: 0.7; position: relative; margin-top: 0.2rem; color: #90ff90; }

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

                /* Step indicator */
                .wd-steps { display: flex; align-items: center; gap: 0; margin-bottom: 1.5rem; }
                .wd-step {
                    display: flex; align-items: center; gap: 0.5rem;
                    font-size: 0.82rem; font-weight: 600;
                }
                .wd-step-num {
                    width: 26px; height: 26px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 0.75rem; font-weight: 700;
                    flex-shrink: 0;
                }
                .wd-step.active .wd-step-num { background: #0052cc; color: #fff; }
                .wd-step.done .wd-step-num { background: #00875a; color: #fff; }
                .wd-step.inactive .wd-step-num { background: #e8f0fe; color: #6b8cbf; }
                .wd-step.active span { color: #0052cc; }
                .wd-step.done span { color: #00875a; }
                .wd-step.inactive span { color: #6b8cbf; }
                .wd-step-line { flex: 1; height: 2px; background: #e8f0fe; margin: 0 0.5rem; }
                .wd-step-line.done { background: #00875a; }

                /* Amount input */
                .wd-amount-input {
                    width: 100%; padding: 0.9rem 1.1rem;
                    border: 2px solid #e8f0fe; border-radius: 12px;
                    font-family: 'Nunito', sans-serif; font-size: 1.25rem; font-weight: 700;
                    color: #1a3c6b; outline: none; box-sizing: border-box;
                    transition: border-color 0.18s;
                    text-align: right;
                }
                .wd-amount-input:focus { border-color: #0052cc; }
                .wd-amount-input::placeholder { font-size: 1rem; font-weight: 400; color: #b0bccc; }

                /* QR */
                .wd-qr-wrap {
                    display: flex; justify-content: center;
                    background: #f0f4ff; border-radius: 12px;
                    padding: 1.25rem; margin-bottom: 1.25rem;
                    position: relative;
                }
                .wd-qr-img { border-radius: 8px; }

                /* Info rows */
                .wd-info-row {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 0.6rem 0; border-bottom: 1px solid #f0f4ff;
                }
                .wd-info-row:last-child { border-bottom: none; }
                .wd-info-label { font-size: 0.82rem; color: #6b8cbf; }
                .wd-info-value { font-size: 0.88rem; font-weight: 500; color: #1a3c6b; display: flex; align-items: center; gap: 0.5rem; }
                .wd-copy-btn {
                    font-size: 0.72rem; padding: 0.2rem 0.6rem;
                    background: #e8f0fe; color: #0052cc;
                    border: none; border-radius: 6px; cursor: pointer; transition: background 0.15s;
                }
                .wd-copy-btn:hover { background: #c8d8ff; }
                .wd-copy-btn.copied { background: #d4edda; color: #00875a; }

                /* Warning */
                .wd-warning {
                    background: #fff8e1; border: 1px solid #ffe082;
                    border-radius: 10px; padding: 0.85rem 1rem;
                    font-size: 0.82rem; color: #7b5700; line-height: 1.6; margin-bottom: 1rem;
                }

                /* Buttons */
                .wd-btn {
                    width: 100%; padding: 0.9rem;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; border: none; border-radius: 12px;
                    font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700;
                    cursor: pointer; transition: opacity 0.15s, transform 0.1s;
                    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
                }
                .wd-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
                .wd-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
                .wd-btn-outline {
                    width: 100%; padding: 0.75rem;
                    background: #f0f4ff; color: #0052cc;
                    border: 1.5px solid #c8d8ff; border-radius: 12px;
                    font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 600;
                    cursor: pointer; transition: background 0.15s; margin-top: 0.65rem;
                }
                .wd-btn-outline:hover { background: #e0ebff; }

                .wd-spinner {
                    width: 32px; height: 32px;
                    border: 3px solid #e8f0fe; border-top-color: #0052cc;
                    border-radius: 50%; animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div className="wd-root">
                {/* Số dư */}
                <div className="wd-balance">
                    <div className="wd-balance-bg" />
                    <div>
                        <div className="wd-balance-label">Số dư ví</div>
                        <div className="wd-balance-amount">{balance.toLocaleString("vi-VN")}₫</div>
                        {checking && <div className="wd-balance-updated">⏳ Đang chờ xác nhận...</div>}
                    </div>
                    <div style={{ fontSize: "2.5rem" }}>💰</div>
                </div>

                {info && (
                    <>
                        {/* Step indicator */}
                        <div className="wd-steps">
                            <div className={`wd-step ${!showQr ? "active" : "done"}`}>
                                <div className="wd-step-num">{showQr ? "✓" : "1"}</div>
                                <span>Nhập số tiền</span>
                            </div>
                            <div className={`wd-step-line ${showQr ? "done" : ""}`} />
                            <div className={`wd-step ${showQr ? "active" : "inactive"}`}>
                                <div className="wd-step-num">2</div>
                                <span>Quét mã QR</span>
                            </div>
                        </div>

                        {/* ── BƯỚC 1: Nhập số tiền ── */}
                        {!showQr && (
                            <div className="wd-card">
                                <div className="wd-card-title">💵 Nhập số tiền muốn nạp</div>

                                <div style={{ position: "relative", marginBottom: "0.75rem" }}>
                                    <input
                                        className="wd-amount-input"
                                        type="number"
                                        min={1000}
                                        step={1000}
                                        placeholder="0"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                    />
                                    <span style={{
                                        position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)",
                                        fontSize: "1rem", color: "#6b8cbf", pointerEvents: "none",
                                    }}>₫</span>
                                </div>

                                {amount && Number(amount) > 0 && (
                                    <div style={{ fontSize: "0.85rem", color: "#0052cc", fontWeight: 600, marginBottom: "0.75rem", textAlign: "right" }}>
                                        = {Number(amount).toLocaleString("vi-VN")}₫
                                    </div>
                                )}

                                {/* Quick amounts */}
                                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
                                    {QUICK_AMOUNTS.map(a => (
                                        <button
                                            key={a}
                                            onClick={() => setAmount(String(a))}
                                            style={{
                                                padding: "0.35rem 0.85rem", borderRadius: 99, cursor: "pointer",
                                                fontSize: "0.8rem", fontWeight: 600,
                                                border: amount === String(a) ? "1.5px solid #0052cc" : "1.5px solid #dde3f0",
                                                background: amount === String(a) ? "#e8f0fe" : "#f8faff",
                                                color: amount === String(a) ? "#0052cc" : "#6b8cbf",
                                                transition: "all 0.15s",
                                            }}
                                        >
                                            {(a / 1_000).toFixed(0)}k
                                        </button>
                                    ))}
                                </div>

                                <button
                                    className="wd-btn"
                                    disabled={!amountValid}
                                    onClick={handleShowQr}
                                >
                                    📱 Tạo mã QR nạp tiền
                                </button>

                                {!amountValid && amount !== "" && Number(amount) > 0 && (
                                    <div style={{ fontSize: "0.78rem", color: "#c0392b", marginTop: "0.5rem", textAlign: "center" }}>
                                        Số tiền tối thiểu là 1.000₫
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── BƯỚC 2: QR ── */}
                        {showQr && (
                            <>
                                <div className="wd-card">
                                    <div className="wd-card-title">
                                        📱 Quét QR để nạp tiền
                                        {!qrExpired && (
                                            <span style={{
                                                marginLeft: "auto", fontSize: "0.78rem", fontWeight: 700,
                                                color: qrTimeLeft <= 60 ? "#c0392b" : qrTimeLeft <= 180 ? "#b8860b" : "#00875a",
                                                background: qrTimeLeft <= 60 ? "#fff0f0" : qrTimeLeft <= 180 ? "#fffbe6" : "#e6f9f0",
                                                padding: "0.2rem 0.65rem", borderRadius: 99,
                                                border: `1px solid ${qrTimeLeft <= 60 ? "#ffcdd2" : qrTimeLeft <= 180 ? "#ffe082" : "#b7dfbb"}`,
                                            }}>
                                                ⏱ {formatTime(qrTimeLeft)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Số tiền nạp */}
                                    <div style={{
                                        background: "#f0f4ff", borderRadius: 10,
                                        padding: "0.75rem 1rem", marginBottom: "1.25rem",
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                    }}>
                                        <span style={{ fontSize: "0.85rem", color: "#6b8cbf" }}>Số tiền nạp</span>
                                        <span style={{ fontFamily: "Nunito, sans-serif", fontSize: "1.1rem", fontWeight: 800, color: "#0052cc" }}>
                                            {Number(amount).toLocaleString("vi-VN")}₫
                                        </span>
                                    </div>

                                    {/* QR Image hoặc Expired */}
                                    {qrExpired ? (
                                        <div style={{
                                            background: "#fff0f0", border: "1px solid #ffcdd2",
                                            borderRadius: 12, padding: "2rem", textAlign: "center", marginBottom: "1.25rem",
                                        }}>
                                            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⏰</div>
                                            <div style={{ fontWeight: 700, color: "#c0392b", marginBottom: "0.4rem" }}>Mã QR đã hết hạn (15 phút)</div>
                                            <div style={{ fontSize: "0.82rem", color: "#7b5700", marginBottom: "1rem" }}>
                                                Vui lòng tạo mã QR mới để tiếp tục.
                                            </div>
                                            <button
                                                onClick={() => { setQrTimeLeft(QR_TIMEOUT); setCheckMsg(null); setChecking(false); }}
                                                style={{
                                                    padding: "0.55rem 1.4rem", background: "#0052cc", color: "#fff",
                                                    border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.88rem", cursor: "pointer",
                                                }}
                                            >
                                                🔄 Làm mới mã QR
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="wd-qr-wrap">
                                            <Image
                                                src={qrUrl ?? info.qr_url}
                                                alt="QR Nạp tiền"
                                                width={220} height={220}
                                                className="wd-qr-img"
                                                unoptimized
                                            />
                                        </div>
                                    )}

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
                                        <span className="wd-info-label" style={{ color: "#c0392b", fontWeight: 600 }}>⚠ Nội dung CK</span>
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

                                {/* Nút xác nhận */}
                                <button
                                    className="wd-btn"
                                    onClick={() => { setChecking(true); setCheckMsg(null); }}
                                    disabled={checking || qrExpired}
                                >
                                    {checking ? (
                                        <><div className="wd-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Đang kiểm tra...</>
                                    ) : (
                                        "✅ Tôi đã chuyển khoản xong"
                                    )}
                                </button>

                                {checking && (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.75rem" }}>
                                        <p style={{ margin: 0, fontSize: "0.8rem", color: "#6b8cbf" }}>
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
                                        borderRadius: 10, fontSize: "0.88rem", textAlign: "center",
                                        background: checkMsg.startsWith("✅") ? "#d4edda" : "#fff8e1",
                                        color: checkMsg.startsWith("✅") ? "#00875a" : "#7b5700",
                                        border: `1px solid ${checkMsg.startsWith("✅") ? "#b7dfbb" : "#ffe082"}`,
                                    }}>
                                        {checkMsg}
                                    </div>
                                )}

                                {/* Nút quay lại đổi số tiền */}
                                {!checking && (
                                    <button className="wd-btn-outline" onClick={handleBackToAmount}>
                                        ← Đổi số tiền
                                    </button>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
