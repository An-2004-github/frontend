"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import OTPVerify from "@/components/profile/OTPVerify";

interface FormData {
    full_name: string;
    phone: string;
    date_of_birth: string;
    gender: string;
    address: string;
    new_email: string;
}

interface FormErrors {
    full_name?: string;
    phone?: string;
    date_of_birth?: string;
    new_email?: string;
    address?: string;
}

interface OTPState {
    show: boolean;
    type: "email" | "phone";
    newValue: string;
}

export default function ProfilePage() {
    const { user, login } = useAuthStore();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [otp, setOtp] = useState<OTPState | null>(null);

    const [form, setForm] = useState<FormData>({
        full_name: "",
        phone: "",
        date_of_birth: "",
        gender: "",
        address: "",
        new_email: "",
    });
    const [errors, setErrors] = useState<FormErrors>({});

    // Load user data
    useEffect(() => {
        api.get("/api/auth/me").then(res => {
            const u = res.data;
            setForm({
                full_name: u.full_name ?? "",
                phone: u.phone ?? "",
                date_of_birth: u.date_of_birth ? u.date_of_birth.split("T")[0] : "",
                gender: u.gender ?? "",
                address: u.address ?? "",
                new_email: u.email ?? "",
            });
        });
    }, []);

    const validate = (): boolean => {
        const e: FormErrors = {};

        if (!form.full_name.trim())
            e.full_name = "Họ và tên không được để trống";
        else if (form.full_name.trim().length < 2)
            e.full_name = "Họ và tên phải có ít nhất 2 ký tự";

        if (form.phone && !/^(0[3-9]\d{8})$/.test(form.phone))
            e.phone = "Số điện thoại không hợp lệ (VD: 0912345678)";

        if (form.new_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.new_email))
            e.new_email = "Email không hợp lệ";

        if (form.date_of_birth) {
            const dob = new Date(form.date_of_birth);
            const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
            if (age < 1 || age > 120)
                e.date_of_birth = "Ngày sinh không hợp lệ";
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true); setMsg(null);
        try {
            const res = await api.put("/api/auth/profile", {
                full_name: form.full_name,
                phone: form.phone || undefined,
                date_of_birth: form.date_of_birth || undefined,
                gender: form.gender || undefined,
                address: form.address || undefined,
                new_email: form.new_email !== user?.email ? form.new_email : undefined,
            });

            // Cần OTP
            if (res.data.require_otp) {
                // Gửi OTP
                await api.post("/api/auth/send-otp", {
                    type: res.data.type,
                    new_value: res.data.new_value,
                });
                setOtp({ show: true, type: res.data.type, newValue: res.data.new_value });
                return;
            }

            // Thành công → cập nhật store
            await refreshUser();
            setMsg({ type: "success", text: "✅ Cập nhật thông tin thành công" });
            setEditing(false);
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })
                ?.response?.data?.detail;
            setMsg({ type: "error", text: `❌ ${detail || "Cập nhật thất bại"}` });
        } finally {
            setSaving(false);
        }
    };

    const refreshUser = async () => {
        const res = await api.get("/api/auth/me");
        const token = (() => {
            try { return JSON.parse(localStorage.getItem("auth-storage") ?? "")?.state?.token ?? ""; }
            catch { return localStorage.getItem("token") ?? ""; }
        })();
        login(res.data, token);
    };

    const handleOTPSuccess = async (message: string) => {
        setOtp(null);
        await refreshUser();
        setMsg({ type: "success", text: `✅ ${message}` });
        setEditing(false);
    };

    const initials = (user?.full_name ?? user?.email ?? "U")
        .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

    const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
        <div className="pp-field">
            <label className="pp-field-label">{label}</label>
            {children}
            {error && <span className="pp-field-error">{error}</span>}
        </div>
    );

    return (
        <>
            <style>{`
                .pp-title { font-family: 'Nunito',sans-serif; font-size: 1.2rem; font-weight: 800; color: #1a3c6b; margin-bottom: 1.25rem; }
                .pp-card { background: #fff; border-radius: 16px; border: 1px solid #e8f0fe; padding: 1.5rem; margin-bottom: 1.25rem; }
                .pp-card-title { font-family: 'Nunito',sans-serif; font-size: 1rem; font-weight: 700; color: #1a3c6b; margin: 0 0 1.25rem; padding-bottom: 0.75rem; border-bottom: 2px solid #e8f0fe; display: flex; justify-content: space-between; align-items: center; }
                .pp-avatar-row { display: flex; align-items: center; gap: 1.25rem; margin-bottom: 1.5rem; }
                .pp-avatar-big { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg,#0052cc,#0065ff); color: #fff; font-family: 'Nunito',sans-serif; font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .pp-avatar-name { font-family: 'Nunito',sans-serif; font-size: 1.1rem; font-weight: 700; color: #1a3c6b; }
                .pp-avatar-email { font-size: 0.82rem; color: #6b8cbf; margin-top: 0.2rem; }
                .pp-field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                .pp-field { display: flex; flex-direction: column; gap: 0.3rem; }
                .pp-field-label { font-size: 0.75rem; font-weight: 600; color: #6b778c; text-transform: uppercase; letter-spacing: 0.4px; }
                .pp-field-value { font-size: 0.92rem; color: #1a3c6b; padding: 0.65rem 0; border-bottom: 1px solid #f0f4ff; min-height: 40px; }
                .pp-field-value.empty { color: #b0bcd8; font-style: italic; }
                .pp-input { border: 1.5px solid #dde3f0; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.9rem; font-family: 'DM Sans',sans-serif; color: #1a3c6b; outline: none; transition: border-color 0.2s; width: 100%; }
                .pp-input:focus { border-color: #0052cc; box-shadow: 0 0 0 3px rgba(0,82,204,0.1); }
                .pp-input.error { border-color: #bf2600; }
                .pp-input:disabled { background: #f8faff; color: #6b8cbf; cursor: not-allowed; }
                .pp-select { border: 1.5px solid #dde3f0; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.9rem; font-family: 'DM Sans',sans-serif; color: #1a3c6b; outline: none; width: 100%; background: #fff; cursor: pointer; }
                .pp-select:focus { border-color: #0052cc; }
                .pp-field-error { font-size: 0.75rem; color: #bf2600; }
                .pp-field-hint { font-size: 0.72rem; color: #6b8cbf; }
                .pp-btn-row { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
                .pp-btn-primary { padding: 0.65rem 1.5rem; background: linear-gradient(135deg,#0052cc,#0065ff); color: #fff; border: none; border-radius: 10px; font-family: 'DM Sans',sans-serif; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
                .pp-btn-primary:hover:not(:disabled) { opacity: 0.88; }
                .pp-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .pp-btn-outline { padding: 0.65rem 1.5rem; background: none; border: 1.5px solid #dde3f0; border-radius: 10px; font-family: 'DM Sans',sans-serif; font-size: 0.9rem; color: #6b8cbf; cursor: pointer; transition: background 0.15s; }
                .pp-btn-outline:hover { background: #f0f4ff; color: #0052cc; border-color: #c8d8ff; }
                .pp-btn-edit { padding: 0.35rem 0.85rem; background: #f0f4ff; color: #0052cc; border: 1.5px solid #c8d8ff; border-radius: 8px; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
                .pp-btn-edit:hover { background: #dde9ff; }
                .pp-msg { padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.85rem; margin-top: 0.75rem; }
                .pp-msg.success { background: #d4edda; color: #00875a; border: 1px solid #b7dfbb; }
                .pp-msg.error   { background: #fff0ee; color: #bf2600; border: 1px solid #ffbdad; }
                .pp-stat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1rem; }
                .pp-stat { background: #f0f4ff; border-radius: 12px; padding: 1rem; text-align: center; }
                .pp-stat-value { font-family: 'Nunito',sans-serif; font-size: 1.4rem; font-weight: 800; color: #0052cc; }
                .pp-stat-label { font-size: 0.78rem; color: #6b8cbf; margin-top: 0.2rem; }
                .pp-email-note { font-size: 0.75rem; color: #b8762e; background: #fff8e1; padding: 0.4rem 0.75rem; border-radius: 6px; margin-top: 0.3rem; }
                @media (max-width: 640px) {
                    .pp-field-grid { grid-template-columns: 1fr; }
                    .pp-stat-grid { grid-template-columns: 1fr 1fr; }
                }
            `}</style>

            <div className="pp-title">⚙️ Tài khoản của tôi</div>

            {/* Avatar + stats */}
            <div className="pp-card">
                <div className="pp-avatar-row">
                    <div className="pp-avatar-big">{initials}</div>
                    <div>
                        <div className="pp-avatar-name">{user?.full_name ?? "Chưa cập nhật tên"}</div>
                        <div className="pp-avatar-email">{user?.email}</div>
                    </div>
                </div>
                <div className="pp-stat-grid">
                    <div className="pp-stat">
                        <div className="pp-stat-value">{(user?.wallet ?? 0).toLocaleString("vi-VN")}₫</div>
                        <div className="pp-stat-label">Số dư ví</div>
                    </div>
                    <div className="pp-stat">
                        <div className="pp-stat-value">🥉</div>
                        <div className="pp-stat-label">Hạng Bronze</div>
                    </div>
                    <div className="pp-stat">
                        <div className="pp-stat-value">
                            {user?.provider === "google" ? "🔵" : "📧"}
                        </div>
                        <div className="pp-stat-label">
                            {user?.provider === "google" ? "Google" : "Email"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Thông tin cá nhân */}
            <div className="pp-card">
                <div className="pp-card-title">
                    👤 Thông tin cá nhân
                    {!editing && (
                        <button className="pp-btn-edit" onClick={() => { setEditing(true); setMsg(null); }}>
                            ✏️ Chỉnh sửa
                        </button>
                    )}
                </div>

                <div className="pp-field-grid">
                    {/* Họ tên */}
                    <Field label="Họ và tên" error={errors.full_name}>
                        {editing ? (
                            <input
                                className={`pp-input${errors.full_name ? " error" : ""}`}
                                value={form.full_name}
                                onChange={e => { setForm({ ...form, full_name: e.target.value }); setErrors({ ...errors, full_name: "" }); }}
                                placeholder="Nguyễn Văn A"
                            />
                        ) : (
                            <div className={`pp-field-value${!user?.full_name ? " empty" : ""}`}>
                                {user?.full_name || "Chưa cập nhật"}
                            </div>
                        )}
                    </Field>

                    {/* Email */}
                    <Field label="Email" error={errors.new_email}>
                        {editing ? (
                            <>
                                <input
                                    className={`pp-input${errors.new_email ? " error" : ""}`}
                                    value={form.new_email}
                                    onChange={e => { setForm({ ...form, new_email: e.target.value }); setErrors({ ...errors, new_email: "" }); }}
                                />
                                {form.new_email !== user?.email && (
                                    <div className="pp-email-note">⚠ Đổi email sẽ cần xác nhận OTP</div>
                                )}
                            </>
                        ) : (
                            <div className="pp-field-value">{user?.email}</div>
                        )}
                    </Field>

                    {/* Số điện thoại */}
                    <Field label="Số điện thoại" error={errors.phone}>
                        {editing ? (
                            <input
                                className={`pp-input${errors.phone ? " error" : ""}`}
                                value={form.phone}
                                onChange={e => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: "" }); }}
                                placeholder="0912345678"
                                type="tel"
                            />
                        ) : (
                            <div className={`pp-field-value${!user?.phone ? " empty" : ""}`}>
                                {user?.phone || "Chưa cập nhật"}
                            </div>
                        )}
                    </Field>

                    {/* Ngày sinh */}
                    <Field label="Ngày sinh" error={errors.date_of_birth}>
                        {editing ? (
                            <input
                                className={`pp-input${errors.date_of_birth ? " error" : ""}`}
                                type="date"
                                value={form.date_of_birth}
                                max={new Date().toISOString().split("T")[0]}
                                onChange={e => { setForm({ ...form, date_of_birth: e.target.value }); setErrors({ ...errors, date_of_birth: "" }); }}
                            />
                        ) : (
                            <div className={`pp-field-value${!user?.date_of_birth ? " empty" : ""}`}>
                                {user?.date_of_birth
                                    ? new Date(user.date_of_birth).toLocaleDateString("vi-VN")
                                    : "Chưa cập nhật"}
                            </div>
                        )}
                    </Field>

                    {/* Giới tính */}
                    <Field label="Giới tính">
                        {editing ? (
                            <select
                                className="pp-select"
                                value={form.gender}
                                onChange={e => setForm({ ...form, gender: e.target.value })}
                            >
                                <option value="">-- Chọn giới tính --</option>
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                                <option value="other">Khác</option>
                            </select>
                        ) : (
                            <div className={`pp-field-value${!user?.gender ? " empty" : ""}`}>
                                {{ male: "Nam", female: "Nữ", other: "Khác" }[user?.gender ?? ""] || "Chưa cập nhật"}
                            </div>
                        )}
                    </Field>

                    {/* Địa chỉ */}
                    <Field label="Địa chỉ" error={errors.address}>
                        {editing ? (
                            <input
                                className="pp-input"
                                value={form.address}
                                onChange={e => setForm({ ...form, address: e.target.value })}
                                placeholder="123 Đường ABC, Quận 1, TP.HCM"
                            />
                        ) : (
                            <div className={`pp-field-value${!user?.address ? " empty" : ""}`}>
                                {user?.address || "Chưa cập nhật"}
                            </div>
                        )}
                    </Field>
                </div>

                {editing && (
                    <div className="pp-btn-row">
                        <button className="pp-btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? "⏳ Đang lưu..." : "💾 Lưu thay đổi"}
                        </button>
                        <button className="pp-btn-outline" onClick={() => { setEditing(false); setErrors({}); setMsg(null); }}>
                            Hủy
                        </button>
                    </div>
                )}

                {msg && <div className={`pp-msg ${msg.type}`}>{msg.text}</div>}
            </div>

            {/* OTP Modal */}
            {otp?.show && (
                <OTPVerify
                    type={otp.type}
                    newValue={otp.newValue}
                    onSuccess={handleOTPSuccess}
                    onCancel={() => setOtp(null)}
                />
            )}
        </>
    );
}