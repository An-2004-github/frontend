"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "@/store/authStore";
import axios from "axios";
import api from "@/lib/axios";

type FormErrors = {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
};

export default function RegisterPage() {
    const router = useRouter();
    const { login } = useAuthStore();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
        setErrors({ ...errors, [e.target.id]: "" });
    };

    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        if (!formData.name.trim()) newErrors.name = "Vui lòng nhập họ tên";
        if (!formData.email.includes("@")) newErrors.email = "Email không hợp lệ";
        if (formData.password.length < 6) newErrors.password = "Mật khẩu phải >= 6 ký tự";
        if (formData.password !== formData.confirmPassword)
            newErrors.confirmPassword = "Mật khẩu không khớp";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const fetchAndStoreUser = async (token: string) => {
        const me = await api.get("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
        });
        login(me.data, token);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setIsLoading(true);
            await api.post("/api/auth/register", {
                name: formData.name,
                email: formData.email,
                password: formData.password,
            });
            alert("Đăng ký thành công!");
            setFormData({ name: "", email: "", password: "", confirmPassword: "" });
            router.push("/login");
        } catch (err: unknown) {
            if (axios.isAxiosError<{ message: string }>(err)) {
                alert(err.response?.data?.message || "Đăng ký thất bại");
            } else {
                alert("Có lỗi xảy ra");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500&display=swap');

                .register-root {
                    min-height: 100vh;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    font-family: 'DM Sans', sans-serif;
                    background: #faf8f5;
                }

                /* ===== LEFT PANEL ===== */
                .register-visual {
                    position: relative;
                    overflow: hidden;
                    background: #1a1208;
                }

                .register-visual-bg {
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(ellipse at 30% 70%, rgba(212,160,80,0.35) 0%, transparent 60%),
                        radial-gradient(ellipse at 80% 20%, rgba(180,100,40,0.2) 0%, transparent 50%),
                        linear-gradient(160deg, #1a1208 0%, #2d1f0a 50%, #1a1208 100%);
                }

                .register-visual-dots {
                    position: absolute;
                    inset: 0;
                    background-image: radial-gradient(circle, rgba(212,160,80,0.15) 1px, transparent 1px);
                    background-size: 28px 28px;
                }

                .register-visual-content {
                    position: relative;
                    z-index: 2;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 3rem;
                }

                .register-brand {
                    font-family: 'Playfair Display', serif;
                    font-size: 2rem;
                    font-weight: 700;
                    color: #f0d090;
                    letter-spacing: -0.5px;
                }

                .register-brand span {
                    color: #d4a050;
                }

                .register-tagline {
                    margin-bottom: 4rem;
                }

                .register-tagline h2 {
                    font-family: 'Playfair Display', serif;
                    font-size: 2.6rem;
                    font-weight: 700;
                    color: #f5ead0;
                    line-height: 1.25;
                    margin-bottom: 1rem;
                }

                .register-tagline p {
                    color: rgba(240,210,140,0.65);
                    font-size: 1rem;
                    font-weight: 300;
                    line-height: 1.7;
                    max-width: 340px;
                }

                .register-perks {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-top: 2rem;
                }

                .register-perk {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    color: rgba(240,210,140,0.75);
                    font-size: 0.9rem;
                    font-weight: 300;
                }

                .register-perk-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: rgba(212,160,80,0.15);
                    border: 1px solid rgba(212,160,80,0.25);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.95rem;
                    flex-shrink: 0;
                }

                /* ===== RIGHT PANEL ===== */
                .register-form-panel {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    overflow-y: auto;
                }

                .register-form-box {
                    width: 100%;
                    max-width: 420px;
                    padding: 1rem 0;
                }

                .register-form-header {
                    margin-bottom: 2rem;
                }

                .register-form-header h1 {
                    font-family: 'Playfair Display', serif;
                    font-size: 2rem;
                    font-weight: 700;
                    color: #1a1208;
                    margin-bottom: 0.5rem;
                }

                .register-form-header p {
                    color: #9a8870;
                    font-size: 0.95rem;
                    font-weight: 300;
                }

                .form-group {
                    margin-bottom: 1.1rem;
                }

                .form-label {
                    display: block;
                    font-size: 0.82rem;
                    font-weight: 500;
                    color: #6b5b45;
                    margin-bottom: 0.45rem;
                    letter-spacing: 0.4px;
                    text-transform: uppercase;
                }

                .form-input {
                    width: 100%;
                    padding: 0.8rem 1rem;
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

                .form-input.input-error {
                    border-color: #e0a0a0;
                }

                .field-error {
                    color: #c0392b;
                    font-size: 0.8rem;
                    margin-top: 0.35rem;
                }

                .btn-register {
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

                .btn-register:hover:not(:disabled) {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }

                .btn-register:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .divider {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin: 1.5rem 0;
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

                .login-link {
                    margin-top: 1.75rem;
                    text-align: center;
                    font-size: 0.9rem;
                    color: #9a8870;
                }

                .login-link a {
                    color: #d4a050;
                    font-weight: 500;
                    text-decoration: none;
                }

                .login-link a:hover {
                    text-decoration: underline;
                }

                @media (max-width: 768px) {
                    .register-root {
                        grid-template-columns: 1fr;
                    }
                    .register-visual {
                        display: none;
                    }
                }
            `}</style>

            <div className="register-root">
                {/* LEFT — Visual panel */}
                <div className="register-visual">
                    <div className="register-visual-bg" />
                    <div className="register-visual-dots" />
                    <div className="register-visual-content">
                        <div className="register-brand">VIVU<span>.</span></div>
                        <div className="register-tagline">
                            <h2>Bắt đầu hành trình của bạn hôm nay</h2>
                            <p>
                                Tạo tài khoản miễn phí và mở khóa hàng ngàn ưu đãi du lịch độc quyền.
                            </p>
                            <div className="register-perks">
                                <div className="register-perk">
                                    <div className="register-perk-icon">🎁</div>
                                    Ưu đãi độc quyền dành riêng cho thành viên
                                </div>
                                <div className="register-perk">
                                    <div className="register-perk-icon">💰</div>
                                    Tích điểm thưởng mỗi lần đặt dịch vụ
                                </div>
                                <div className="register-perk">
                                    <div className="register-perk-icon">🔔</div>
                                    Thông báo giá tốt nhất theo thời gian thực
                                </div>
                                <div className="register-perk">
                                    <div className="register-perk-icon">🛡</div>
                                    Bảo mật tài khoản đa lớp
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT — Form panel */}
                <div className="register-form-panel">
                    <div className="register-form-box">
                        <div className="register-form-header">
                            <h1>Tạo tài khoản mới</h1>
                            <p>Tham gia VIVU để nhận nhiều ưu đãi hấp dẫn</p>
                        </div>

                        <form onSubmit={handleRegister}>
                            {/* Name */}
                            <div className="form-group">
                                <label className="form-label">Họ và tên</label>
                                <input
                                    className={`form-input${errors.name ? " input-error" : ""}`}
                                    id="name"
                                    type="text"
                                    placeholder="VD: Nguyễn Văn A"
                                    value={formData.name}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                                {errors.name && <p className="field-error">{errors.name}</p>}
                            </div>

                            {/* Email */}
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    className={`form-input${errors.email ? " input-error" : ""}`}
                                    id="email"
                                    type="email"
                                    placeholder="email@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                                {errors.email && <p className="field-error">{errors.email}</p>}
                            </div>

                            {/* Password */}
                            <div className="form-group">
                                <label className="form-label">Mật khẩu</label>
                                <input
                                    className={`form-input${errors.password ? " input-error" : ""}`}
                                    id="password"
                                    type="password"
                                    placeholder="Tối thiểu 6 ký tự"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                                {errors.password && <p className="field-error">{errors.password}</p>}
                            </div>

                            {/* Confirm Password */}
                            <div className="form-group">
                                <label className="form-label">Xác nhận mật khẩu</label>
                                <input
                                    className={`form-input${errors.confirmPassword ? " input-error" : ""}`}
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Nhập lại mật khẩu"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                                {errors.confirmPassword && (
                                    <p className="field-error">{errors.confirmPassword}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="btn-register"
                                disabled={isLoading}
                            >
                                {isLoading ? "Đang tạo tài khoản..." : "Đăng ký"}
                            </button>
                        </form>

                        <div className="divider">
                            <div className="divider-line" />
                            <span className="divider-text">hoặc đăng ký bằng</span>
                            <div className="divider-line" />
                        </div>

                        {/* Google */}
                        <div className="google-wrapper">
                            <GoogleLogin
                                onSuccess={async (credentialResponse) => {
                                    try {
                                        const res = await api.post("/api/auth/google", {
                                            token: credentialResponse.credential,
                                        });
                                        await fetchAndStoreUser(res.data.access_token);
                                        router.push("/");
                                    } catch (err) {
                                        console.error(err);
                                        alert("Đăng ký Google thất bại");
                                    }
                                }}
                                onError={() => alert("Google login lỗi")}
                                width="380"
                            />
                        </div>

                        <div className="login-link">
                            Đã có tài khoản?{" "}
                            <Link href="/login">Đăng nhập ngay</Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
