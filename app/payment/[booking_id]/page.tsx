"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { usePaymentStore } from "@/store/paymentStore";

const BANK_ID = "MB";
const ACCOUNT_NO = "0944934501";
const ACCOUNT_NAME = "LE HOANG AN";

export default function PaymentPage() {
    const router = useRouter();
    const params = useParams();
    const bookingId = Number(params.booking_id);

    const { user, login } = useAuthStore();
    const { payment, clearPayment } = usePaymentStore();

    const isGuest = user?.provider === "guest";
    const [tab, setTab] = useState<"wallet" | "qr">((user && !isGuest) ? "wallet" : "qr");
    const [balance, setBalance] = useState<number>(user?.wallet ?? 0);
    const [paying, setPaying] = useState(false);
    const [checking, setChecking] = useState(false);
    const [checkMsg, setCheckMsg] = useState<string | null>(null);
    const [paid, setPaid] = useState(false);
    const [useWallet, setUseWallet] = useState(false);
    const [localPayment, setLocalPayment] = useState<{ totalAmount: number; description: string } | null>(null);
    const [loadingBooking, setLoadingBooking] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [expired, setExpired] = useState(false);
    const qrTimeLeft = timeLeft ?? 900;
    const qrExpired = expired;
    const safeTimeLeft = timeLeft ?? 900;

    const amount = (payment?.totalAmount ?? localPayment?.totalAmount) ?? 0;
    const description = (payment?.description ?? localPayment?.description) ?? `Đặt chỗ #${bookingId}`;

    const CASHBACK_RATES: Record<string, number> = {
        bronze: 0.005, silver: 0.01, gold: 0.015, diamond: 0.02,
    };
    const userRank = (user as { user_rank?: string })?.user_rank ?? "bronze";
    const cashbackRate = CASHBACK_RATES[userRank] ?? 0.005;
    const cashbackAmount = Math.round(amount * cashbackRate);

    const walletDeduction = useWallet ? Math.min(balance, amount) : 0;
    const qrAmount = Math.max(0, amount - walletDeduction);

    const qrUrl =
        `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png` +
        `?amount=${qrAmount}` +
        `&addInfo=VIVU%20${user?.user_id ?? ""}%20BOOKING%20${bookingId}` +
        `&accountName=${ACCOUNT_NAME}`;

    // Load balance on mount
    useEffect(() => {
        api.get("/api/wallet/balance")
            .then(res => setBalance(res.data.balance))
            .catch(() => { });
    }, []);

    // Fetch booking để lấy thời gian đặt và tính countdown chính xác
    useEffect(() => {
        setLoadingBooking(true);
        api.get(`/api/bookings/${bookingId}`)
            .then(res => {
                const b = res.data;
                if (b.status !== "pending") {
                    if (b.status === "cancelled") { setExpired(true); setTimeLeft(0); return; }
                    router.replace("/profile/bookings"); return;
                }
                // Tính thời gian còn lại dựa trên booking_date từ server
                const bookingDate = new Date(b.booking_date);
                const expiresAt = bookingDate.getTime() + 15 * 60 * 1000;
                const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
                setTimeLeft(remaining);
                if (remaining === 0) setExpired(true);

                if (!payment) {
                    const item = b.items?.[0];
                    let desc = `Đặt chỗ #${bookingId}`;
                    if (item?.entity_type === "room") desc = `Khách sạn #${item.entity_id}`;
                    else if (item?.entity_type === "flight") desc = `Chuyến bay #${item.entity_id}`;
                    else if (item?.entity_type === "bus") desc = `Xe khách #${item.entity_id}`;
                    setLocalPayment({ totalAmount: b.final_amount ?? b.total_price, description: desc });
                }
            })
            .catch(() => router.replace("/profile/bookings"))
            .finally(() => setLoadingBooking(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshBalance = async () => {
        const res = await api.get("/api/wallet/balance");
        const nb = res.data.balance;
        setBalance(nb);
        if (user) {
            let token = "";
            try {
                const raw = localStorage.getItem("auth-storage");
                if (raw) token = JSON.parse(raw)?.state?.token ?? "";
            } catch { }
            if (!token) token = localStorage.getItem("token") ?? "";
            login({ ...user, wallet: nb }, token);
        }
        return nb;
    };

    // Wallet payment
    const handlePayWallet = async () => {
        setPaying(true);
        try {
            await api.post(`/api/bookings/${bookingId}/pay-wallet`);
            await refreshBalance();
            clearPayment();
            setPaid(true);
            setTimeout(() => router.push(`/invoice/${bookingId}`), 1800);
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })
                ?.response?.data?.detail;
            alert(`❌ ${detail || "Thanh toán thất bại, vui lòng thử lại"}`);
        } finally {
            setPaying(false);
        }
    };

    // Xác nhận sau khi chuyển khoản (có thể kết hợp ví)
    const handleQrConfirm = async () => {
        setChecking(true);
        setCheckMsg(null);
        // Nếu dùng ví kết hợp: gọi pay-combined luôn (tin tưởng user đã CK phần còn lại)
        if (useWallet && walletDeduction > 0) {
            try {
                await api.post(`/api/bookings/${bookingId}/pay-combined`, { wallet_amount: walletDeduction });
                await refreshBalance();
                clearPayment();
                setPaid(true);
                setChecking(false);
                setTimeout(() => router.push(`/invoice/${bookingId}`), 1800);
            } catch (err: unknown) {
                setChecking(false);
                const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
                setCheckMsg(`❌ ${detail || "Thanh toán thất bại, vui lòng thử lại"}`);
            }
        }
        // Không dùng ví: polling kiểm tra booking được xác nhận qua webhook
    };

    // Đếm ngược timer chung cho toàn trang thanh toán
    useEffect(() => {
        if (expired || paid || timeLeft === null) return;
        if (timeLeft <= 0) {
            setExpired(true);
            api.post(`/api/bookings/${bookingId}/cancel-pending`).catch(() => {});
            return;
        }
        const interval = setInterval(() => {
            setTimeLeft(t => {
                if (t === null || t <= 1) { clearInterval(interval); return 0; }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expired, paid, timeLeft]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, "0");
        const sec = (s % 60).toString().padStart(2, "0");
        return `${m}:${sec}`;
    };

    // QR polling (chỉ khi không dùng ví)
    useEffect(() => {
        if (!checking || (useWallet && walletDeduction > 0)) return;
        let attempts = 0;
        const MAX = 24;
        const interval = setInterval(async () => {
            attempts++;
            try {
                const res = await api.get(`/api/bookings/${bookingId}`);
                if (res.data.status === "confirmed") {
                    setChecking(false);
                    setCheckMsg("✅ Thanh toán thành công!");
                    clearPayment();
                    clearInterval(interval);
                    setTimeout(() => router.push(`/invoice/${bookingId}`), 1800);
                    return;
                }
            } catch { }
            if (attempts >= MAX) {
                setChecking(false);
                setCheckMsg("⏱ Không tìm thấy giao dịch. Vui lòng kiểm tra lại.");
                clearInterval(interval);
            }
        }, 5000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checking, bookingId]);

    if (loadingBooking) return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4ff" }}>
            <div style={{ width: 36, height: 36, border: "3px solid #c8d8ff", borderTopColor: "#0052cc", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (!payment && !localPayment) return null;

    const sufficient = balance >= amount;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

                .pay-root { min-height: 100vh; background: #f0f4ff; font-family: 'DM Sans', sans-serif; }

                .pay-hero {
                    background: linear-gradient(135deg, #003580 0%, #0052cc 55%, #0065ff 100%);
                    padding: 2rem 1.5rem 3.5rem; text-align: center; position: relative; overflow: hidden;
                }
                .pay-hero-bg {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
                    background-size: 24px 24px;
                }
                .pay-hero-title {
                    font-family: 'Nunito', sans-serif; font-size: 1.5rem; font-weight: 800;
                    color: #fff; position: relative; margin: 0 0 0.25rem;
                }
                .pay-hero-sub { color: rgba(255,255,255,0.7); font-size: 0.88rem; position: relative; }
                .pay-hero-amount {
                    font-family: 'Nunito', sans-serif; font-size: 2rem; font-weight: 800;
                    color: #fff; position: relative; margin-top: 0.75rem;
                }
                .pay-hero-desc {
                    font-size: 0.82rem; color: rgba(255,255,255,0.6);
                    position: relative; margin-top: 0.2rem;
                }

                .pay-content {
                    max-width: 520px; margin: -2rem auto 0;
                    padding: 0 1.25rem 4rem; position: relative; z-index: 5;
                }

                .pay-tabs {
                    display: flex; background: #fff; border-radius: 12px;
                    padding: 4px; border: 1px solid #e8f0fe;
                    box-shadow: 0 2px 12px rgba(0,82,204,0.07);
                    margin-bottom: 1.25rem;
                }
                .pay-tab {
                    flex: 1; padding: 0.65rem; border: none; border-radius: 9px;
                    font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 500;
                    color: #6b8cbf; background: transparent; cursor: pointer;
                    transition: background 0.18s, color 0.18s;
                }
                .pay-tab.active { background: #0052cc; color: #fff; font-weight: 600; }
                .pay-tab:hover:not(.active) { background: #f0f4ff; color: #0052cc; }

                .pay-card {
                    background: #fff; border-radius: 16px;
                    border: 1px solid #e8f0fe; padding: 1.5rem;
                    margin-bottom: 1rem;
                }
                .pay-card-title {
                    font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700;
                    color: #1a3c6b; margin-bottom: 1.25rem; padding-bottom: 0.75rem;
                    border-bottom: 2px solid #e8f0fe;
                    display: flex; align-items: center; gap: 0.5rem;
                }

                /* Wallet balance */
                .pay-balance-row {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 0.85rem 1rem; border-radius: 10px;
                    background: #f0f4ff; margin-bottom: 1rem;
                }
                .pay-balance-label { font-size: 0.85rem; color: #6b8cbf; }
                .pay-balance-value {
                    font-family: 'Nunito', sans-serif; font-size: 1.1rem;
                    font-weight: 800; color: #1a3c6b;
                }

                .pay-summary-row {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 0.6rem 0; border-bottom: 1px solid #f0f4ff; font-size: 0.88rem;
                }
                .pay-summary-row:last-child { border-bottom: none; }
                .pay-summary-label { color: #6b8cbf; }
                .pay-summary-value { font-weight: 600; color: #1a3c6b; }
                .pay-summary-value.total {
                    font-family: 'Nunito', sans-serif; font-size: 1.05rem;
                    font-weight: 800; color: #0052cc;
                }
                .pay-summary-value.after {
                    font-family: 'Nunito', sans-serif;
                    color: ${sufficient ? "#00875a" : "#c0392b"};
                }

                .pay-insufficient {
                    background: #fff0f0; border: 1px solid #ffcdd2; border-radius: 10px;
                    padding: 0.85rem 1rem; font-size: 0.83rem; color: #c0392b;
                    margin-bottom: 1rem; line-height: 1.5;
                }

                .pay-btn {
                    width: 100%; padding: 0.9rem;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; border: none; border-radius: 12px;
                    font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700;
                    cursor: pointer; transition: opacity 0.15s, transform 0.15s;
                    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
                }
                .pay-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
                .pay-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .pay-btn.danger { background: linear-gradient(135deg, #c0392b, #e74c3c); }

                /* QR */
                .pay-qr-wrap {
                    display: flex; justify-content: center;
                    background: #f0f4ff; border-radius: 12px; padding: 1.25rem;
                    margin-bottom: 1.25rem;
                }
                .pay-info-row {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 0.6rem 0; border-bottom: 1px solid #f0f4ff;
                }
                .pay-info-row:last-child { border-bottom: none; }
                .pay-info-label { font-size: 0.82rem; color: #6b8cbf; }
                .pay-info-value {
                    font-size: 0.88rem; font-weight: 500; color: #1a3c6b;
                    display: flex; align-items: center; gap: 0.5rem;
                }

                .pay-warning {
                    background: #fff8e1; border: 1px solid #ffe082; border-radius: 10px;
                    padding: 0.85rem 1rem; font-size: 0.82rem; color: #7b5700;
                    line-height: 1.6; margin-bottom: 1rem;
                }

                /* Checkbox use-wallet */
                .pay-use-wallet {
                    display: flex; align-items: center; gap: 0.75rem;
                    padding: 0.9rem 1rem; border-radius: 10px;
                    border: 1.5px solid #e8f0fe; background: #f8faff;
                    cursor: pointer; margin-bottom: 1rem;
                    transition: border-color 0.18s, background 0.18s;
                }
                .pay-use-wallet.checked { border-color: #0052cc; background: #eef4ff; }
                .pay-use-wallet input[type=checkbox] { width: 18px; height: 18px; accent-color: #0052cc; cursor: pointer; flex-shrink: 0; }
                .pay-use-wallet-label { font-size: 0.88rem; font-weight: 500; color: #1a3c6b; flex: 1; }
                .pay-use-wallet-balance { font-family: 'Nunito', sans-serif; font-size: 0.88rem; font-weight: 700; color: #00875a; }

                .pay-breakdown {
                    background: #f0f4ff; border-radius: 10px;
                    padding: 0.85rem 1rem; margin-bottom: 1rem;
                    display: flex; flex-direction: column; gap: 0.5rem;
                }
                .pay-breakdown-row {
                    display: flex; justify-content: space-between; align-items: center;
                    font-size: 0.85rem;
                }
                .pay-breakdown-label { color: #6b8cbf; }
                .pay-breakdown-value { font-weight: 600; }
                .pay-breakdown-divider { border: none; border-top: 1px dashed #c8d8ff; margin: 0.2rem 0; }
                .pay-breakdown-total-label { font-weight: 600; color: #1a3c6b; }
                .pay-breakdown-total-value { font-family: 'Nunito', sans-serif; font-weight: 800; color: #0052cc; font-size: 0.95rem; }

                .pay-qr-zero {
                    text-align: center; padding: 1.5rem;
                    background: #d4edda; border-radius: 12px;
                    margin-bottom: 1rem;
                }
                .pay-qr-zero-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
                .pay-qr-zero-text { font-family: 'Nunito', sans-serif; font-size: 0.95rem; font-weight: 700; color: #00875a; }

                .pay-spinner {
                    width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.4);
                    border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* Success overlay */
                .pay-success {
                    position: fixed; inset: 0; z-index: 9999;
                    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center;
                }
                .pay-success-box {
                    background: #fff; border-radius: 20px; padding: 3rem 2.5rem;
                    text-align: center; max-width: 360px; width: 90%;
                    animation: popIn 0.3s ease;
                }
                @keyframes popIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .pay-success-icon { font-size: 4rem; margin-bottom: 1rem; }
                .pay-success-title {
                    font-family: 'Nunito', sans-serif; font-size: 1.3rem;
                    font-weight: 800; color: #00875a; margin-bottom: 0.5rem;
                }
                .pay-success-sub { font-size: 0.88rem; color: #6b8cbf; }
            `}</style>

            {paid && (
                <div className="pay-success">
                    <div className="pay-success-box">
                        <div className="pay-success-icon">🎉</div>
                        <div className="pay-success-title">Thanh toán thành công!</div>
                        <div className="pay-success-sub">Đang chuyển đến trang hóa đơn...</div>
                    </div>
                </div>
            )}

            <div className="pay-root">
                <div className="pay-hero">
                    <div className="pay-hero-bg" />
                    <div className="pay-hero-title">💳 Thanh toán</div>
                    <div className="pay-hero-sub">{description}</div>
                    <div className="pay-hero-amount">{amount.toLocaleString("vi-VN")}₫</div>
                    <div className="pay-hero-desc">Mã đặt chỗ #{bookingId}</div>
                </div>

                <div className="pay-content">
                    {/* Tabs */}
                    <div className="pay-tabs">
                        {user && !isGuest && (
                            <button
                                className={`pay-tab${tab === "wallet" ? " active" : ""}`}
                                onClick={() => setTab("wallet")}
                            >
                                💰 Ví VIVU
                            </button>
                        )}
                        <button
                            className={`pay-tab${tab === "qr" ? " active" : ""}`}
                            onClick={() => setTab("qr")}
                        >
                            📱 Chuyển khoản QR
                        </button>
                    </div>

                    {/* Wallet tab */}
                    {tab === "wallet" && (
                        <div className="pay-card">
                            <div className="pay-card-title">
                                💰 Thanh toán bằng Ví VIVU
                                {!expired && timeLeft !== null && (
                                    <span style={{
                                        marginLeft: "auto", fontSize: "0.78rem", fontWeight: 700,
                                        color: safeTimeLeft <= 60 ? "#c0392b" : safeTimeLeft <= 180 ? "#b8860b" : "#00875a",
                                        background: safeTimeLeft <= 60 ? "#fff0f0" : safeTimeLeft <= 180 ? "#fffbe6" : "#e6f9f0",
                                        padding: "0.2rem 0.65rem", borderRadius: 99,
                                        border: `1px solid ${safeTimeLeft <= 60 ? "#ffcdd2" : safeTimeLeft <= 180 ? "#ffe082" : "#b7dfbb"}`,
                                    }}>
                                        ⏱ {formatTime(safeTimeLeft)}
                                    </span>
                                )}
                            </div>

                            {expired ? (
                                <div style={{
                                    background: "#fff0f0", border: "1px solid #ffcdd2",
                                    borderRadius: 12, padding: "2rem", textAlign: "center",
                                }}>
                                    <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⏰</div>
                                    <div style={{ fontWeight: 700, color: "#c0392b", marginBottom: "0.5rem" }}>
                                        Hết thời gian thanh toán (15 phút)
                                    </div>
                                    <div style={{ fontSize: "0.82rem", color: "#7b5700", marginBottom: "1.25rem" }}>
                                        Đơn đặt chỗ đã bị hủy tự động. Vui lòng đặt lại.
                                    </div>
                                    <button
                                        onClick={() => router.push("/")}
                                        style={{
                                            padding: "0.55rem 1.4rem", background: "#0052cc", color: "#fff",
                                            border: "none", borderRadius: 8, fontWeight: 700,
                                            fontSize: "0.88rem", cursor: "pointer",
                                        }}
                                    >
                                        🏠 Về trang chủ
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="pay-balance-row">
                                        <span className="pay-balance-label">Số dư ví hiện tại</span>
                                        <span className="pay-balance-value">
                                            {balance.toLocaleString("vi-VN")}₫
                                        </span>
                                    </div>

                                    <div className="pay-summary-row">
                                        <span className="pay-summary-label">Tổng thanh toán</span>
                                        <span className="pay-summary-value total">
                                            -{amount.toLocaleString("vi-VN")}₫
                                        </span>
                                    </div>
                                    <div className="pay-summary-row">
                                        <span className="pay-summary-label">Số dư sau thanh toán</span>
                                        <span className="pay-summary-value after">
                                            {(balance - amount).toLocaleString("vi-VN")}₫
                                        </span>
                                    </div>
                                    <div className="pay-summary-row" style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "#e6f9f0", borderRadius: 8 }}>
                                        <span style={{ fontSize: "0.82rem", color: "#00875a", fontWeight: 600 }}>
                                            🎁 Cashback ({(cashbackRate * 100).toFixed(1)}% · hạng {userRank})
                                        </span>
                                        <span style={{ fontSize: "0.88rem", color: "#00875a", fontWeight: 700 }}>
                                            +{cashbackAmount.toLocaleString("vi-VN")}₫
                                        </span>
                                    </div>

                                    {!sufficient && (
                                        <div className="pay-insufficient" style={{ marginTop: "1rem" }}>
                                            ⚠️ Số dư ví không đủ. Bạn cần nạp thêm{" "}
                                            <strong>{(amount - balance).toLocaleString("vi-VN")}₫</strong> để thanh toán.{" "}
                                            <span
                                                style={{ color: "#0052cc", cursor: "pointer", textDecoration: "underline" }}
                                                onClick={() => router.push("/profile/wallet")}
                                            >
                                                Nạp tiền ngay
                                            </span>
                                        </div>
                                    )}

                                    <button
                                        className="pay-btn"
                                        style={{ marginTop: "1.25rem" }}
                                        disabled={!sufficient || paying}
                                        onClick={handlePayWallet}
                                    >
                                        {paying ? (
                                            <><div className="pay-spinner" /> Đang xử lý...</>
                                        ) : (
                                            "✅ Xác nhận thanh toán"
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* QR tab */}
                    {tab === "qr" && (
                        <div className="pay-card">
                            <div className="pay-card-title">
                                📱 Quét QR để thanh toán
                                {!qrExpired && timeLeft !== null && (
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

                            {/* Checkbox dùng ví — ẩn với guest */}
                            {!isGuest && (
                            <label
                                className={`pay-use-wallet${useWallet ? " checked" : ""}`}
                                onClick={() => setUseWallet(v => !v)}
                            >
                                <input
                                    type="checkbox"
                                    checked={useWallet}
                                    onChange={() => setUseWallet(v => !v)}
                                    onClick={e => e.stopPropagation()}
                                />
                                <span className="pay-use-wallet-label">💰 Sử dụng số dư Ví VIVU</span>
                                <span className="pay-use-wallet-balance">{balance.toLocaleString("vi-VN")}₫</span>
                            </label>
                            )}

                            {/* Breakdown khi dùng ví */}
                            {!isGuest && useWallet && (
                                <div className="pay-breakdown">
                                    <div className="pay-breakdown-row">
                                        <span className="pay-breakdown-label">Tổng đặt chỗ</span>
                                        <span className="pay-breakdown-value">{amount.toLocaleString("vi-VN")}₫</span>
                                    </div>
                                    <div className="pay-breakdown-row">
                                        <span className="pay-breakdown-label">Trừ từ ví</span>
                                        <span className="pay-breakdown-value" style={{ color: "#00875a" }}>
                                            -{walletDeduction.toLocaleString("vi-VN")}₫
                                        </span>
                                    </div>
                                    <hr className="pay-breakdown-divider" />
                                    <div className="pay-breakdown-row">
                                        <span className="pay-breakdown-total-label">Cần chuyển khoản</span>
                                        <span className="pay-breakdown-total-value">{qrAmount.toLocaleString("vi-VN")}₫</span>
                                    </div>
                                </div>
                            )}

                            {/* Cashback info — ẩn với guest */}
                            {!isGuest && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#e6f9f0", borderRadius: 8, padding: "0.5rem 0.75rem", marginBottom: "0.75rem" }}>
                                <span style={{ fontSize: "0.82rem", color: "#00875a", fontWeight: 600 }}>
                                    🎁 Cashback ({(cashbackRate * 100).toFixed(1)}% · hạng {userRank})
                                </span>
                                <span style={{ fontSize: "0.88rem", color: "#00875a", fontWeight: 700 }}>
                                    +{cashbackAmount.toLocaleString("vi-VN")}₫
                                </span>
                            </div>
                            )}

                            {/* QR hoặc thông báo đủ tiền */}
                            {qrAmount === 0 ? (
                                <div className="pay-qr-zero">
                                    <div className="pay-qr-zero-icon">🎉</div>
                                    <div className="pay-qr-zero-text">Ví đủ để thanh toán toàn bộ!<br />Không cần chuyển khoản thêm.</div>
                                </div>
                            ) : qrExpired ? (
                                <div style={{
                                    background: "#fff0f0", border: "1px solid #ffcdd2",
                                    borderRadius: 12, padding: "2rem", textAlign: "center",
                                    marginBottom: "1rem",
                                }}>
                                    <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⏰</div>
                                    <div style={{ fontWeight: 700, color: "#c0392b", marginBottom: "0.5rem" }}>
                                        Hết thời gian thanh toán (15 phút)
                                    </div>
                                    <div style={{ fontSize: "0.82rem", color: "#7b5700", marginBottom: "1.25rem" }}>
                                        Đơn đặt chỗ đã bị hủy tự động. Vui lòng đặt lại.
                                    </div>
                                    <button
                                        onClick={() => router.push("/")}
                                        style={{
                                            padding: "0.55rem 1.4rem", background: "#0052cc", color: "#fff",
                                            border: "none", borderRadius: 8, fontWeight: 700,
                                            fontSize: "0.88rem", cursor: "pointer",
                                        }}
                                    >
                                        🏠 Về trang chủ
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="pay-qr-wrap">
                                        <Image
                                            src={qrUrl}
                                            alt="QR thanh toán"
                                            width={220} height={220}
                                            style={{ borderRadius: 8 }}
                                            unoptimized
                                        />
                                    </div>

                                    <div className="pay-info-row">
                                        <span className="pay-info-label">Ngân hàng</span>
                                        <span className="pay-info-value">{BANK_ID}</span>
                                    </div>
                                    <div className="pay-info-row">
                                        <span className="pay-info-label">Số tài khoản</span>
                                        <span className="pay-info-value">{ACCOUNT_NO}</span>
                                    </div>
                                    <div className="pay-info-row">
                                        <span className="pay-info-label">Chủ tài khoản</span>
                                        <span className="pay-info-value">{ACCOUNT_NAME}</span>
                                    </div>
                                    <div className="pay-info-row">
                                        <span className="pay-info-label">Số tiền cần CK</span>
                                        <span className="pay-info-value" style={{ color: "#0052cc", fontWeight: 700 }}>
                                            {qrAmount.toLocaleString("vi-VN")}₫
                                        </span>
                                    </div>
                                    <div className="pay-info-row">
                                        <span className="pay-info-label" style={{ color: "#c0392b", fontWeight: 600 }}>
                                            ⚠ Nội dung CK
                                        </span>
                                        <span className="pay-info-value" style={{ color: "#0052cc", fontWeight: 700 }}>
                                            VIVU {user?.user_id} BOOKING {bookingId}
                                        </span>
                                    </div>
                                </>
                            )}

                            <div className="pay-warning" style={{ marginTop: "1rem" }}>
                                ⚠️ <strong>Lưu ý:</strong>{" "}
                                {useWallet && walletDeduction > 0
                                    ? `Số dư ví (${walletDeduction.toLocaleString("vi-VN")}₫) sẽ được trừ tự động khi xác nhận.`
                                    : "Nhập đúng nội dung chuyển khoản để hệ thống tự động xác nhận đặt chỗ."}
                            </div>

                            <button
                                className="pay-btn"
                                disabled={checking || qrExpired}
                                onClick={handleQrConfirm}
                            >
                                {checking ? (
                                    <><div className="pay-spinner" /> Đang xử lý...</>
                                ) : (
                                    qrAmount === 0 ? "✅ Xác nhận thanh toán bằng ví" : "✅ Tôi đã chuyển khoản xong"
                                )}
                            </button>

                            {checking && !(useWallet && walletDeduction > 0) && (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.75rem" }}>
                                    <p style={{ fontSize: "0.8rem", color: "#6b8cbf", margin: 0 }}>
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
                                    background: checkMsg.startsWith("✅") ? "#d4edda" : checkMsg.startsWith("❌") ? "#fff0f0" : "#fff8e1",
                                    color: checkMsg.startsWith("✅") ? "#00875a" : checkMsg.startsWith("❌") ? "#c0392b" : "#7b5700",
                                    border: `1px solid ${checkMsg.startsWith("✅") ? "#b7dfbb" : checkMsg.startsWith("❌") ? "#ffcdd2" : "#ffe082"}`,
                                }}>
                                    {checkMsg}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
