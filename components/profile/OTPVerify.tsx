"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/axios";

interface Props {
    type: "email" | "phone";
    newValue: string;
    onSuccess: (message: string) => void;
    onCancel: () => void;
}

export default function OTPVerify({ type, newValue, onSuccess, onCancel }: Props) {
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown resend
    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    const handleChange = (i: number, val: string) => {
        if (!/^\d*$/.test(val)) return;
        const next = [...otp];
        next[i] = val.slice(-1);
        setOtp(next);
        setError("");
        if (val && i < 5) inputs.current[i + 1]?.focus();
    };

    const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[i] && i > 0) {
            inputs.current[i - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (text.length === 6) {
            setOtp(text.split(""));
            inputs.current[5]?.focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join("");
        if (code.length < 6) { setError("Vui lòng nhập đủ 6 số"); return; }
        setLoading(true); setError("");
        try {
            const res = await api.post("/api/auth/verify-otp", { otp: code, type });
            onSuccess(res.data.message);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { detail?: string } } })
                ?.response?.data?.detail || "Mã xác nhận không hợp lệ";
            setError(msg);
            setOtp(["", "", "", "", "", ""]);
            inputs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            await api.post("/api/auth/send-otp", { type, new_value: newValue });
            setCountdown(60);
            setOtp(["", "", "", "", "", ""]);
            setError("");
            inputs.current[0]?.focus();
        } finally {
            setResending(false);
        }
    };

    return (
        <>
            <style>{`
                .otp-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.45); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 1rem; }
                .otp-modal { background: #fff; border-radius: 20px; padding: 2rem; width: 100%; max-width: 400px; box-shadow: 0 24px 60px rgba(0,0,0,0.2); text-align: center; }
                .otp-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
                .otp-title { font-family: 'Nunito',sans-serif; font-size: 1.2rem; font-weight: 800; color: #1a3c6b; margin-bottom: 0.4rem; }
                .otp-desc { font-size: 0.85rem; color: #6b8cbf; margin-bottom: 1.75rem; line-height: 1.5; }
                .otp-desc strong { color: #0052cc; }
                .otp-inputs { display: flex; gap: 0.6rem; justify-content: center; margin-bottom: 1.25rem; }
                .otp-input {
                    width: 46px; height: 56px; border-radius: 12px;
                    border: 2px solid #dde3f0; text-align: center;
                    font-size: 1.4rem; font-weight: 700; color: #1a3c6b;
                    font-family: 'Nunito',sans-serif; outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .otp-input:focus { border-color: #0052cc; box-shadow: 0 0 0 3px rgba(0,82,204,0.12); }
                .otp-input.filled { border-color: #0052cc; background: #f0f4ff; }
                .otp-error { color: #bf2600; font-size: 0.82rem; margin-bottom: 1rem; background: #fff0ee; padding: 0.5rem 0.75rem; border-radius: 8px; }
                .otp-btn { width: 100%; padding: 0.85rem; background: linear-gradient(135deg,#0052cc,#0065ff); color: #fff; border: none; border-radius: 10px; font-family: 'Nunito',sans-serif; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: opacity 0.15s; margin-bottom: 0.75rem; }
                .otp-btn:hover:not(:disabled) { opacity: 0.9; }
                .otp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .otp-resend { font-size: 0.82rem; color: #6b8cbf; }
                .otp-resend button { color: #0052cc; background: none; border: none; cursor: pointer; font-size: 0.82rem; font-weight: 600; text-decoration: underline; }
                .otp-cancel { margin-top: 0.5rem; font-size: 0.82rem; color: #6b8cbf; background: none; border: none; cursor: pointer; text-decoration: underline; }
            `}</style>

            <div className="otp-overlay">
                <div className="otp-modal">
                    <div className="otp-icon">🔐</div>
                    <div className="otp-title">Xác nhận thay đổi</div>
                    <div className="otp-desc">
                        Mã xác nhận 6 số đã được gửi tới<br />
                        <strong>{newValue}</strong>
                    </div>

                    <div className="otp-inputs" onPaste={handlePaste}>
                        {otp.map((digit, i) => (
                            <input
                                key={i}
                                ref={el => { inputs.current[i] = el; }}
                                className={`otp-input${digit ? " filled" : ""}`}
                                type="text" inputMode="numeric"
                                maxLength={1} value={digit}
                                onChange={e => handleChange(i, e.target.value)}
                                onKeyDown={e => handleKeyDown(i, e)}
                                autoFocus={i === 0}
                            />
                        ))}
                    </div>

                    {error && <div className="otp-error">⚠ {error}</div>}

                    <button className="otp-btn" onClick={handleVerify} disabled={loading || otp.join("").length < 6}>
                        {loading ? "Đang xác nhận..." : "Xác nhận"}
                    </button>

                    <div className="otp-resend">
                        {countdown > 0 ? (
                            <span>Gửi lại mã sau {countdown}s</span>
                        ) : (
                            <button onClick={handleResend} disabled={resending}>
                                {resending ? "Đang gửi..." : "Gửi lại mã"}
                            </button>
                        )}
                    </div>

                    <br />
                    <button className="otp-cancel" onClick={onCancel}>Hủy thay đổi</button>
                </div>
            </div>
        </>
    );
}