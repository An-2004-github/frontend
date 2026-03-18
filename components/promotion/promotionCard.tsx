"use client";

import { useState } from "react";
import { Promotion } from "@/types/promotion";

interface Props {
    promo: Promotion;
}

// ✅ Khai báo ngoài component — không nằm trong render, React không bắt lỗi
const NOW = new Date();
const SEVEN_DAYS_LATER = new Date(NOW.getTime() + 7 * 86400000);

export default function PromotionCard({ promo }: Props) {
    const [copied, setCopied] = useState(false);

    const usagePercent = Math.round((promo.used_count / promo.usage_limit) * 100);
    const isAlmostGone = usagePercent >= 80;
    const isExpiringSoon = new Date(promo.expired_at) <= SEVEN_DAYS_LATER;
    const isInactive = promo.status !== "active";

    const handleCopy = () => {
        navigator.clipboard.writeText(promo.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`pcard${isInactive ? " pcard--inactive" : ""}`}>
            {/* Top */}
            <div className="pcard-top">
                <div className="pcard-top-pattern" />
                <div className="pcard-top-corner" />
                <div className="pcard-discount" style={{ position: "relative" }}>
                    <span className="pcard-discount-value">
                        {promo.discount_type === "percent"
                            ? `-${promo.discount_percent}%`
                            : `-${promo.max_discount.toLocaleString("vi-VN")}₫`}
                    </span>
                    {promo.discount_type === "percent" && (
                        <span className="pcard-discount-max">
                            Tối đa {promo.max_discount.toLocaleString("vi-VN")}₫
                        </span>
                    )}
                    <div className="pcard-badges">
                        {isAlmostGone && !isInactive && (
                            <span className="pcard-badge pcard-badge--hot">🔥 Sắp hết</span>
                        )}
                        {isExpiringSoon && !isInactive && (
                            <span className="pcard-badge pcard-badge--expiring">⏰ Sắp hết hạn</span>
                        )}
                        {isInactive && (
                            <span className="pcard-badge pcard-badge--inactive">Hết lượt</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Ticket notch */}
            <div className="pcard-notch">
                <div className="pcard-notch-line" />
            </div>

            {/* Body */}
            <div className="pcard-body">
                <div className="pcard-code-row">
                    <span className="pcard-code">{promo.code}</span>
                    <button
                        className={`pcard-copy-btn${copied ? " pcard-copy-btn--copied" : ""}`}
                        onClick={handleCopy}
                        disabled={isInactive}
                    >
                        {copied ? "✓ Đã sao chép" : "Sao chép"}
                    </button>
                </div>

                <div className="pcard-meta">
                    <span>Đơn từ {promo.min_order_value.toLocaleString("vi-VN")}₫</span>
                    <span className="pcard-meta-dot">·</span>
                    <span>HSD: {new Date(promo.expired_at).toLocaleDateString("vi-VN")}</span>
                </div>

                <div className="pcard-usage">
                    <div className="pcard-usage-bar">
                        <div
                            className={`pcard-usage-fill${isAlmostGone ? " pcard-usage-fill--hot" : ""}`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>
                    <span className="pcard-usage-text">
                        Đã dùng {promo.used_count}/{promo.usage_limit} lượt
                    </span>
                </div>
            </div>
        </div>
    );
}