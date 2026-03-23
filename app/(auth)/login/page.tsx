"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { LoginRequest, LoginResponse, ErrorResponse } from "@/types/auth";
import { AxiosError } from "axios";
import { GoogleLogin } from "@react-oauth/google";

export default function LoginPage() {
    const router = useRouter();
    const login = useAuthStore((state) => state.login);

    const [formData, setFormData] = useState<LoginRequest>({
        email: "",
        password: "",
    });

    const [error, setError] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const fetchAndStoreUser = async (token: string) => {
        const me = await api.get("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
        });
        login(me.data, token);
        return me.data;
    };

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const res = await api.post<LoginResponse>("/api/auth/login", formData);
            const token = res.data.access_token;
            const user = await fetchAndStoreUser(token);
            router.push(user?.role === "ADMIN" ? "/admin" : "/");
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            setError(
                error.response?.data?.detail || "Sai email hoặc mật khẩu"
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500&display=swap');

                .login-root {
                    min-height: 100vh;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    font-family: 'DM Sans', sans-serif;
                    background: #faf8f5;
                }

                /* ===== LEFT PANEL ===== */
                .login-visual {
                    position: relative;
                    overflow: hidden;
                    background: #1a1208;
                }

                .login-visual-bg {
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(ellipse at 30% 70%, rgba(212,160,80,0.35) 0%, transparent 60%),
                        radial-gradient(ellipse at 80% 20%, rgba(180,100,40,0.2) 0%, transparent 50%),
                        linear-gradient(160deg, #1a1208 0%, #2d1f0a 50%, #1a1208 100%);
                }

                .login-visual-dots {
                    position: absolute;
                    inset: 0;
                    background-image: radial-gradient(circle, rgba(212,160,80,0.15) 1px, transparent 1px);
                    background-size: 28px 28px;
                }

                .login-visual-content {
                    position: relative;
                    z-index: 2;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 3rem;
                }

                .login-brand {
                    font-family: 'Playfair Display', serif;
                    font-size: 2rem;
                    font-weight: 700;
                    color: #f0d090;
                    letter-spacing: -0.5px;
                }

                .login-brand span {
                    color: #d4a050;
                }

                .login-tagline {
                    margin-bottom: 4rem;
                }

                .login-tagline h2 {
                    font-family: 'Playfair Display', serif;
                    font-size: 2.6rem;
                    font-weight: 700;
                    color: #f5ead0;
                    line-height: 1.25;
                    margin-bottom: 1rem;
                }

                .login-tagline p {
                    color: rgba(240,210,140,0.65);
                    font-size: 1rem;
                    font-weight: 300;
                    line-height: 1.7;
                    max-width: 340px;
                }

                .login-badges {
                    display: flex;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                    margin-top: 2rem;
                }

                .login-badge {
                    background: rgba(212,160,80,0.15);
                    border: 1px solid rgba(212,160,80,0.3);
                    color: #d4a050;
                    padding: 0.4rem 1rem;
                    border-radius: 99px;
                    font-size: 0.8rem;
                    font-weight: 500;
                    letter-spacing: 0.5px;
                }

                /* ===== RIGHT PANEL ===== */
                .login-form-panel {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                }

                .login-form-box {
                    width: 100%;
                    max-width: 420px;
                }

                .login-form-header {
                    margin-bottom: 2.5rem;
                }

                .login-form-header h1 {
                    font-family: 'Playfair Display', serif;
                    font-size: 2rem;
                    font-weight: 700;
                    color: #1a1208;
                    margin-bottom: 0.5rem;
                }

                .login-form-header p {
                    color: #9a8870;
                    font-size: 0.95rem;
                    font-weight: 300;
                }

                .form-group {
                    margin-bottom: 1.25rem;
                }

                .form-label {
                    display: block;
                    font-size: 0.82rem;
                    font-weight: 500;
                    color: #6b5b45;
                    margin-bottom: 0.5rem;
                    letter-spacing: 0.4px;
                    text-transform: uppercase;
                }

                .form-input {
                    width: 100%;
                    padding: 0.85rem 1rem;
                    border: 1.5px solid #e5ddd0;
                    border-radius: 10px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.95rem;
                    color: #1a1208;
                    background: #fff;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    box-sizing: border-box;
                }

                .form-input:focus {
                    border-color: #d4a050;
                    box-shadow: 0 0 0 3px rgba(212,160,80,0.12);
                }

                .form-input::placeholder {
                    color: #c5b9a8;
                    font-weight: 300;
                }

                .error-msg {
                    background: #fff5f5;
                    border: 1px solid #fcc;
                    color: #c0392b;
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    font-size: 0.88rem;
                    margin-bottom: 1.25rem;
                }

                .btn-login {
                    width: 100%;
                    padding: 0.9rem;
                    background: linear-gradient(135deg, #d4a050, #b8762e);
                    color: #fff;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.95rem;
                    font-weight: 500;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: opacity 0.2s, transform 0.15s;
                    letter-spacing: 0.3px;
                    margin-top: 0.5rem;
                }

                .btn-login:hover:not(:disabled) {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }

                .btn-login:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .divider {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin: 1.75rem 0;
                }

                .divider-line {
                    flex: 1;
                    height: 1px;
                    background: #e5ddd0;
                }

                .divider-text {
                    font-size: 0.8rem;
                    color: #b0a090;
                    white-space: nowrap;
                    font-weight: 400;
                }

                .google-wrapper {
                    display: flex;
                    justify-content: center;
                }

                .register-link {
                    margin-top: 2rem;
                    text-align: center;
                    font-size: 0.9rem;
                    color: #9a8870;
                }

                .register-link a {
                    color: #d4a050;
                    font-weight: 500;
                    text-decoration: none;
                }

                .register-link a:hover {
                    text-decoration: underline;
                }

                @media (max-width: 768px) {
                    .login-root {
                        grid-template-columns: 1fr;
                    }
                    .login-visual {
                        display: none;
                    }
                }
            `}</style>

            <div className="login-root">
                {/* LEFT — Visual panel */}
                <div className="login-visual">
                    <div className="login-visual-bg" />
                    <div className="login-visual-dots" />
                    <div className="login-visual-content">
                        <div className="login-brand">VIVU<span>.</span></div>
                        <div className="login-tagline">
                            <h2>Khám phá thế giới theo cách của bạn</h2>
                            <p>
                                Đặt khách sạn, vé máy bay và trải nghiệm du lịch tuyệt vời chỉ trong vài cú nhấp chuột.
                            </p>
                            <div className="login-badges">
                                <span className="login-badge">✈ Máy bay</span>
                                <span className="login-badge">🏨 Khách sạn</span>
                                <span className="login-badge">🚌 Xe khách</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT — Form panel */}
                <div className="login-form-panel">
                    <div className="login-form-box">
                        <div className="login-form-header">
                            <h1>Chào mừng trở lại</h1>
                            <p>Đăng nhập để tiếp tục hành trình của bạn</p>
                        </div>

                        {error && <div className="error-msg">⚠ {error}</div>}

                        <form onSubmit={handleLogin}>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    className="form-input"
                                    type="email"
                                    name="email"
                                    placeholder="email@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Mật khẩu</label>
                                <input
                                    className="form-input"
                                    type="password"
                                    name="password"
                                    placeholder="Nhập mật khẩu"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn-login"
                                disabled={isLoading}
                            >
                                {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                            </button>
                        </form>

                        <div className="divider">
                            <div className="divider-line" />
                            <span className="divider-text">hoặc đăng nhập bằng</span>
                            <div className="divider-line" />
                        </div>

                        {/* Google Login */}
                        <div className="google-wrapper">
                            <GoogleLogin
                                onSuccess={async (credentialResponse) => {
                                    try {
                                        const res = await api.post("/api/auth/google", {
                                            token: credentialResponse.credential,
                                        });
                                        const user = await fetchAndStoreUser(res.data.access_token);
                                        router.push(user?.role === "ADMIN" ? "/admin" : "/");
                                    } catch (err) {
                                        console.error(err);
                                        setError("Đăng nhập Google thất bại");
                                    }
                                }}
                                onError={() => setError("Google login lỗi")}
                                width="380"
                            />
                        </div>

                        <div className="register-link">
                            Chưa có tài khoản?{" "}
                            <Link href="/register">Đăng ký ngay</Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
