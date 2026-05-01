"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Promotion } from "@/types/promotion";
import { promotionService } from "@/services/promotionService";

interface Props {
    appliesTo: "flight" | "bus" | "train";
}

const CONFIG = {
    flight: { prefix: "fp", icon: "✈️", label: "Ưu đãi vé máy bay" },
    bus:    { prefix: "bp", icon: "🚌", label: "Ưu đãi vé xe khách" },
    train:  { prefix: "tp", icon: "🚆", label: "Ưu đãi vé tàu hỏa" },
};

export default function PromoSection({ appliesTo }: Props) {
    const [promos, setPromos] = useState<Promotion[]>([]);
    const { prefix, icon, label } = CONFIG[appliesTo];

    useEffect(() => {
        Promise.all([
            promotionService.getPromotions(appliesTo),
            promotionService.getPromotions("all"),
        ])
            .then(([specific, all]) => {
                const seen = new Set<number>();
                const merged = [...specific, ...all].filter(p => {
                    if (seen.has(p.promo_id) || p.status !== "active") return false;
                    seen.add(p.promo_id);
                    return true;
                });
                setPromos(merged.slice(0, 6));
            })
            .catch(() => { });
    }, [appliesTo]);

    if (promos.length === 0) return null;

    return (
        <>
            <div className={`${prefix}-section-header`}>
                <div className={`${prefix}-section-title`}>🎁 {label}</div>
                <Link href="/promotion" className={`${prefix}-section-link`}>Xem tất cả →</Link>
            </div>
            <div className={`${prefix}-promo-strip`}>
                {promos.map((p) => (
                    <div key={p.promo_id} className={`${prefix}-promo-card`}>
                        <div className={`${prefix}-promo-card-icon`}>{icon}</div>
                        <div className={`${prefix}-promo-card-info`}>
                            <div className={`${prefix}-promo-card-discount`}>
                                {p.discount_type === "percent"
                                    ? `Giảm ${p.discount_percent}% · Tối đa ${(p.max_discount / 1000).toFixed(0)}K`
                                    : `Giảm ${(p.max_discount / 1000).toFixed(0)}K`}
                            </div>
                            <div className={`${prefix}-promo-card-code`}>{p.code}</div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
