"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export interface PassengerInfo {
    type: "adult" | "child" | "infant";
    gender: string;
    lastName: string;
    firstName: string;
    birthDay: string;
    birthMonth: string;
    birthYear: string;
    nationality: string;
    passportNumber: string;
    passportExpDay: string;
    passportExpMonth: string;
    passportExpYear: string;
}

export const emptyPassenger = (type: PassengerInfo["type"] = "adult"): PassengerInfo => ({
    type,
    gender: "",
    lastName: "",
    firstName: "",
    birthDay: "",
    birthMonth: "",
    birthYear: "",
    nationality: "",
    passportNumber: "",
    passportExpDay: "",
    passportExpMonth: "",
    passportExpYear: "",
});

export interface ContactForm {
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    bookingForSelf: boolean;
    guestName: string;
    specialRequests: string[];
    // Flight: danh sách hành khách
    passengerList: PassengerInfo[];
}

type BookingType = "hotel" | "flight" | "bus" | "train";

const SPECIAL_OPTIONS: Record<BookingType, { key: string; label: string }[]> = {
    hotel: [
        { key: "no_smoking", label: "Phòng không hút thuốc" },
        { key: "adjoining_room", label: "Phòng liên thông" },
        { key: "high_floor", label: "Tầng cao" },
        { key: "low_floor", label: "Tầng thấp" },
        { key: "early_checkin", label: "Nhận phòng sớm" },
        { key: "late_checkout", label: "Trả phòng muộn" },
    ],
    flight: [
        { key: "window_seat", label: "Ghế cửa sổ" },
        { key: "aisle_seat", label: "Ghế lối đi" },
        { key: "vegetarian_meal", label: "Bữa ăn chay" },
        { key: "halal_meal", label: "Bữa ăn Halal" },
        { key: "wheelchair", label: "Hỗ trợ xe lăn" },
        { key: "extra_baggage", label: "Hành lý thêm" },
    ],
    bus: [
        { key: "window_seat", label: "Ghế cửa sổ" },
        { key: "front_seat", label: "Ghế đầu xe" },
        { key: "charging_port", label: "Có cổng sạc" },
        { key: "ac", label: "Điều hòa mát" },
        { key: "no_smoking", label: "Không hút thuốc" },
    ],
    train: [
        { key: "window_seat", label: "Ghế cửa sổ" },
        { key: "lower_berth", label: "Giường tầng dưới" },
        { key: "no_smoking", label: "Không hút thuốc" },
        { key: "wheelchair", label: "Hỗ trợ xe lăn" },
    ],
};

const MONTHS = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
    "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
    "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const THIS_YEAR = new Date().getFullYear();
const PASSPORT_EXP_YEARS = Array.from({ length: 21 }, (_, i) => THIS_YEAR + i);

const NATIONALITIES = [
    "Việt Nam", "United States", "United Kingdom", "Japan",
    "South Korea", "China", "France", "Germany", "Australia", "Singapore",
];

const PASSENGER_TYPE_OPTIONS = [
    { value: "adult", label: "Người lớn (trên 12 tuổi)" },
    { value: "child", label: "Trẻ em (2 – 11 tuổi)" },
    { value: "infant", label: "Em bé (dưới 2 tuổi)" },
];

function getBirthYears(type: PassengerInfo["type"]): number[] {
    if (type === "adult") return Array.from({ length: 89 }, (_, i) => THIS_YEAR - 12 - i);
    if (type === "child") return Array.from({ length: 10 }, (_, i) => THIS_YEAR - 2 - i);
    // infant: dưới 2 tuổi
    return [THIS_YEAR, THIS_YEAR - 1];
}

function getPassengerLabel(type: PassengerInfo["type"], index: number): string {
    const typeLabel = type === "adult" ? "Người lớn" : type === "child" ? "Trẻ em" : "Em bé";
    return `${typeLabel} ${index + 1}`;
}

interface Props {
    form: ContactForm;
    errors: Record<string, string>;
    bookingType: BookingType;
    flightRoute?: { fromCity: string; toCity: string };
    isInternational?: boolean;
    passengerCount?: number;
    onChange: <K extends keyof ContactForm>(field: K, value: ContactForm[K]) => void;
    onPassengerChange: (index: number, field: keyof PassengerInfo, value: string) => void;
}

