"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

const MENU_ITEMS = [
    { href: "/profile", icon: "⚙️", label: "Tài khoản" },
    { href: "/profile/bookings", icon: "🗂️", label: "Đặt chỗ của tôi" },
    { href: "/profile/transactions", icon: "📋", label: "Danh sách giao dịch" },
    { href: "/profile/wallet", icon: "💰", label: "Ví của tôi" },
    { href: "/profile/notifications", icon: "🔔", label: "Cài đặt thông báo" },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, logout } = useAuthStore();

    const RANK_LABELS: Record<string, string> = {
        bronze: "🥉 Đồng", silver: "🥈 Bạc", gold: "🥇 Vàng", diamond: "💎 Kim cương",
    };
    const rankLabel = RANK_LABELS[(user as { user_rank?: string })?.user_rank ?? "bronze"] ?? "🥉 Đồng";

    const initials = (user?.full_name ?? user?.email ?? "U")
        .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
                * { box-sizing: border-box; }

                .pl-root {
                    min-height: 100vh; background: #f0f4ff;
                    font-family: 'DM Sans', sans-serif;
                }
                .pl-inner {
                    max-width: 1100px; margin: 0 auto;
                    padding: 2rem 1.5rem 4rem;
                    display: flex; gap: 1.5rem; align-items: flex-start;
                }

                /* ── SIDEBAR ── */
                .pl-sidebar {
                    width: 280px; flex-shrink: 0;
                    position: sticky; top: 80px;
                }

                /* User card */
                .pl-user-card {
                    background: #fff; border-radius: 16px;
                    border: 1px solid #e8f0fe; padding: 1.25rem;
                    margin-bottom: 0.75rem;
                }
                .pl-user-row {
                    display: flex; align-items: center; gap: 0.85rem;
                    margin-bottom: 1rem;
                }
                .pl-avatar {
                    width: 48px; height: 48px; border-radius: 50%;
                    background: linear-gradient(135deg, #0052cc, #0065ff);
                    color: #fff; font-family: 'Nunito', sans-serif;
                    font-size: 1.1rem; font-weight: 800;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .pl-user-name {
                    font-family: 'Nunito', sans-serif;
                    font-size: 0.95rem; font-weight: 700; color: #1a3c6b;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .pl-user-provider {
                    font-size: 0.75rem; color: #6b8cbf; margin-top: 0.1rem;
                }

                /* Member badge */
                .pl-member-badge {
                    display: flex; align-items: center; justify-content: space-between;
                    background: linear-gradient(135deg, #b8860b, #d4a050);
                    border-radius: 10px; padding: 0.7rem 1rem;
                    color: #fff; text-decoration: none;
                    transition: opacity 0.15s;
                }
                .pl-member-badge:hover { opacity: 0.9; }
                .pl-member-text { font-size: 0.85rem; font-weight: 600; }
                .pl-member-arrow { font-size: 0.9rem; opacity: 0.8; }

                /* Nav */
                .pl-nav {
                    background: #fff; border-radius: 16px;
                    border: 1px solid #e8f0fe; overflow: hidden;
                }
                .pl-nav-item {
                    display: flex; align-items: center; gap: 0.75rem;
                    padding: 0.85rem 1.1rem;
                    font-size: 0.9rem; color: #4a5568;
                    text-decoration: none; cursor: pointer;
                    border: none; background: none; width: 100%; text-align: left;
                    font-family: 'DM Sans', sans-serif;
                    transition: background 0.15s, color 0.15s;
                    border-bottom: 1px solid #f0f4ff;
                }
                .pl-nav-item:last-child { border-bottom: none; }
                .pl-nav-item:hover { background: #f0f4ff; color: #0052cc; }
                .pl-nav-item.active {
                    background: #0052cc; color: #fff; font-weight: 600;
                }
                .pl-nav-item.active:hover { background: #0041a8; }
                .pl-nav-icon { font-size: 1rem; flex-shrink: 0; width: 20px; text-align: center; }

                .pl-nav-divider { height: 1px; background: #e8f0fe; }

                /* Logout */
                .pl-logout {
                    display: flex; align-items: center; gap: 0.75rem;
                    padding: 0.85rem 1.1rem;
                    font-size: 0.9rem; color: #c0392b;
                    cursor: pointer; border: none; background: none;
                    width: 100%; text-align: left;
                    font-family: 'DM Sans', sans-serif;
                    transition: background 0.15s;
                }
                .pl-logout:hover { background: #fff0ee; }

                /* ── CONTENT ── */
                .pl-content { flex: 1; min-width: 0; }

                @media (max-width: 768px) {
                    .pl-inner { flex-direction: column; }
                    .pl-sidebar { width: 100%; position: static; }
                }
            `}</style>

            <div className="pl-root">
                <div className="pl-inner">
                    {/* SIDEBAR */}
                    <aside className="pl-sidebar">
                        {/* User card */}
                        <div className="pl-user-card">
                            <div className="pl-user-row">
                                <div className="pl-avatar">{initials}</div>
                                <div>
                                    <div className="pl-user-name">
                                        {user?.full_name ?? user?.email ?? "Người dùng"}
                                    </div>
                                    <div className="pl-user-provider">
                                        {user?.provider === "google" ? "Google" : "Tài khoản thường"}
                                    </div>
                                </div>
                            </div>
                            <Link href="/profile/membership" className="pl-member-badge">
                                <span className="pl-member-text">Bạn là thành viên {rankLabel}</span>
                                <span className="pl-member-arrow">›</span>
                            </Link>
                        </div>

                        {/* Nav */}
                        <nav className="pl-nav">
                            {MENU_ITEMS.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`pl-nav-item${pathname === item.href ? " active" : ""}`}
                                >
                                    <span className="pl-nav-icon">{item.icon}</span>
                                    {item.label}
                                </Link>
                            ))}
                            <div className="pl-nav-divider" />
                            <button className="pl-logout" onClick={logout}>
                                <span className="pl-nav-icon">🚪</span>
                                Đăng xuất
                            </button>
                        </nav>
                    </aside>

                    {/* CONTENT */}
                    <div className="pl-content">{children}</div>
                </div>
            </div>
        </>
    );
}