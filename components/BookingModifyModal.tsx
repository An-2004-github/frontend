"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

const BANK_ID    = "MB";
const ACCOUNT_NO = "0944934501";
const ACCOUNT_NAME = "LE HOANG AN";

/* ── Types ─────────────────────────────────────────────────── */
interface BookingItem {
    entity_type: string;
    entity_id:   number;
    price:       number;
    check_in_date?:  string;
    check_out_date?: string;
}

interface BookingDetail {
    booking_id:   number;
    final_amount: number;
    items:        BookingItem[];
    user?:        { full_name: string; email: string };
}

interface Props {
    booking:  BookingDetail;
    mode:     "reschedule" | "cancel";
    onClose:  () => void;
    onDone:   () => void;
}

const fmt = (n: number) => n?.toLocaleString("vi-VN") + "₫";
const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString("vi-VN"); } catch { return s; }
};
const fmtDT = (s: string) => {
    try { return new Date(s).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }); } catch { return s; }
};

/* ── Main component ─────────────────────────────────────────── */
export default function BookingModifyModal({ booking, mode, onClose, onDone }: Props) {
    const item         = booking.items?.[0];
    const entityType   = item?.entity_type ?? "";
    const isRoom       = entityType === "room";
    const isTransport  = entityType === "flight" || entityType === "bus";
    const isReschedule = mode === "reschedule";
    const isCancel     = mode === "cancel";

    const [step, setStep] = useState(1);
    const [agreed, setAgreed] = useState(false);

    // Step 2 – new dates
    const [newCheckIn,  setNewCheckIn]  = useState(item?.check_in_date?.slice(0, 10)  ?? "");
    const [newCheckOut, setNewCheckOut] = useState(item?.check_out_date?.slice(0, 10) ?? "");
    const [newDate,     setNewDate]     = useState(""); // for flight/bus

    // Step 3 – options
    const [loadingOpts, setLoadingOpts] = useState(false);
    const [optionsData, setOptionsData] = useState<Record<string, unknown> | null>(null);
    const [selectedOpt, setSelectedOpt] = useState<Record<string, unknown> | null>(null);

    // Step 4 – confirm
    const [refundMethod, setRefundMethod] = useState<"wallet" | "bank">("wallet");
    const [bankInfo,     setBankInfo]     = useState("");
    const [submitting,   setSubmitting]   = useState(false);
    const [result,       setResult]       = useState<{ status: string; message: string; mod_id?: number; price_diff?: number } | null>(null);
    const [cancelInfo,   setCancelInfo]   = useState<{ cancel_fee: number; refund_amount: number } | null>(null);

    // For pay extra (wallet)
    const [walletBalance, setWalletBalance] = useState(0);
    const [payingExtra,   setPayingExtra]   = useState(false);
    const [extraMsg,      setExtraMsg]      = useState("");
    const [payTab,        setPayTab]        = useState<"wallet" | "qr">("wallet");
    const [qrChecking,    setQrChecking]    = useState(false);
    const [qrMsg,         setQrMsg]         = useState<string | null>(null);
    const [qrTimeLeft,    setQrTimeLeft]    = useState(15 * 60);

    const { user } = useAuthStore();

    useEffect(() => {
        api.get("/api/wallet/balance").then(r => setWalletBalance(r.data.balance)).catch(() => {});
    }, []);

    /* ── fetch reschedule options ────────────────────────────── */
    const fetchOptions = async () => {
        setLoadingOpts(true);
        setOptionsData(null);
        try {
            const params: Record<string, string> = {};
            if (isRoom)      { params.check_in = newCheckIn; params.check_out = newCheckOut; }
            if (isTransport) { params.date = newDate; }
            const res = await api.get(`/api/bookings/${booking.booking_id}/reschedule-options`, { params });
            setOptionsData(res.data);
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            alert(msg || "Không thể tải danh sách");
        } finally {
            setLoadingOpts(false);
        }
    };

    /* ── submit reschedule ───────────────────────────────────── */
    const submitReschedule = async () => {
        if (!selectedOpt) return;
        setSubmitting(true);
        try {
            const newPrice = isRoom
                ? Number((selectedOpt as { total_price: number }).total_price)
                : Number((selectedOpt as { price: number }).price);

            const body: Record<string, unknown> = { new_price: newPrice, refund_method: refundMethod, bank_info: bankInfo || null };
            if (isRoom) {
                body.new_check_in  = newCheckIn;
                body.new_check_out = newCheckOut;
                body.new_entity_id = (selectedOpt as { room_type_id: number }).room_type_id;
            } else {
                body.new_entity_id = entityType === "flight"
                    ? (selectedOpt as { flight_id: number }).flight_id
                    : (selectedOpt as { bus_id: number }).bus_id;
            }

            const res = await api.post(`/api/bookings/${booking.booking_id}/reschedule`, body);
            setResult(res.data);
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            alert(msg || "Không thể gửi yêu cầu");
        } finally {
            setSubmitting(false);
        }
    };

    /* ── pay extra via wallet ────────────────────────────────── */
    const payExtra = async () => {
        if (!result?.mod_id) return;
        setPayingExtra(true);
        setExtraMsg("");
        try {
            const res = await api.post(`/api/bookings/modifications/${result.mod_id}/pay-extra`);
            setResult({ status: "confirmed", message: res.data.message });
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setExtraMsg(msg || "Thanh toán thất bại");
        } finally {
            setPayingExtra(false);
        }
    };

    /* ── submit cancel ───────────────────────────────────────── */
    const submitCancel = async () => {
        setSubmitting(true);
        try {
            const res = await api.post(`/api/bookings/${booking.booking_id}/cancel`, {
                refund_method: refundMethod,
                bank_info: bankInfo || null,
            });
            setCancelInfo({ cancel_fee: res.data.cancel_fee, refund_amount: res.data.refund_amount });
            setResult({ status: "cancelled", message: res.data.message });
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            alert(msg || "Không thể hủy đặt chỗ");
        } finally {
            setSubmitting(false);
        }
    };

    /* ── QR timer ───────────────────────────────────────────── */
    useEffect(() => {
        if (payTab !== "qr" || !result?.mod_id) return;
        setQrTimeLeft(15 * 60);
    }, [payTab, result?.mod_id]);

    useEffect(() => {
        if (payTab !== "qr" || !result?.mod_id || qrTimeLeft <= 0) return;
        const id = setInterval(() => setQrTimeLeft(t => Math.max(0, t - 1)), 1000);
        return () => clearInterval(id);
    }, [payTab, result?.mod_id, qrTimeLeft]);

    /* ── QR polling ──────────────────────────────────────────── */
    useEffect(() => {
        if (!qrChecking || !result?.mod_id) return;
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            try {
                const res = await api.get(`/api/bookings/my-modifications`);
                const mod = res.data.find((m: Record<string, unknown>) => m.mod_id === result.mod_id);
                if (mod?.status === "approved") {
                    setQrChecking(false);
                    setQrMsg("✅ Thanh toán thành công!");
                    clearInterval(interval);
                    setTimeout(() => setResult({ status: "confirmed", message: "Đổi lịch thành công!" }), 1500);
                }
            } catch { /* ignore */ }
            if (attempts >= 24) {
                setQrChecking(false);
                setQrMsg("⏱ Không tìm thấy giao dịch. Vui lòng kiểm tra lại.");
                clearInterval(interval);
            }
        }, 5000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qrChecking]);

    /* ── step validation ─────────────────────────────────────── */
    const canStep2 = agreed;
    const canStep3 = isReschedule && (isRoom ? (newCheckIn && newCheckOut && newCheckIn < newCheckOut) : !!newDate);
    const canStep4 = !!selectedOpt;

    const POLICY_RESCHEDULE_ROOM = `Chính sách đổi lịch phòng:
• Đổi lịch miễn phí nếu ngày mới cách ngày nhận phòng hiện tại > 48 giờ.
• Nếu giá phòng mới cao hơn, bạn cần thanh toán thêm phần chênh lệch.
• Nếu giá phòng mới thấp hơn, phần chênh lệch sẽ được hoàn lại trong 2–5 ngày.`;

    const POLICY_RESCHEDULE_TRANSPORT = `Chính sách đổi lịch vé:
• Chỉ được đổi sang cùng hãng, cùng tuyến đường.
• Nếu vé mới đắt hơn, bạn cần thanh toán thêm phần chênh lệch.
• Nếu vé mới rẻ hơn, phần chênh lệch sẽ được hoàn lại trong 2–5 ngày.`;

    const POLICY_CANCEL_ROOM = `Chính sách hủy phòng:
• Hủy trước 3 ngày so với ngày nhận phòng: hoàn 100%.
• Hủy trong vòng 1–3 ngày: phí hủy 30%, hoàn 70%.
• Hủy trong ngày: không hoàn tiền.`;

    const POLICY_CANCEL_TRANSPORT = `Chính sách hủy vé:
• Hủy trước 3 ngày so với ngày khởi hành: phí hủy 10%, hoàn 90%.
• Hủy trong vòng 1–3 ngày: phí hủy 30%, hoàn 70%.
• Hủy trong ngày hoặc sau giờ khởi hành: không hoàn tiền.`;

    const policy = isReschedule
        ? (isRoom ? POLICY_RESCHEDULE_ROOM : POLICY_RESCHEDULE_TRANSPORT)
        : (isRoom ? POLICY_CANCEL_ROOM : POLICY_CANCEL_TRANSPORT);

    const title = isReschedule
        ? (isRoom ? "🔄 Đổi lịch phòng" : `🔄 Đổi lịch ${entityType === "flight" ? "chuyến bay" : "xe khách"}`)
        : (isRoom ? "❌ Hủy phòng" : `❌ Hủy ${entityType === "flight" ? "vé máy bay" : "vé xe khách"}`);

    /* ── success / done state ────────────────────────────────── */
    if (result && (result.status === "confirmed" || result.status === "cancelled")) {
        return (
            <Overlay onClose={onClose}>
                <div style={{ textAlign: "center", padding: "1rem 0" }}>
                    <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>
                        {result.status === "cancelled" ? "❌" : "✅"}
                    </div>
                    <div style={{ fontFamily: "Nunito, sans-serif", fontSize: "1.2rem", fontWeight: 800, color: "#1a3c6b", marginBottom: "0.5rem" }}>
                        {result.status === "cancelled" ? "Đã hủy đặt chỗ!" : "Thành công!"}
                    </div>
                    <div style={{ color: "#6b8cbf", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                        {result.message}
                    </div>
                    {result.status === "cancelled" && cancelInfo && (
                        <div style={{ background: "#f8faff", borderRadius: 10, padding: "1rem", marginBottom: "1rem", fontSize: "0.88rem", textAlign: "left" }}>
                            {cancelInfo.cancel_fee > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", color: "#c0392b" }}>
                                    <span>Phí hủy:</span><strong>-{fmt(cancelInfo.cancel_fee)}</strong>
                                </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", color: "#00875a", fontWeight: 700 }}>
                                <span>Số tiền hoàn lại:</span><strong>{fmt(cancelInfo.refund_amount)}</strong>
                            </div>
                        </div>
                    )}
                    <button onClick={onDone} style={primaryBtn}>Xong</button>
                </div>
            </Overlay>
        );
    }

    /* ── needs_payment state ─────────────────────────────────── */
    if (result?.status === "needs_payment") {
        const diff = result.price_diff ?? 0;
        const sufficient = walletBalance >= diff;
        const qrExpired = qrTimeLeft <= 0;
        const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${Math.ceil(diff)}&addInfo=VIVU%20${user?.user_id ?? ""}%20MOD%20${result.mod_id}&accountName=${ACCOUNT_NAME}`;
        const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

        return (
            <Overlay onClose={onClose}>
                <h3 style={modalTitle}>💳 Thanh toán thêm</h3>

                {/* Amount badge */}
                <div style={{ background: "linear-gradient(135deg,#003580,#0052cc)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}>Cần thanh toán thêm</span>
                    <span style={{ color: "#fff", fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: "1.4rem" }}>{fmt(diff)}</span>
                </div>

                {/* Tab switcher */}
                <div style={{ display: "flex", background: "#f0f4ff", borderRadius: 10, padding: 3, marginBottom: "1rem" }}>
                    {(["wallet", "qr"] as const).map(t => (
                        <button key={t} onClick={() => setPayTab(t)} style={{
                            flex: 1, padding: "0.6rem", border: "none", borderRadius: 8,
                            fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", transition: "all 0.15s",
                            background: payTab === t ? "#fff" : "transparent",
                            color: payTab === t ? "#0052cc" : "#6b8cbf",
                            boxShadow: payTab === t ? "0 1px 6px rgba(0,82,204,.12)" : "none",
                        }}>
                            {t === "wallet" ? "💰 Thanh toán bằng ví" : "📱 Chuyển khoản QR"}
                        </button>
                    ))}
                </div>

                {/* Wallet tab */}
                {payTab === "wallet" && (
                    <>
                        <div style={infoBox}>
                            <InfoRow label="Số dư ví hiện tại"    value={fmt(walletBalance)} />
                            <InfoRow label="Số tiền cần thêm"      value={fmt(diff)} valueColor="#0052cc" />
                            <InfoRow label="Số dư sau thanh toán"  value={fmt(walletBalance - diff)} valueColor={sufficient ? "#00875a" : "#c0392b"} />
                        </div>
                        {!sufficient && (
                            <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 10, padding: "0.85rem", margin: "0.75rem 0", fontSize: "0.83rem", color: "#c0392b" }}>
                                ⚠️ Số dư ví không đủ. Cần nạp thêm <strong>{fmt(diff - walletBalance)}</strong>.
                            </div>
                        )}
                        {extraMsg && <div style={{ color: "#c0392b", fontSize: "0.85rem", marginTop: "0.5rem" }}>{extraMsg}</div>}
                        <button onClick={payExtra} disabled={!sufficient || payingExtra}
                            style={{ ...primaryBtn, marginTop: "1rem", opacity: (!sufficient || payingExtra) ? 0.5 : 1 }}>
                            {payingExtra ? "Đang xử lý..." : `✅ Xác nhận thanh toán ${fmt(diff)}`}
                        </button>
                    </>
                )}

                {/* QR tab */}
                {payTab === "qr" && (
                    <>
                        {qrExpired ? (
                            <div style={{ textAlign: "center", background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 12, padding: "2rem", marginBottom: "1rem" }}>
                                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏰</div>
                                <div style={{ fontWeight: 700, color: "#c0392b", marginBottom: "0.75rem" }}>Mã QR đã hết hạn</div>
                                <button onClick={() => setQrTimeLeft(15 * 60)} style={{ padding: "0.5rem 1.2rem", background: "#0052cc", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
                                    🔄 Tạo lại
                                </button>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: "flex", justifyContent: "center", background: "#f0f4ff", borderRadius: 12, padding: "1rem", marginBottom: "1rem" }}>
                                    <Image src={qrUrl} alt="QR thanh toán thêm" width={200} height={200} style={{ borderRadius: 8 }} unoptimized />
                                </div>
                                <div style={infoBox}>
                                    <InfoRow label="Ngân hàng"    value={BANK_ID} />
                                    <InfoRow label="Số tài khoản" value={ACCOUNT_NO} />
                                    <InfoRow label="Số tiền"      value={fmt(diff)} valueColor="#0052cc" />
                                    <InfoRow label="⚠ Nội dung CK" value={`VIVU ${user?.user_id ?? ""} MOD ${result.mod_id}`} valueColor="#c0392b" />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0.75rem 0", fontSize: "0.82rem" }}>
                                    <span style={{ color: "#6b8cbf" }}>⏱ Mã QR hết hạn sau</span>
                                    <span style={{ fontWeight: 700, color: qrTimeLeft <= 60 ? "#c0392b" : "#00875a" }}>{formatTime(qrTimeLeft)}</span>
                                </div>
                            </>
                        )}

                        {qrMsg && (
                            <div style={{ padding: "0.75rem 1rem", borderRadius: 10, marginBottom: "0.75rem", fontSize: "0.88rem", textAlign: "center",
                                background: qrMsg.startsWith("✅") ? "#d4edda" : "#fff8e1",
                                color: qrMsg.startsWith("✅") ? "#00875a" : "#7b5700",
                                border: `1px solid ${qrMsg.startsWith("✅") ? "#b7dfbb" : "#ffe082"}`,
                            }}>
                                {qrMsg}
                            </div>
                        )}

                        <button disabled={qrExpired || qrChecking} onClick={() => { setQrChecking(true); setQrMsg(null); }}
                            style={{ ...primaryBtn, opacity: (qrExpired || qrChecking) ? 0.6 : 1 }}>
                            {qrChecking
                                ? <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginRight: 8 }} />Đang kiểm tra...</>
                                : "✅ Tôi đã chuyển khoản xong"}
                        </button>
                        {qrChecking && (
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", fontSize: "0.8rem", color: "#6b8cbf" }}>
                                <span>Đang kiểm tra (tối đa 2 phút)...</span>
                                <button onClick={() => { setQrChecking(false); setQrMsg(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b8cbf", textDecoration: "underline", fontSize: "0.8rem" }}>Hủy</button>
                            </div>
                        )}
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </>
                )}

                <button onClick={onClose} style={{ ...outlineBtn, marginTop: "0.75rem", width: "100%", textAlign: "center" }}>Hủy bỏ</button>
            </Overlay>
        );
    }

    /* ── CANCEL FLOW ─────────────────────────────────────────── */
    if (isCancel) {
        const totalPrice = booking.final_amount;
        return (
            <Overlay onClose={onClose}>
                <h3 style={modalTitle}>{title}</h3>
                <StepBar current={step} total={3} />

                {step === 1 && (
                    <>
                        <PolicyBox text={policy} />
                        <label style={checkLabel}>
                            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ accentColor: "#0052cc" }} />
                            <span>Tôi đã đọc và đồng ý với chính sách hủy</span>
                        </label>
                        <button disabled={!canStep2} onClick={() => setStep(2)} style={{ ...primaryBtn, opacity: canStep2 ? 1 : 0.5 }}>
                            Tiếp tục →
                        </button>
                    </>
                )}

                {step === 2 && (
                    <>
                        <p style={sectionLabel}>📋 Thông tin hủy</p>
                        <div style={infoBox}>
                            <InfoRow label="Dịch vụ" value={booking.booking_id ? `#${booking.booking_id}` : "—"} />
                            <InfoRow label="Số tiền đã thanh toán" value={fmt(totalPrice)} />
                            {isRoom && item?.check_in_date && (
                                <InfoRow label="Ngày nhận phòng" value={fmtDate(item.check_in_date)} />
                            )}
                            {isTransport && item?.check_in_date && (
                                <InfoRow label="Ngày khởi hành" value={fmtDate(item.check_in_date)} />
                            )}
                        </div>

                        <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 10, padding: "1rem", margin: "0.75rem 0", fontSize: "0.85rem", color: "#7b5700", lineHeight: 1.6 }}>
                            ⚠️ Phí hủy sẽ được tính tự động theo chính sách. Số tiền hoàn lại sẽ được xử lý trong 2–5 ngày.
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button onClick={() => setStep(1)} style={outlineBtn}>← Quay lại</button>
                            <button onClick={() => setStep(3)} style={{ ...primaryBtn, flex: 1 }}>Tiếp tục →</button>
                        </div>
                    </>
                )}

                {step === 3 && (
                    <>
                        <p style={sectionLabel}>💰 Chọn phương thức hoàn tiền</p>
                        <RefundMethodPicker
                            value={refundMethod}
                            onChange={setRefundMethod}
                            bankInfo={bankInfo}
                            onBankInfoChange={setBankInfo}
                        />
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                            <button onClick={() => setStep(2)} style={outlineBtn}>← Quay lại</button>
                            <button
                                onClick={submitCancel}
                                disabled={submitting || (refundMethod === "bank" && !bankInfo.trim())}
                                style={{ ...primaryBtn, flex: 1, background: "linear-gradient(135deg,#c0392b,#e74c3c)", opacity: submitting ? 0.6 : 1 }}
                            >
                                {submitting ? "Đang xử lý..." : "❌ Xác nhận hủy"}
                            </button>
                        </div>
                    </>
                )}
            </Overlay>
        );
    }

    /* ── RESCHEDULE FLOW ─────────────────────────────────────── */
    const totalSteps = 4;
    return (
        <Overlay onClose={onClose}>
            <h3 style={modalTitle}>{title}</h3>
            <StepBar current={step} total={totalSteps} />

            {/* Step 1: Policy */}
            {step === 1 && (
                <>
                    <PolicyBox text={policy} />
                    <label style={checkLabel}>
                        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ accentColor: "#0052cc" }} />
                        <span>Tôi đã đọc và đồng ý với chính sách đổi lịch</span>
                    </label>
                    <button disabled={!canStep2} onClick={() => setStep(2)} style={{ ...primaryBtn, opacity: canStep2 ? 1 : 0.5 }}>
                        Tiếp tục →
                    </button>
                </>
            )}

            {/* Step 2: New dates */}
            {step === 2 && (
                <>
                    <p style={sectionLabel}>📅 {isRoom ? "Chọn ngày mới" : "Chọn ngày khởi hành mới"}</p>
                    {isRoom ? (
                        <div style={{ display: "flex", gap: "0.75rem", flexDirection: "column" }}>
                            <label style={fieldLabel}>
                                Ngày nhận phòng
                                <input type="date" value={newCheckIn} min={new Date().toISOString().slice(0, 10)}
                                    onChange={e => setNewCheckIn(e.target.value)} style={dateInput} />
                            </label>
                            <label style={fieldLabel}>
                                Ngày trả phòng
                                <input type="date" value={newCheckOut} min={newCheckIn || new Date().toISOString().slice(0, 10)}
                                    onChange={e => setNewCheckOut(e.target.value)} style={dateInput} />
                            </label>
                        </div>
                    ) : (
                        <label style={fieldLabel}>
                            Ngày khởi hành mới
                            <input type="date" value={newDate} min={new Date().toISOString().slice(0, 10)}
                                onChange={e => setNewDate(e.target.value)} style={dateInput} />
                        </label>
                    )}
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                        <button onClick={() => setStep(1)} style={outlineBtn}>← Quay lại</button>
                        <button
                            disabled={!canStep3}
                            onClick={async () => { await fetchOptions(); setStep(3); }}
                            style={{ ...primaryBtn, flex: 1, opacity: canStep3 ? 1 : 0.5 }}
                        >
                            Tìm lịch trống →
                        </button>
                    </div>
                </>
            )}

            {/* Step 3: Available options */}
            {step === 3 && (
                <>
                    <p style={sectionLabel}>
                        {isRoom ? "🏨 Phòng trống" : entityType === "flight" ? "✈️ Chuyến bay" : "🚌 Chuyến xe"}
                        {optionsData && ` (${(optionsData.options as unknown[])?.length ?? 0} lựa chọn)`}
                    </p>
                    {loadingOpts ? (
                        <Spinner />
                    ) : (
                        <>
                            {(!optionsData?.options || (optionsData.options as unknown[]).length === 0) ? (
                                <div style={{ textAlign: "center", padding: "2rem", color: "#6b8cbf" }}>
                                    Không tìm thấy lịch trống cho ngày này.
                                </div>
                            ) : (
                                <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                                    {(optionsData.options as Record<string, unknown>[]).map((opt, idx) => {
                                        const isSelected = selectedOpt === opt;
                                        const newPrice = isRoom
                                            ? Number((opt as { total_price: number }).total_price)
                                            : Number((opt as { price: number }).price);
                                        const oldPrice = Number(optionsData.old_price || 0);
                                        const diff = newPrice - oldPrice;

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedOpt(opt)}
                                                style={{
                                                    border: `2px solid ${isSelected ? "#0052cc" : "#e8f0fe"}`,
                                                    borderRadius: 10, padding: "0.85rem",
                                                    cursor: "pointer", background: isSelected ? "#eef4ff" : "#fff",
                                                    transition: "all 0.15s",
                                                }}
                                            >
                                                {isRoom ? (
                                                    <RoomOption opt={opt as Record<string, unknown>} nights={Number(optionsData.nights || 1)} diff={diff} />
                                                ) : (
                                                    <TransportOption opt={opt as Record<string, unknown>} entityType={entityType} diff={diff} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                                <button onClick={() => setStep(2)} style={outlineBtn}>← Quay lại</button>
                                <button
                                    disabled={!canStep4}
                                    onClick={() => setStep(4)}
                                    style={{ ...primaryBtn, flex: 1, opacity: canStep4 ? 1 : 0.5 }}
                                >
                                    Tiếp tục →
                                </button>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* Step 4: Confirm + price comparison */}
            {step === 4 && selectedOpt && optionsData && (
                <>
                    <p style={sectionLabel}>✅ Xác nhận đổi lịch</p>
                    {(() => {
                        const newPrice = isRoom
                            ? Number((selectedOpt as { total_price: number }).total_price)
                            : Number((selectedOpt as { price: number }).price);
                        const oldPrice = Number(optionsData.old_price || 0);
                        const diff = Math.round(newPrice - oldPrice);

                        return (
                            <>
                                <div style={infoBox}>
                                    <InfoRow label="Giá cũ" value={fmt(oldPrice)} />
                                    <InfoRow label="Giá mới" value={fmt(newPrice)} />
                                    {diff !== 0 && (
                                        <InfoRow
                                            label={diff > 0 ? "Cần thanh toán thêm" : "Được hoàn lại"}
                                            value={fmt(Math.abs(diff))}
                                            valueColor={diff > 0 ? "#c0392b" : "#00875a"}
                                        />
                                    )}
                                    {diff === 0 && <InfoRow label="Chênh lệch" value="Không đổi" valueColor="#00875a" />}
                                </div>

                                {diff < 0 && (
                                    <>
                                        <p style={{ ...sectionLabel, marginTop: "1rem" }}>💰 Phương thức hoàn tiền</p>
                                        <RefundMethodPicker
                                            value={refundMethod}
                                            onChange={setRefundMethod}
                                            bankInfo={bankInfo}
                                            onBankInfoChange={setBankInfo}
                                        />
                                    </>
                                )}

                                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                                    <button onClick={() => setStep(3)} style={outlineBtn}>← Quay lại</button>
                                    <button
                                        disabled={submitting || (diff < 0 && refundMethod === "bank" && !bankInfo.trim())}
                                        onClick={submitReschedule}
                                        style={{ ...primaryBtn, flex: 1, opacity: submitting ? 0.6 : 1 }}
                                    >
                                        {submitting ? "Đang xử lý..." : diff > 0 ? "Xác nhận & thanh toán →" : "✅ Xác nhận đổi lịch"}
                                    </button>
                                </div>
                            </>
                        );
                    })()}
                </>
            )}
        </Overlay>
    );
}

/* ── Sub-components ─────────────────────────────────────────── */

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
                .bm-overlay{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1rem}
                .bm-box{background:#fff;border-radius:20px;padding:2rem;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;position:relative;font-family:'DM Sans',sans-serif;animation:popIn .25s ease}
                @keyframes popIn{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
                .bm-close{position:absolute;top:1rem;right:1rem;background:none;border:none;font-size:1.3rem;cursor:pointer;color:#6b8cbf;line-height:1}
                .bm-close:hover{color:#1a3c6b}
            `}</style>
            <div className="bm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
                <div className="bm-box">
                    <button className="bm-close" onClick={onClose}>✕</button>
                    {children}
                </div>
            </div>
        </>
    );
}

function StepBar({ current, total }: { current: number; total: number }) {
    return (
        <div style={{ display: "flex", gap: 4, marginBottom: "1.25rem" }}>
            {Array.from({ length: total }, (_, i) => (
                <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 99,
                    background: i < current ? "#0052cc" : "#e8f0fe",
                    transition: "background 0.3s",
                }} />
            ))}
        </div>
    );
}

function PolicyBox({ text }: { text: string }) {
    return (
        <div style={{ background: "#f8faff", border: "1px solid #e8f0fe", borderRadius: 10, padding: "1rem", marginBottom: "1rem", whiteSpace: "pre-line", fontSize: "0.85rem", color: "#1a3c6b", lineHeight: 1.7 }}>
            {text}
        </div>
    );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid #f0f4ff", fontSize: "0.88rem" }}>
            <span style={{ color: "#6b8cbf" }}>{label}</span>
            <span style={{ fontWeight: 600, color: valueColor ?? "#1a3c6b" }}>{value}</span>
        </div>
    );
}

function RoomOption({ opt, nights, diff }: { opt: Record<string, unknown>; nights: number; diff: number }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
                <div style={{ fontWeight: 600, color: "#1a3c6b", fontSize: "0.9rem" }}>{String(opt.name || "")}</div>
                <div style={{ fontSize: "0.78rem", color: "#6b8cbf" }}>
                    {nights} đêm — {Number(opt.price_per_night || 0).toLocaleString("vi-VN")}₫/đêm
                </div>
            </div>
            <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, color: "#0052cc", fontSize: "0.95rem" }}>
                    {Number(opt.total_price || 0).toLocaleString("vi-VN")}₫
                </div>
                {diff !== 0 && (
                    <div style={{ fontSize: "0.75rem", color: diff > 0 ? "#c0392b" : "#00875a", fontWeight: 600 }}>
                        {diff > 0 ? "+" : ""}{diff.toLocaleString("vi-VN")}₫
                    </div>
                )}
            </div>
        </div>
    );
}

function TransportOption({ opt, entityType, diff }: { opt: Record<string, unknown>; entityType: string; diff: number }) {
    const depart = opt.depart_time ? fmtDT(String(opt.depart_time)) : "—";
    const arrive = opt.arrive_time ? fmtDT(String(opt.arrive_time)) : "—";
    const seats  = Number(opt.available_seats ?? 0);
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "#1a3c6b", fontSize: "0.88rem" }}>
                    {entityType === "flight" ? String(opt.airline || "") : String(opt.company || "")}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#6b8cbf", marginTop: 2 }}>
                    🛫 {depart} — 🛬 {arrive}
                </div>
                <div style={{ fontSize: "0.75rem", color: seats > 0 ? "#00875a" : "#c0392b", marginTop: 2 }}>
                    {seats > 0 ? `${seats} chỗ trống` : "Hết chỗ"}
                </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, color: "#0052cc", fontSize: "0.95rem" }}>
                    {Number(opt.price || 0).toLocaleString("vi-VN")}₫
                </div>
                {diff !== 0 && (
                    <div style={{ fontSize: "0.75rem", color: diff > 0 ? "#c0392b" : "#00875a", fontWeight: 600 }}>
                        {diff > 0 ? "+" : ""}{diff.toLocaleString("vi-VN")}₫
                    </div>
                )}
            </div>
        </div>
    );
}

function RefundMethodPicker({ value, onChange, bankInfo, onBankInfoChange }: {
    value: "wallet" | "bank";
    onChange: (v: "wallet" | "bank") => void;
    bankInfo: string;
    onBankInfoChange: (v: string) => void;
}) {
    return (
        <div>
            {(["wallet", "bank"] as const).map(m => (
                <div
                    key={m}
                    onClick={() => onChange(m)}
                    style={{
                        display: "flex", alignItems: "center", gap: "0.75rem",
                        padding: "0.85rem", borderRadius: 10, marginBottom: "0.5rem",
                        border: `1.5px solid ${value === m ? "#0052cc" : "#e8f0fe"}`,
                        background: value === m ? "#eef4ff" : "#fff",
                        cursor: "pointer",
                    }}
                >
                    <input type="radio" checked={value === m} onChange={() => onChange(m)} style={{ accentColor: "#0052cc" }} />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1a3c6b" }}>
                            {m === "wallet" ? "💰 Hoàn về Ví VIVU" : "🏦 Hoàn về tài khoản ngân hàng"}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#6b8cbf" }}>
                            {m === "wallet" ? "Tự động cộng vào ví khi được duyệt" : "Cần nhập thông tin tài khoản bên dưới"}
                        </div>
                    </div>
                </div>
            ))}
            {value === "bank" && (
                <textarea
                    placeholder="Nhập thông tin ngân hàng: Tên ngân hàng, Số tài khoản, Chủ tài khoản"
                    value={bankInfo}
                    onChange={e => onBankInfoChange(e.target.value)}
                    rows={3}
                    style={{
                        width: "100%", padding: "0.75rem", borderRadius: 10,
                        border: "1.5px solid #c8d8ff", fontSize: "0.85rem",
                        fontFamily: "DM Sans, sans-serif", resize: "vertical",
                        boxSizing: "border-box",
                    }}
                />
            )}
        </div>
    );
}

function Spinner() {
    return (
        <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
            <div style={{ width: 32, height: 32, border: "3px solid #e8f0fe", borderTopColor: "#0052cc", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

/* ── Shared styles ──────────────────────────────────────────── */
const primaryBtn: React.CSSProperties = {
    width: "100%", padding: "0.85rem", border: "none", borderRadius: 12,
    background: "linear-gradient(135deg,#0052cc,#0065ff)", color: "#fff",
    fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: "0.95rem",
    cursor: "pointer", transition: "opacity 0.15s",
};
const outlineBtn: React.CSSProperties = {
    padding: "0.85rem 1.2rem", border: "1.5px solid #c8d8ff", borderRadius: 12,
    background: "#fff", color: "#0052cc", fontWeight: 600, fontSize: "0.88rem",
    cursor: "pointer", whiteSpace: "nowrap",
};
const modalTitle: React.CSSProperties = {
    fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: "1.15rem",
    color: "#1a3c6b", margin: "0 0 1rem",
};
const sectionLabel: React.CSSProperties = {
    fontSize: "0.78rem", fontWeight: 700, color: "#6b8cbf",
    textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 0.6rem",
};
const checkLabel: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.6rem",
    padding: "0.85rem", borderRadius: 10, border: "1.5px solid #e8f0fe",
    background: "#f8faff", cursor: "pointer", margin: "0.75rem 0",
    fontSize: "0.88rem", color: "#1a3c6b",
};
const fieldLabel: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: "0.35rem",
    fontSize: "0.85rem", color: "#6b8cbf", fontWeight: 500,
};
const dateInput: React.CSSProperties = {
    padding: "0.65rem 0.9rem", borderRadius: 9, border: "1.5px solid #c8d8ff",
    fontSize: "0.9rem", color: "#1a3c6b", fontFamily: "DM Sans, sans-serif",
};
const infoBox: React.CSSProperties = {
    background: "#f8faff", borderRadius: 10, padding: "0.5rem 1rem",
    border: "1px solid #e8f0fe",
};