export default function BookingForm({
    form, errors, bookingType, flightRoute, isInternational = false, passengerCount = 1,
    onChange, onPassengerChange,
}: Props) {
    const { user } = useAuthStore();
    const options = SPECIAL_OPTIONS[bookingType];

    const toggleSpecial = (key: string) => {
        const next = form.specialRequests.includes(key)
            ? form.specialRequests.filter(k => k !== key)
            : [...form.specialRequests, key];
        onChange("specialRequests", next);
    };

    // Đảm bảo passengerList có đủ số lượng
    const passengers = Array.from({ length: passengerCount }, (_, i) =>
        form.passengerList[i] ?? emptyPassenger("adult")
    );

    return (
        <>
            <style>{`
                .bf-banner { background: #e8f4fd; border: 1px solid #bee3f8; border-radius: 10px; padding: 0.7rem 1rem; margin-bottom: 1rem; font-size: 0.85rem; color: #1a3c6b; display: flex; align-items: center; gap: 0.6rem; }
                .bf-banner-icon { width: 28px; height: 28px; border-radius: 50%; background: #0052cc; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.85rem; }
                .bf-card { background: #fff; border-radius: 12px; border: 1px solid #dde3f0; padding: 1.25rem 1.5rem; margin-bottom: 1rem; }
                .bf-title { font-size: 1rem; font-weight: 700; color: #1a3c6b; margin-bottom: 0.2rem; }
                .bf-sub { font-size: 0.8rem; color: #6b8cbf; margin-bottom: 1.1rem; line-height: 1.5; }
                .bf-label { font-size: 0.78rem; font-weight: 600; color: #555; margin-bottom: 0.3rem; display: block; }
                .bf-label em { color: #e00; font-style: normal; }
                .bf-input { width: 100%; border: 1.5px solid #dde3f0; border-radius: 8px; padding: 0.6rem 0.85rem; font-size: 0.9rem; color: #1a3c6b; outline: none; transition: border-color 0.2s; font-family: inherit; }
                .bf-input:focus { border-color: #0052cc; box-shadow: 0 0 0 3px rgba(0,82,204,0.1); }
                .bf-input.err { border-color: #d32f2f; }
                .bf-select { width: 100%; border: 1.5px solid #dde3f0; border-radius: 8px; padding: 0.6rem 0.85rem; font-size: 0.9rem; color: #1a3c6b; outline: none; background: #fff; font-family: inherit; appearance: none; cursor: pointer; }
                .bf-select:focus { border-color: #0052cc; }
                .bf-select.err { border-color: #d32f2f; }
                .bf-select-wrap { position: relative; }
                .bf-select-wrap::after { content: "▾"; position: absolute; right: 0.85rem; top: 50%; transform: translateY(-50%); color: #6b8cbf; pointer-events: none; font-size: 0.85rem; }
                .bf-hint { font-size: 0.72rem; color: #aaa; margin-top: 0.2rem; }
                .bf-err { font-size: 0.75rem; color: #d32f2f; margin-top: 0.25rem; }
                .bf-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
                .bf-phone-wrap { display: flex; }
                .bf-phone-code { border: 1.5px solid #dde3f0; border-right: none; border-radius: 8px 0 0 8px; padding: 0 0.65rem; background: #f5f7ff; display: flex; align-items: center; white-space: nowrap; gap: 0.3rem; }
                .bf-phone-code select { border: none; background: transparent; color: #1a3c6b; font-size: 0.9rem; outline: none; cursor: pointer; font-family: inherit; }
                .bf-phone-input { flex: 1; border: 1.5px solid #dde3f0; border-left: none; border-radius: 0 8px 8px 0; padding: 0.6rem 0.85rem; font-size: 0.9rem; color: #1a3c6b; outline: none; font-family: inherit; }
                .bf-phone-input:focus { border-color: #0052cc; }
                .bf-phone-input.err { border-color: #d32f2f; }
                .bf-divider { border: none; border-top: 1px solid #eef0f8; margin: 0.25rem 0 0.75rem; }
                .bf-check-row { display: flex; align-items: center; gap: 0.65rem; cursor: pointer; padding: 0.4rem 0; user-select: none; }
                .bf-checkbox { width: 20px; height: 20px; border-radius: 5px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
                .bf-checkbox.on { background: #0052cc; border: 2px solid #0052cc; }
                .bf-checkbox.off { background: #fff; border: 2px solid #c0cce8; }
                .bf-check-label { font-size: 0.9rem; color: #1a3c6b; font-weight: 500; }
                .bf-user-row { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; }
                .bf-user-name { font-size: 0.92rem; color: #1a3c6b; }
                .bf-edit-link { font-size: 0.82rem; color: #0052cc; font-weight: 600; text-decoration: none; }
                .bf-edit-link:hover { text-decoration: underline; }
                .bf-special-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-top: 0.25rem; }
                .bf-special-item { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.84rem; color: #1a3c6b; user-select: none; }
                .bf-mini-box { width: 17px; height: 17px; border-radius: 4px; border: 1.5px solid #c0cce8; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
                .bf-mini-box.on { background: #0052cc; border-color: #0052cc; }

                /* Flight specific */
                .bf-passenger-header {
                    display: flex; align-items: center; justify-content: space-between;
                    background: #e8f0fe; border-radius: 8px;
                    padding: 0.55rem 0.85rem; margin-bottom: 1rem;
                }
                .bf-passenger-header-title { font-size: 0.9rem; font-weight: 700; color: #0052cc; }
                .bf-passenger-type-badge {
                    font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.6rem;
                    border-radius: 99px; background: #0052cc; color: #fff;
                }
                .bf-passenger-type-badge.child { background: #00875a; }
                .bf-passenger-type-badge.infant { background: #f5a623; color: #1a1208; }
                .bf-passenger-separator { border: none; border-top: 2px dashed #e8f0fe; margin: 1.5rem 0; }
                .bf-name-warn { background: #fffbe6; border: 1px solid #ffe58f; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; }
                .bf-name-warn-icon { color: #f5a623; margin-right: 0.3rem; }
                .bf-name-warn p { font-size: 0.8rem; color: #7a5c00; margin: 0; line-height: 1.5; }
                .bf-name-warn a { color: #0052cc; font-weight: 600; font-size: 0.8rem; text-decoration: none; }
                .bf-name-warn a:hover { text-decoration: underline; }
                .bf-date-row { display: grid; grid-template-columns: 70px 1fr 90px; gap: 0.5rem; }
                .bf-passport-section { margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid #eef0f8; }
                .bf-passport-note { background: #f0f4ff; border-left: 3px solid #0052cc; border-radius: 4px; padding: 0.65rem 0.85rem; margin-bottom: 1rem; font-size: 0.8rem; color: #1a3c6b; line-height: 1.5; }
                .bf-passport-note a { color: #0052cc; font-weight: 600; text-decoration: none; }
                .bf-passport-note a:hover { text-decoration: underline; }
                .bf-child-note { font-size: 0.75rem; color: #6b8cbf; margin-top: 0.4rem; line-height: 1.5; background: #f8faff; border-radius: 6px; padding: 0.5rem 0.7rem; border-left: 3px solid #c8d8ff; }

                /* Flight essentials */
                .bf-passport-remind { background: #fffbe6; border: 1px solid #ffe58f; border-radius: 10px; padding: 0.7rem 1rem; margin-bottom: 1rem; font-size: 0.82rem; color: #7a5c00; display: flex; align-items: flex-start; gap: 0.5rem; }
                .bf-essentials-card { background: #fff; border-radius: 12px; border: 1px solid #dde3f0; overflow: hidden; margin-bottom: 1rem; }
                .bf-essentials-header { padding: 1rem 1.25rem; border-bottom: 1px solid #eef0f8; display: flex; align-items: center; gap: 0.65rem; }
                .bf-essentials-icon { font-size: 1.5rem; }
                .bf-essentials-title { font-size: 0.95rem; font-weight: 700; color: #1a3c6b; }
                .bf-essentials-sub { font-size: 0.8rem; color: #6b8cbf; margin-top: 0.1rem; }
                .bf-essentials-body { padding: 1rem 1.25rem; }
                .bf-baggage-label { font-size: 0.8rem; color: #6b8cbf; margin-bottom: 0.75rem; }
                .bf-baggage-legs { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
                .bf-baggage-leg { background: #f8faff; border-radius: 8px; border: 1px solid #e8f0fe; padding: 0.75rem; }
                .bf-baggage-leg-title { font-size: 0.82rem; font-weight: 700; color: #1a3c6b; margin-bottom: 0.5rem; }
                .bf-baggage-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: #4a5568; margin-bottom: 0.25rem; }

                @media (max-width: 600px) {
                    .bf-grid2 { grid-template-columns: 1fr; }
                    .bf-special-grid { grid-template-columns: 1fr 1fr; }
                    .bf-baggage-legs { grid-template-columns: 1fr; }
                    .bf-date-row { grid-template-columns: 60px 1fr 80px; }
                }
            `}</style>

            {/* Login banner */}
            {user && (
                <div className="bf-banner">
                    <div className="bf-banner-icon">👤</div>
                    Đăng nhập với tên <strong style={{ marginLeft: 4 }}>{user.full_name || user.email}</strong>
                    {user.provider === "google" && <span style={{ color: "#6b8cbf" }}>&nbsp;(Google)</span>}
                </div>
            )}

            {/* Liên hệ đặt chỗ */}
            <div className="bf-card">
                <div className="bf-title">
                    {bookingType === "flight" ? "✉ Thông tin liên hệ (nhận vé/phiếu thanh toán)" : "✉ Liên hệ đặt chỗ"}
                </div>
                <div className="bf-sub">Thêm liên hệ để nhận xác nhận đặt chỗ.</div>

                <div>
                    <label className="bf-label">Họ tên<em>*</em></label>
                    <input
                        className={`bf-input${errors.contactName ? " err" : ""}`}
                        value={form.contactName}
                        onChange={e => onChange("contactName", e.target.value)}
                        placeholder="Nguyễn Văn A"
                    />
                    {errors.contactName && <div className="bf-err">{errors.contactName}</div>}
                </div>

                <div className="bf-grid2">
                    <div>
                        <label className="bf-label">Điện thoại di động<em>*</em></label>
                        <div className="bf-phone-wrap">
                            <div className="bf-phone-code">
                                <span>🇻🇳</span>
                                <select defaultValue="+84">
                                    <option value="+84">+84</option>
                                    <option value="+1">+1</option>
                                    <option value="+44">+44</option>
                                    <option value="+81">+81</option>
                                    <option value="+82">+82</option>
                                </select>
                            </div>
                            <input
                                className={`bf-phone-input${errors.contactPhone ? " err" : ""}`}
                                value={form.contactPhone}
                                onChange={e => onChange("contactPhone", e.target.value)}
                                type="tel"
                                placeholder="912 345 678"
                            />
                        </div>
                        {errors.contactPhone && <div className="bf-err">{errors.contactPhone}</div>}
                    </div>
                    <div>
                        <label className="bf-label">Email<em>*</em></label>
                        <input
                            className={`bf-input${errors.contactEmail ? " err" : ""}`}
                            value={form.contactEmail}
                            onChange={e => onChange("contactEmail", e.target.value)}
                            type="email"
                            placeholder="VD: email@example.com"
                        />
                        {errors.contactEmail
                            ? <div className="bf-err">{errors.contactEmail}</div>
                            : <div className="bf-hint">VD: email@example.com</div>
                        }
                    </div>
                </div>
            </div>

            {/* ── FLIGHT ONLY: Thông tin hành khách ── */}
            {bookingType === "flight" && (
                <div className="bf-card">
                    <div className="bf-title">👤 Thông tin hành khách</div>
                    <div className="bf-sub">
                        Vui lòng nhập đúng thông tin như trên giấy tờ tùy thân. Tên phải bằng tiếng Anh không dấu.
                    </div>

                    <div className="bf-name-warn">
                        <p>
                            <span className="bf-name-warn-icon">⚠</span>
                            <strong>Vui lòng chú ý:</strong><br />
                            Vui lòng nhập tên bằng tiếng Anh không dấu, chính xác như trên giấy tờ tùy thân.
                            Nếu không, bạn có thể bị từ chối lên máy bay hoặc phát sinh thêm chi phí.
                        </p>
                        <a href="#">Xem hướng dẫn về tên</a>
                    </div>

                    {passengers.map((p, i) => {
                        const birthYears = getBirthYears(p.type);
                        const isMinor = p.type === "child" || p.type === "infant";
                        const badgeClass = p.type === "child" ? "child" : p.type === "infant" ? "infant" : "";

                        return (
                            <div key={i}>
                                {i > 0 && <hr className="bf-passenger-separator" />}

                                {/* Header */}
                                <div className="bf-passenger-header">
                                    <span className="bf-passenger-header-title">
                                        Hành khách {i + 1} / {passengerCount}
                                    </span>
                                    <span className={`bf-passenger-type-badge ${badgeClass}`}>
                                        {PASSENGER_TYPE_OPTIONS.find(o => o.value === p.type)?.label}
                                    </span>
                                </div>

                                {/* Giới tính */}
                                <div style={{ marginBottom: "1rem" }}>
                                    <label className="bf-label">Giới tính<em>*</em></label>
                                    <div className="bf-select-wrap">
                                        <select
                                            className={`bf-select${errors[`passenger_${i}_gender`] ? " err" : ""}`}
                                            value={p.gender}
                                            onChange={e => onPassengerChange(i, "gender", e.target.value)}
                                        >
                                            <option value=""></option>
                                            <option value="male">Nam (Mr)</option>
                                            <option value="female">Nữ (Ms/Mrs)</option>
                                        </select>
                                    </div>
                                    {errors[`passenger_${i}_gender`] && (
                                        <div className="bf-err">{errors[`passenger_${i}_gender`]}</div>
                                    )}
                                </div>

                                {/* Họ | Tên */}
                                <div className="bf-grid2" style={{ marginTop: 0 }}>
                                    <div>
                                        <label className="bf-label">Họ (vd: NGUYEN)<em>*</em></label>
                                        <input
                                            className={`bf-input${errors[`passenger_${i}_lastName`] ? " err" : ""}`}
                                            value={p.lastName}
                                            onChange={e => onPassengerChange(i, "lastName", e.target.value.toUpperCase())}
                                            placeholder="NGUYEN"
                                        />
                                        <div className="bf-hint">như trên CMND (không dấu)</div>
                                        {errors[`passenger_${i}_lastName`] && (
                                            <div className="bf-err">{errors[`passenger_${i}_lastName`]}</div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="bf-label">Chữ đệm và tên (vd: VAN ANH)<em>*</em></label>
                                        <input
                                            className={`bf-input${errors[`passenger_${i}_firstName`] ? " err" : ""}`}
                                            value={p.firstName}
                                            onChange={e => onPassengerChange(i, "firstName", e.target.value.toUpperCase())}
                                            placeholder="VAN ANH"
                                        />
                                        <div className="bf-hint">như trên CMND (không dấu)</div>
                                        {errors[`passenger_${i}_firstName`] && (
                                            <div className="bf-err">{errors[`passenger_${i}_firstName`]}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Ngày sinh | Quốc tịch (quốc tịch chỉ cần cho bay quốc tế) */}
                                <div className="bf-grid2" style={{ marginTop: "1rem" }}>
                                    <div>
                                        <label className="bf-label">Ngày sinh</label>
                                        <div className="bf-date-row">
                                            <div className="bf-select-wrap">
                                                <select
                                                    className="bf-select"
                                                    value={p.birthDay}
                                                    onChange={e => onPassengerChange(i, "birthDay", e.target.value)}
                                                >
                                                    <option value="">Ngày</option>
                                                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            </div>
                                            <div className="bf-select-wrap">
                                                <select
                                                    className="bf-select"
                                                    value={p.birthMonth}
                                                    onChange={e => onPassengerChange(i, "birthMonth", e.target.value)}
                                                >
                                                    <option value="">Tháng</option>
                                                    {MONTHS.map((m, mi) => (
                                                        <option key={mi} value={String(mi + 1).padStart(2, "0")}>{m}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="bf-select-wrap">
                                                <select
                                                    className="bf-select"
                                                    value={p.birthYear}
                                                    onChange={e => onPassengerChange(i, "birthYear", e.target.value)}
                                                >
                                                    <option value="">Năm</option>
                                                    {birthYears.map(y => <option key={y} value={String(y)}>{y}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="bf-hint">
                                            {p.type === "adult" && "Trên 12 tuổi"}
                                            {p.type === "child" && "Từ 2 đến 11 tuổi"}
                                            {p.type === "infant" && "Dưới 2 tuổi"}
                                        </div>
                                    </div>
                                    {isInternational && (
                                        <div>
                                            <label className="bf-label">Quốc tịch<em>*</em></label>
                                            <div className="bf-select-wrap">
                                                <select
                                                    className={`bf-select${errors[`passenger_${i}_nationality`] ? " err" : ""}`}
                                                    value={p.nationality}
                                                    onChange={e => onPassengerChange(i, "nationality", e.target.value)}
                                                >
                                                    <option value=""></option>
                                                    {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                                                </select>
                                            </div>
                                            {errors[`passenger_${i}_nationality`] && (
                                                <div className="bf-err">{errors[`passenger_${i}_nationality`]}</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Giấy tờ tùy thân: CCCD nội địa / Hộ chiếu quốc tế */}
                                <div className="bf-passport-section">
                                    {isInternational ? (
                                        <>
                                            <div className="bf-title" style={{ fontSize: "0.92rem", marginBottom: "0.75rem" }}>
                                                🛂 Hộ chiếu — {getPassengerLabel(p.type, i)}
                                            </div>
                                            <div className="bf-passport-note">
                                                Nếu hành khách chưa có hộ chiếu hoặc hộ chiếu đã hết hạn, bạn vẫn có thể tiếp tục đặt vé.{" "}
                                                <a href="#">Tìm hiểu thêm</a>
                                            </div>
                                            <div style={{ marginBottom: "1rem" }}>
                                                <label className="bf-label">Số hộ chiếu<em>*</em></label>
                                                <input
                                                    className={`bf-input${errors[`passenger_${i}_passportNumber`] ? " err" : ""}`}
                                                    value={p.passportNumber}
                                                    onChange={e => onPassengerChange(i, "passportNumber", e.target.value.toUpperCase())}
                                                    placeholder="VD: B1234567"
                                                />
                                                {isMinor && (
                                                    <div className="bf-child-note">
                                                        ℹ️ Đối với trẻ em hoặc trẻ sơ sinh, vui lòng nhập giấy tờ của người giám hộ đi cùng.
                                                    </div>
                                                )}
                                                {errors[`passenger_${i}_passportNumber`] && (
                                                    <div className="bf-err">{errors[`passenger_${i}_passportNumber`]}</div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="bf-label">Ngày hết hạn hộ chiếu</label>
                                                <div className="bf-date-row">
                                                    <div className="bf-select-wrap">
                                                        <select className="bf-select" value={p.passportExpDay} onChange={e => onPassengerChange(i, "passportExpDay", e.target.value)}>
                                                            <option value="">Ngày</option>
                                                            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="bf-select-wrap">
                                                        <select className="bf-select" value={p.passportExpMonth} onChange={e => onPassengerChange(i, "passportExpMonth", e.target.value)}>
                                                            <option value="">Tháng</option>
                                                            {MONTHS.map((m, mi) => (
                                                                <option key={mi} value={String(mi + 1).padStart(2, "0")}>{m}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="bf-select-wrap">
                                                        <select className="bf-select" value={p.passportExpYear} onChange={e => onPassengerChange(i, "passportExpYear", e.target.value)}>
                                                            <option value="">Năm</option>
                                                            {PASSPORT_EXP_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="bf-title" style={{ fontSize: "0.92rem", marginBottom: "0.75rem" }}>
                                                🪪 CCCD / CMND — {getPassengerLabel(p.type, i)}
                                            </div>
                                            <div className="bf-passport-note">
                                                Nhập số CCCD/CMND chính xác như trên thẻ. Hành khách cần mang theo giấy tờ gốc khi làm thủ tục.
                                            </div>
                                            <div>
                                                <label className="bf-label">Số CCCD / CMND<em>*</em></label>
                                                <input
                                                    className={`bf-input${errors[`passenger_${i}_passportNumber`] ? " err" : ""}`}
                                                    value={p.passportNumber}
                                                    onChange={e => onPassengerChange(i, "passportNumber", e.target.value.replace(/\D/g, ""))}
                                                    placeholder="VD: 001234567890"
                                                    maxLength={12}
                                                    inputMode="numeric"
                                                />
                                                {isMinor && (
                                                    <div className="bf-child-note">
                                                        ℹ️ Đối với trẻ em dưới 14 tuổi chưa có CCCD, nhập số khai sinh hoặc CCCD của người giám hộ đi cùng.
                                                    </div>
                                                )}
                                                {errors[`passenger_${i}_passportNumber`] && (
                                                    <div className="bf-err">{errors[`passenger_${i}_passportNumber`]}</div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── BUS / TRAIN: Thông tin hành khách ── */}
            {(bookingType === "bus" || bookingType === "train") && (
                <div className="bf-card">
                    <div className="bf-title">
                        {bookingType === "bus" ? "🚌 Thông tin hành khách" : "🚆 Thông tin hành khách"}
                    </div>
                    <div className="bf-sub">Vui lòng điền đầy đủ thông tin cho từng hành khách.</div>

                    {passengers.map((p, i) => {
                        const badgeClass = p.type === "child" ? "child" : p.type === "infant" ? "infant" : "";
                        return (
                            <div key={i}>
                                {i > 0 && <hr className="bf-passenger-separator" />}

                                {/* Header */}
                                <div className="bf-passenger-header">
                                    <span className="bf-passenger-header-title">
                                        Hành khách {i + 1} / {passengerCount}
                                    </span>
                                    <span className={`bf-passenger-type-badge ${badgeClass}`}>
                                        {PASSENGER_TYPE_OPTIONS.find(o => o.value === p.type)?.label}
                                    </span>
                                </div>

                                {/* Loại hành khách */}
                                <div style={{ marginBottom: "1rem" }}>
                                    <label className="bf-label">Loại hành khách<em>*</em></label>
                                    <div className="bf-select-wrap">
                                        <select
                                            className="bf-select"
                                            value={p.type}
                                            onChange={e => onPassengerChange(i, "type", e.target.value)}
                                        >
                                            {PASSENGER_TYPE_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Giới tính | Họ tên */}
                                <div className="bf-grid2" style={{ marginTop: 0 }}>
                                    <div>
                                        <label className="bf-label">Giới tính<em>*</em></label>
                                        <div className="bf-select-wrap">
                                            <select
                                                className={`bf-select${errors[`passenger_${i}_gender`] ? " err" : ""}`}
                                                value={p.gender}
                                                onChange={e => onPassengerChange(i, "gender", e.target.value)}
                                            >
                                                <option value=""></option>
                                                <option value="male">Nam</option>
                                                <option value="female">Nữ</option>
                                            </select>
                                        </div>
                                        {errors[`passenger_${i}_gender`] && (
                                            <div className="bf-err">{errors[`passenger_${i}_gender`]}</div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="bf-label">Họ và tên<em>*</em></label>
                                        <input
                                            className={`bf-input${errors[`passenger_${i}_firstName`] ? " err" : ""}`}
                                            value={p.firstName}
                                            onChange={e => onPassengerChange(i, "firstName", e.target.value)}
                                            placeholder="Nguyễn Văn A"
                                        />
                                        {errors[`passenger_${i}_firstName`] && (
                                            <div className="bf-err">{errors[`passenger_${i}_firstName`]}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Checkbox: đặt cho chính mình — chỉ hiển thị với khách sạn */}
            {bookingType === "hotel" && (
                <div className="bf-card">
                    <hr className="bf-divider" />
                    <label className="bf-check-row" onClick={() => onChange("bookingForSelf", !form.bookingForSelf)}>
                        <div className={`bf-checkbox ${form.bookingForSelf ? "on" : "off"}`}>
                            {form.bookingForSelf && (
                                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                                    <path d="M1 4.5L4 7.5L10 1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                        <span className="bf-check-label">Tôi đặt chỗ cho chính mình</span>
                    </label>

                    {!form.bookingForSelf && (
                        <div style={{ marginTop: "0.75rem" }}>
                            <label className="bf-label">Tên người được đặt<em>*</em></label>
                            <input
                                className={`bf-input${errors.guestName ? " err" : ""}`}
                                value={form.guestName}
                                onChange={e => onChange("guestName", e.target.value)}
                                placeholder="Nhập họ tên người được đặt"
                            />
                            {errors.guestName && <div className="bf-err">{errors.guestName}</div>}
                        </div>
                    )}
                </div>
            )}

            {/* Thông tin Khách hàng — chỉ hiển thị với khách sạn */}
            {bookingType === "hotel" && (
                <div className="bf-card">
                    <div className="bf-title">👤 Thông tin Khách hàng</div>
                    <div className="bf-sub">Vui lòng điền đầy đủ các thông tin để nhận xác nhận đơn hàng</div>
                    <div className="bf-user-row">
                        <span className="bf-user-name">
                            {form.bookingForSelf
                                ? (form.contactName || user?.full_name || user?.email || "—")
                                : (form.guestName || "—")
                            }
                        </span>
                        {user && <Link href="/profile" className="bf-edit-link">Chỉnh sửa</Link>}
                    </div>
                </div>
            )}

            {/* ── FLIGHT ONLY: Nhu yếu phẩm chuyến bay ── */}
            {bookingType === "flight" && (
                <>
                    <div className="bf-passport-remind">
                        <span>ℹ️</span>
                        {isInternational
                            ? <span>Chuyến bay quốc tế — mỗi hành khách phải mang theo <strong>hộ chiếu</strong> còn hiệu lực ít nhất <strong>6 tháng</strong> sau ngày khởi hành.</span>
                            : <span>Chuyến bay nội địa — mỗi hành khách phải mang theo <strong>CCCD/CMND</strong> còn hiệu lực khi làm thủ tục tại sân bay.</span>
                        }
                    </div>

                    <div className="bf-essentials-card">
                        <div className="bf-essentials-header">
                            <span className="bf-essentials-icon">🧳</span>
                            <div>
                                <div className="bf-essentials-title">Hành lý</div>
                                <div className="bf-essentials-sub">Xếp đồ thôi! Bạn có thể mang 20 kg hành lý/khách.</div>
                            </div>
                        </div>
                        <div className="bf-essentials-body">
                            <div className="bf-baggage-label">Hạn mức hành lý hiện tại của bạn</div>
                            <div className="bf-baggage-legs">
                                <div className="bf-baggage-leg">
                                    <div className="bf-baggage-leg-title">
                                        {flightRoute
                                            ? `${flightRoute.fromCity} → ${flightRoute.toCity}`
                                            : "Chuyến đi"}
                                    </div>
                                    <div className="bf-baggage-item">🎒 Khoang 7kg/khách</div>
                                    <div className="bf-baggage-item">🧳 20kg/khách</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Yêu cầu đặc biệt */}
            <div className="bf-card">
                <div className="bf-title">☑ Yêu cầu đặc biệt</div>
                <div className="bf-sub">
                    {bookingType === "hotel" && "Tất cả các yêu cầu đặc biệt tùy thuộc vào tình trạng sẵn có và không được đảm bảo. Nhận phòng sớm hoặc trả phòng muộn có thể phát sinh thêm phí."}
                    {bookingType === "flight" && "Các yêu cầu đặc biệt sẽ được chuyển tới hãng bay. Một số yêu cầu có thể phát sinh phụ phí hoặc tùy thuộc vào tình trạng chỗ trống."}
                    {bookingType === "bus" && "Các yêu cầu đặc biệt tùy thuộc vào tình trạng xe và không được đảm bảo. Vui lòng liên hệ nhà xe để xác nhận thêm."}
                </div>
                <div className="bf-special-grid">
                    {options.map(({ key, label }) => {
                        const checked = form.specialRequests.includes(key);
                        return (
                            <label key={key} className="bf-special-item" onClick={() => toggleSpecial(key)}>
                                <div className={`bf-mini-box${checked ? " on" : ""}`}>
                                    {checked && (
                                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                                {label}
                            </label>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
