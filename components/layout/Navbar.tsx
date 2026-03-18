"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useState } from "react";

const NAV_LINKS = [
    { href: "/hotels", label: "Khách sạn", icon: "🏨" },
    { href: "/flights", label: "Máy bay", icon: "✈️" },
    { href: "/buses", label: "Xe khách", icon: "🚌" },
    { href: "/promotion", label: "Khuyến mãi", icon: "🎁" },
];

export default function Navbar() {
    const { user, logout } = useAuthStore();
    const pathname = usePathname();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

                .navbar {
                    background: #fff;
                    border-bottom: 1px solid #e8f0fe;
                    box-shadow: 0 2px 12px rgba(0,82,204,0.07);
                    position: sticky; top: 0; z-index: 100;
                    font-family: 'DM Sans', sans-serif;
                }
                .navbar-inner {
                    max-width: 1280px; margin: 0 auto;
                    padding: 0 1.5rem; height: 64px;
                    display: flex; align-items: center;
                    justify-content: space-between; gap: 1.5rem;
                }

                /* Logo */
                .navbar-logo { flex-shrink: 0; transition: opacity 0.2s; }
                .navbar-logo:hover { opacity: 0.82; }

                /* Nav links */
                .navbar-links {
                    display: flex; align-items: center; gap: 0.15rem;
                    flex: 1; justify-content: center;
                }
                .navbar-link {
                    display: flex; align-items: center; gap: 0.4rem;
                    padding: 0.5rem 0.9rem; border-radius: 10px;
                    font-size: 0.9rem; font-weight: 500; color: #4a5568;
                    text-decoration: none; position: relative;
                    transition: color 0.18s, background 0.18s;
                    white-space: nowrap;
                }
                .navbar-link:hover {
                    color: #0052cc; background: #f0f4ff;
                }
                .navbar-link.active {
                    color: #0052cc; font-weight: 600; background: #e8f0fe;
                }
                .navbar-link.active::after {
                    content: '';
                    position: absolute; bottom: -1px; left: 50%;
                    transform: translateX(-50%);
                    width: 55%; height: 2.5px;
                    background: #0052cc; border-radius: 99px;
                }

                /* Auth */
                .navbar-auth { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }

                /* Wallet */
                .navbar-wallet {
                    display: flex; align-items: center; gap: 0.4rem;
                    background: #f0f4ff; border: 1px solid #c8d8ff;
                    padding: 0.35rem 0.85rem; border-radius: 99px;
                    font-size: 0.82rem; font-weight: 500; color: #0052cc;
                    transition: background 0.18s;
                }
                .navbar-wallet:hover { background: #e0ecff; }

                /* Avatar wrap */
                .navbar-avatar-wrap { position: relative; }
                .navbar-avatar-btn {
                    display: flex; align-items: center; gap: 0.5rem;
                    padding: 0.35rem 0.75rem 0.35rem 0.4rem;
                    border-radius: 99px; border: 1.5px solid #e8f0fe;
                    background: none; cursor: pointer;
                    transition: border-color 0.18s, background 0.18s;
                    font-family: 'DM Sans', sans-serif;
                }
                .navbar-avatar-btn:hover { border-color: #0052cc; background: #f0f4ff; }

                .navbar-avatar-circle {
                    width: 30px; height: 30px; border-radius: 50%;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; font-size: 0.85rem; font-weight: 700;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .navbar-avatar-email {
                    font-size: 0.82rem; color: #1a3c6b;
                    max-width: 120px; overflow: hidden;
                    text-overflow: ellipsis; white-space: nowrap;
                }
                .navbar-avatar-chevron {
                    font-size: 0.6rem; color: #6b8cbf;
                    transition: transform 0.2s;
                }
                .navbar-avatar-wrap.open .navbar-avatar-chevron { transform: rotate(180deg); }

                /* Dropdown */
                .navbar-dropdown {
                    position: absolute; top: calc(100% + 8px); right: 0;
                    background: #fff; border: 1px solid #e8f0fe;
                    border-radius: 14px; padding: 0.5rem; min-width: 210px;
                    box-shadow: 0 8px 32px rgba(0,82,204,0.12);
                    opacity: 0; pointer-events: none;
                    transform: translateY(-6px);
                    transition: opacity 0.18s, transform 0.18s;
                    z-index: 200;
                }
                .navbar-avatar-wrap.open .navbar-dropdown {
                    opacity: 1; pointer-events: all; transform: translateY(0);
                }
                .navbar-dropdown-item {
                    display: flex; align-items: center; gap: 0.6rem;
                    padding: 0.6rem 0.85rem; border-radius: 8px;
                    font-size: 0.88rem; color: #1a3c6b;
                    text-decoration: none; cursor: pointer;
                    transition: background 0.15s;
                    background: none; border: none; width: 100%;
                    font-family: 'DM Sans', sans-serif; text-align: left;
                }
                .navbar-dropdown-item:hover { background: #f0f4ff; color: #0052cc; }
                .navbar-dropdown-item.danger:hover { background: #fff0ee; color: #c0392b; }
                .navbar-dropdown-divider { height: 1px; background: #e8f0fe; margin: 0.35rem 0; }

                /* Login/Register */
                .navbar-btn-outline {
                    padding: 0.45rem 1.1rem;
                    border: 1.5px solid #0052cc; border-radius: 8px;
                    font-size: 0.88rem; font-weight: 500; color: #0052cc;
                    text-decoration: none; background: none;
                    transition: background 0.18s, color 0.18s;
                    white-space: nowrap;
                }
                .navbar-btn-outline:hover { background: #f0f4ff; }

                .navbar-btn-solid {
                    padding: 0.45rem 1.1rem;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    border: none; border-radius: 8px;
                    font-size: 0.88rem; font-weight: 600; color: #fff;
                    text-decoration: none;
                    transition: opacity 0.18s, transform 0.15s; white-space: nowrap;
                }
                .navbar-btn-solid:hover { opacity: 0.88; transform: translateY(-1px); }

                /* Hamburger */
                .navbar-hamburger {
                    display: none; flex-direction: column; gap: 5px;
                    background: none; border: none; cursor: pointer; padding: 4px;
                }
                .navbar-hamburger span {
                    display: block; width: 22px; height: 2px;
                    background: #1a3c6b; border-radius: 99px; transition: all 0.2s;
                }

                /* Mobile menu */
                .navbar-mobile {
                    display: none; background: #fff;
                    border-top: 1px solid #e8f0fe;
                    padding: 0.75rem 1.5rem 1rem;
                    flex-direction: column; gap: 0.25rem;
                }
                .navbar-mobile.open { display: flex; }
                .navbar-mobile-link {
                    display: flex; align-items: center; gap: 0.6rem;
                    padding: 0.65rem 0.9rem; border-radius: 10px;
                    font-size: 0.92rem; font-weight: 500; color: #4a5568;
                    text-decoration: none; transition: background 0.15s, color 0.15s;
                }
                .navbar-mobile-link:hover, .navbar-mobile-link.active {
                    background: #e8f0fe; color: #0052cc;
                }

                @media (max-width: 768px) {
                    .navbar-links { display: none; }
                    .navbar-hamburger { display: flex; }
                }
            `}</style>

            <nav className="navbar">
                <div className="navbar-inner">
                    {/* Logo */}
                    <Link href="/" className="navbar-logo">
                        <Image
                            src="/images/Logo-removebg.png"
                            alt="VIVU Logo"
                            width={90} height={36}
                            style={{ objectFit: "contain" }}
                        />
                    </Link>

                    {/* Desktop links */}
                    <div className="navbar-links">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`navbar-link${pathname === link.href || pathname.startsWith(link.href + "/")
                                    ? " active" : ""
                                    }`}
                            >
                                <span>{link.icon}</span>
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Auth */}
                    <div className="navbar-auth">
                        {!user ? (
                            <>
                                <Link href="/login" className="navbar-btn-outline">Đăng nhập</Link>
                                <Link href="/register" className="navbar-btn-solid">Đăng ký</Link>
                            </>
                        ) : (
                            <>
                                {/* Wallet */}
                                <div className="navbar-wallet">
                                    💰 {(user.wallet ?? 0).toLocaleString("vi-VN")}₫
                                </div>

                                {/* Avatar + Dropdown — click to open */}
                                <div
                                    className={`navbar-avatar-wrap${dropdownOpen ? " open" : ""}`}
                                >
                                    <button
                                        className="navbar-avatar-btn"
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                    >
                                        <div className="navbar-avatar-circle">
                                            {user.email?.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="navbar-avatar-email">{user.email}</span>
                                        <span className="navbar-avatar-chevron">▼</span>
                                    </button>

                                    {/* Backdrop để click ra ngoài thì đóng */}
                                    {dropdownOpen && (
                                        <div
                                            style={{ position: "fixed", inset: 0, zIndex: 199 }}
                                            onClick={() => setDropdownOpen(false)}
                                        />
                                    )}

                                    <div className="navbar-dropdown">
                                        <Link href="/profile" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
                                            👤 Tài khoản của tôi
                                        </Link>
                                        <Link href="/bookings" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
                                            📋 Lịch sử đặt phòng
                                        </Link>
                                        <Link href="/promotions" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
                                            🎁 Ưu đãi của tôi
                                        </Link>
                                        <div className="navbar-dropdown-divider" />
                                        <button
                                            className="navbar-dropdown-item danger"
                                            onClick={() => { logout(); setDropdownOpen(false); }}
                                        >
                                            🚪 Đăng xuất
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Hamburger (mobile) */}
                        <button
                            className="navbar-hamburger"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            aria-label="Menu"
                        >
                            <span /><span /><span />
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                <div className={`navbar-mobile${mobileOpen ? " open" : ""}`}>
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`navbar-mobile-link${pathname === link.href ? " active" : ""}`}
                            onClick={() => setMobileOpen(false)}
                        >
                            {link.icon} {link.label}
                        </Link>
                    ))}
                </div>
            </nav>
        </>
    );
}