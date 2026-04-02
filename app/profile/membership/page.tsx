"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";

interface RankInfo {
    rank: string;
    rank_label: string;
    total_spent: number;
    cashback_rate: number;
    next_rank: string | null;
    next_rank_label: string | null;
    next_threshold: number | null;
    progress_pct: number;
}

const RANK_COLORS: Record<string, { bg: string; accent: string }> = {
    bronze:  { bg: "linear-gradient(135deg,#a0522d,#cd853f)", accent: "#f5deb3" },
    silver:  { bg: "linear-gradient(135deg,#607d8b,#90a4ae)", accent: "#eceff1" },
    gold:    { bg: "linear-gradient(135deg,#b8860b,#daa520)", accent: "#fff8dc" },
    diamond: { bg: "linear-gradient(135deg,#1a3c6b,#0052cc)", accent: "#e3f0ff" },
};

const TIERS = [
    {
        rank: "bronze",
        label: "🥉 Đồng",
        threshold: "0 – 4.999.999₫",
        benefits: [
            "Tích 0.5% vào ví mỗi đơn",
            "Phí hủy phòng 30% (< 3 ngày)",
        ],
    },
    {
        rank: "silver",
        label: "🥈 Bạc",
        threshold: "5.000.000 – 19.999.999₫",
        benefits: [
            "Tích 1% vào ví mỗi đơn",
            "Phí hủy phòng 20% (< 3 ngày)",
            "Hỗ trợ ưu tiên",
        ],
    },
    {
        rank: "gold",
        label: "🥇 Vàng",
        threshold: "20.000.000 – 49.999.999₫",
        benefits: [
            "Tích 1.5% vào ví mỗi đơn",
            "Phí hủy phòng 10% (< 3 ngày)",
            "Đổi lịch ưu đãi",
        ],
    },
    {
        rank: "diamond",
        label: "💎 Kim cương",
        threshold: "Từ 50.000.000₫",
        benefits: [
            "Tích 2% vào ví mỗi đơn",
            "Miễn phí hủy trước 1 ngày",
            "Hoàn tiền ngay vào ví",
            "Hỗ trợ 24/7",
        ],
    },
];

export default function MembershipPage() {
    const [rankInfo, setRankInfo] = useState<RankInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/api/auth/rank")
            .then(r => setRankInfo(r.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const colors = RANK_COLORS[rankInfo?.rank ?? "bronze"];

    return (
        <>
            <style>{`
                .mem-title { font-family:'Nunito',sans-serif; font-size:1.2rem; font-weight:800; color:#1a3c6b; margin-bottom:1.25rem; }
                .mem-hero { border-radius:16px; padding:1.75rem 1.5rem; color:#fff; margin-bottom:1.25rem; }
                .mem-hero-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem; }
                .mem-hero-rank { font-family:'Nunito',sans-serif; font-size:1.6rem; font-weight:800; }
                .mem-hero-cashback { font-size:0.85rem; background:rgba(255,255,255,0.2); padding:0.3rem 0.85rem; border-radius:99px; }
                .mem-hero-spent { font-size:0.85rem; opacity:0.85; margin-bottom:0.6rem; }
                .mem-bar-wrap { background:rgba(255,255,255,0.25); border-radius:99px; height:10px; overflow:hidden; margin-bottom:0.5rem; }
                .mem-bar { height:100%; border-radius:99px; background:rgba(255,255,255,0.9); transition:width 0.7s ease; }
                .mem-bar-labels { display:flex; justify-content:space-between; font-size:0.75rem; opacity:0.8; }
                .mem-card { background:#fff; border-radius:16px; border:1px solid #e8f0fe; padding:1.25rem 1.5rem; margin-bottom:1rem; }
                .mem-card-title { font-family:'Nunito',sans-serif; font-size:0.95rem; font-weight:700; color:#1a3c6b; margin-bottom:1rem; padding-bottom:0.6rem; border-bottom:2px solid #e8f0fe; }
                .mem-tiers { display:flex; flex-direction:column; gap:0.75rem; }
                .mem-tier { border-radius:12px; padding:1rem 1.25rem; border:2px solid transparent; }
                .mem-tier.active { border-color:#0052cc; }
                .mem-tier-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:0.5rem; }
                .mem-tier-label { font-family:'Nunito',sans-serif; font-size:1rem; font-weight:700; }
                .mem-tier-threshold { font-size:0.75rem; color:#6b8cbf; }
                .mem-tier-current { font-size:0.72rem; font-weight:700; background:#0052cc; color:#fff; padding:0.2rem 0.6rem; border-radius:99px; }
                .mem-tier-benefits { display:flex; flex-direction:column; gap:0.3rem; }
                .mem-tier-benefit { font-size:0.82rem; color:#444; display:flex; align-items:center; gap:0.4rem; }
                .mem-spinner { display:flex; justify-content:center; padding:3rem; }
                .mem-spinner-dot { width:32px; height:32px; border:3px solid #e8f0fe; border-top-color:#0052cc; border-radius:50%; animation:spin 0.8s linear infinite; }
                @keyframes spin { to { transform:rotate(360deg); } }
                @media (max-width:600px) { .mem-hero { padding:1.25rem 1rem; } }
            `}</style>

            <div className="mem-title">🏅 Hạng thành viên</div>

            {loading ? (
                <div className="mem-spinner"><div className="mem-spinner-dot" /></div>
            ) : rankInfo && (
                <>
                    {/* Hero card */}
                    <div className="mem-hero" style={{ background: colors.bg }}>
                        <div className="mem-hero-top">
                            <div className="mem-hero-rank">{rankInfo.rank_label}</div>
                            <div className="mem-hero-cashback">Cashback {(rankInfo.cashback_rate * 100).toFixed(1)}% / đơn</div>
                        </div>
                        <div className="mem-hero-spent">
                            Tổng chi tiêu: <strong>{rankInfo.total_spent.toLocaleString("vi-VN")}₫</strong>
                        </div>
                        {rankInfo.next_threshold ? (
                            <>
                                <div className="mem-bar-wrap">
                                    <div className="mem-bar" style={{ width: `${rankInfo.progress_pct}%` }} />
                                </div>
                                <div className="mem-bar-labels">
                                    <span>{rankInfo.rank_label}</span>
                                    <span>Còn {(rankInfo.next_threshold - rankInfo.total_spent).toLocaleString("vi-VN")}₫ → {rankInfo.next_rank_label}</span>
                                </div>
                            </>
                        ) : (
                            <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>Bạn đã đạt hạng cao nhất! 🎉</div>
                        )}
                    </div>

                    {/* Bảng quyền lợi tất cả hạng */}
                    <div className="mem-card">
                        <div className="mem-card-title">Quyền lợi theo hạng</div>
                        <div className="mem-tiers">
                            {TIERS.map(tier => {
                                const c = RANK_COLORS[tier.rank];
                                const isActive = tier.rank === rankInfo.rank;
                                return (
                                    <div
                                        key={tier.rank}
                                        className={`mem-tier${isActive ? " active" : ""}`}
                                        style={{ background: c.accent }}
                                    >
                                        <div className="mem-tier-top">
                                            <div className="mem-tier-label">{tier.label}</div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                <div className="mem-tier-threshold">{tier.threshold}</div>
                                                {isActive && <div className="mem-tier-current">Hạng hiện tại</div>}
                                            </div>
                                        </div>
                                        <div className="mem-tier-benefits">
                                            {tier.benefits.map(b => (
                                                <div key={b} className="mem-tier-benefit">✓ {b}</div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
