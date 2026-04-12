"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

type Step = "email" | "otp";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const startCooldown = () => {
        setResendCooldown(60);
        const t = setInterval(() => {
            setResendCooldown(v => {
                if (v <= 1) { clearInterval(t); return 0; }
                return v - 1;
            });
        }, 1000);
    };

    const handleSendOtp = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setError("");
        setLoading(true);
        try {
            await api.post("/api/auth/forgot-password", { email });
            setStep("otp");
            startCooldown();
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setError(detail || "Có lỗi xảy ra, vui lòng thử lại");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setError("");
        setLoading(true);
        try {
            await api.post("/api/auth/forgot-password", { email });
            startCooldown();
        } catch {
            setError("Không thể gửi lại mã, vui lòng thử lại");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (newPassword !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }
        if (newPassword.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự");
            return;
        }
        setLoading(true);
        try {
            await api.post("/api/auth/reset-password", { email, otp, new_password: newPassword });
            setSuccess(true);
            setTimeout(() => router.push("/login"), 2500);
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setError(detail || "Đặt lại mật khẩu thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500&display=swap');

                .fp-root {
                    min-height: 100vh;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    font-family: 'DM Sans', sans-serif;
                    background: #faf8f5;
                }

                .fp-visual {
                    position: relative;
                    overflow: hidden;
                    background: #1a1208;
                }
                .fp-visual-bg {
                    position: absolute; inset: 0;
                    background:
                        radial-gradient(ellipse at 30% 70%, rgba(212,160,80,0.35) 0%, transparent 60%),
                        radial-gradient(ellipse at 80% 20%, rgba(180,100,40,0.2) 0%, transparent 50%),
                        linear-gradient(160deg, #1a1208 0%, #2d1f0a 50%, #1a1208 100%);
                }
                .fp-visual-dots {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(212,160,80,0.15) 1px, transparent 1px);
                    background-size: 28px 28px;
                }
                .fp-visual-content {
                    position: relative; z-index: 2; height: 100%;
                    display: flex; flex-direction: column;
                    justify-content: space-between; padding: 3rem;
                }
                .fp-brand {
                    font-family: 'Playfair Display', serif;
                    font-size: 2rem; font-weight: 700;
                    color: #f0d090; letter-spacing: -0.5px;
                }
                .fp-brand span { color: #d4a050; }
                .fp-tagline { margin-bottom: 4rem; }
                .fp-tagline h2 {
                    font-family: 'Playfair Display', serif;
                    font-size: 2.6rem; font-weight: 700;
                    color: #f5ead0; line-height: 1.25; margin-bottom: 1rem;
                }
                .fp-tagline p {
                    color: rgba(240,210,140,0.65); font-size: 1rem;
                    font-weight: 300; line-height: 1.7; max-width: 340px;
                }

                .fp-panel {
                    display: flex; align-items: center;
                    justify-content: center; padding: 2rem;
                }
                .fp-box { width: 100%; max-width: 420px; }

                .fp-header { margin-bottom: 2rem; }
                .fp-header h1 {
                    font-family: 'Playfair Display', serif;
                    font-size: 2rem; font-weight: 700;
                    color: #1a1208; margin-bottom: 0.4rem;
                }
                .fp-header p { color: #9a8870; font-size: 0.92rem; font-weight: 300; line-height: 1.6; }

                .fp-steps {
                    display: flex; align-items: center;
                    gap: 0.5rem; margin-bottom: 2rem;
                }
                .fp-step {
                    display: flex; align-items: center; justify-content: center;
                    width: 28px; height: 28px; border-radius: 50%;
                    font-size: 0.78rem; font-weight: 700;
                    background: #e5ddd0; color: #9a8870;
                    transition: all 0.2s;
                }
                .fp-step.active { background: #d4a050; color: #fff; }
                .fp-step.done { background: #00875a; color: #fff; }
                .fp-step-line { flex: 1; height: 2px; background: #e5ddd0; border-radius: 99px; }
                .fp-step-line.done { background: #00875a; }

                .form-group { margin-bottom: 1.25rem; }
                .form-label {
                    display: block; font-size: 0.82rem; font-weight: 500;
                    color: #6b5b45; margin-bottom: 0.5rem;
                    letter-spacing: 0.4px; text-transform: uppercase;
                }
                .form-input {
                    width: 100%; padding: 0.85rem 1rem;
                    border: 1.5px solid #e5ddd0; border-radius: 10px;
                    font-family: 'DM Sans', sans-serif; font-size: 0.95rem;
                    color: #1a1208; background: #fff; outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    box-sizing: border-box;
                }
                .form-input:focus {
                    border-color: #d4a050;
                    box-shadow: 0 0 0 3px rgba(212,160,80,0.12);
                }
                .form-input::placeholder { color: #c5b9a8; font-weight: 300; }

                .otp-hint {
                    font-size: 0.82rem; color: #9a8870;
                    margin-bottom: 1.25rem; line-height: 1.6;
                    background: #faf6ee; border: 1px solid #ecdec8;
                    border-radius: 8px; padding: 0.75rem 1rem;
                }
                .otp-hint strong { color: #d4a050; }

                .error-msg {
                    background: #fff5f5; border: 1px solid #fcc;
                    color: #c0392b; padding: 0.75rem 1rem;
                    border-radius: 8px; font-size: 0.88rem; margin-bottom: 1.25rem;
                }

                .btn-primary {
                    width: 100%; padding: 0.9rem;
                    background: linear-gradient(135deg, #d4a050, #b8762e);
                    color: #fff; font-family: 'DM Sans', sans-serif;
                    font-size: 0.95rem; font-weight: 500;
                    border: none; border-radius: 10px; cursor: pointer;
                    transition: opacity 0.2s, transform 0.15s;
                    letter-spacing: 0.3px; margin-top: 0.25rem;
                }
                .btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
                .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

                .resend-row {
                    text-align: center; margin-top: 1rem;
                    font-size: 0.88rem; color: #9a8870;
                }
                .resend-btn {
                    background: none; border: none; padding: 0;
                    color: #d4a050; font-weight: 500; cursor: pointer;
                    font-size: 0.88rem; font-family: 'DM Sans', sans-serif;
                }
                .resend-btn:disabled { color: #b0a090; cursor: not-allowed; }

                .back-link {
                    margin-top: 1.75rem; text-align: center;
                    font-size: 0.88rem; color: #9a8870;
                }
                .back-link a { color: #d4a050; font-weight: 500; text-decoration: none; }
                .back-link a:hover { text-decoration: underline; }

                .success-card {
                    text-align: center; padding: 2rem 0;
                }
                .success-icon {
                    font-size: 3rem; margin-bottom: 1rem;
                }
                .success-card h2 {
                    font-family: 'Playfair Display', serif;
                    font-size: 1.5rem; color: #1a1208; margin-bottom: 0.5rem;
                }
                .success-card p { color: #9a8870; font-size: 0.92rem; line-height: 1.6; }

                @media (max-width: 768px) {
                    .fp-root { grid-template-columns: 1fr; }
                    .fp-visual { display: none; }
                }
            `}</style>

            <div className="fp-root">
                {/* LEFT */}
                <div className="fp-visual">
                    <div className="fp-visual-bg" />
                    <div className="fp-visual-dots" />
                    <div className="fp-visual-content">
                        <div className="fp-brand">VIVU<span>.</span></div>
                        <div className="fp-tagline">
                            <h2>Lấy lại quyền truy cập tài khoản</h2>
                            <p>Nhập email đăng ký để nhận mã xác nhận và đặt lại mật khẩu của bạn.</p>
                        </div>
                    </div>
                </div>

                {/* RIGHT */}
                <div className="fp-panel">
                    <div className="fp-box">
                        {success ? (
                            <div className="success-card">
                                <div className="success-icon">✅</div>
                                <h2>Đặt lại mật khẩu thành công!</h2>
                                <p>Đang chuyển hướng về trang đăng nhập...</p>
                            </div>
                        ) : (
                            <>
                                <div className="fp-header">
                                    <h1>Quên mật khẩu</h1>
                                    <p>
                                        {step === "email"
                                            ? "Nhập email tài khoản để nhận mã OTP"
                                            : "Nhập mã OTP đã gửi đến email và mật khẩu mới"}
                                    </p>
                                </div>

                                {/* Step indicators */}
                                <div className="fp-steps">
                                    <div className={`fp-step ${step === "email" ? "active" : "done"}`}>
                                        {step === "email" ? "1" : "✓"}
                                    </div>
                                    <div className={`fp-step-line ${step === "otp" ? "done" : ""}`} />
                                    <div className={`fp-step ${step === "otp" ? "active" : ""}`}>2</div>
                                </div>

                                {error && <div className="error-msg">⚠ {error}</div>}

                                {step === "email" ? (
                                    <form onSubmit={handleSendOtp}>
                                        <div className="form-group">
                                            <label className="form-label">Email đăng ký</label>
                                            <input
                                                className="form-input"
                                                type="email"
                                                placeholder="email@example.com"
                                                value={email}
                                                onChange={e => { setEmail(e.target.value); setError(""); }}
                                                required
                                            />
                                        </div>
                                        <button type="submit" className="btn-primary" disabled={loading}>
                                            {loading ? "Đang gửi..." : "Gửi mã OTP"}
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleReset}>
                                        <div className="otp-hint">
                                            Mã OTP đã được gửi tới <strong>{email}</strong>. Kiểm tra hộp thư (kể cả thư rác).
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Mã OTP (6 chữ số)</label>
                                            <input
                                                className="form-input"
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={6}
                                                placeholder="000000"
                                                value={otp}
                                                onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Mật khẩu mới</label>
                                            <input
                                                className="form-input"
                                                type="password"
                                                placeholder="Ít nhất 6 ký tự"
                                                value={newPassword}
                                                onChange={e => { setNewPassword(e.target.value); setError(""); }}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Xác nhận mật khẩu</label>
                                            <input
                                                className="form-input"
                                                type="password"
                                                placeholder="Nhập lại mật khẩu mới"
                                                value={confirmPassword}
                                                onChange={e => { setConfirmPassword(e.target.value); setError(""); }}
                                                required
                                            />
                                        </div>
                                        <button type="submit" className="btn-primary" disabled={loading || otp.length !== 6}>
                                            {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                                        </button>
                                        <div className="resend-row">
                                            Không nhận được mã?{" "}
                                            <button
                                                type="button"
                                                className="resend-btn"
                                                onClick={handleResend}
                                                disabled={resendCooldown > 0 || loading}
                                            >
                                                {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : "Gửi lại"}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                <div className="back-link">
                                    <Link href="/login">← Quay lại đăng nhập</Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
