import { Promotion } from "@/types/promotion";
import PromotionCard from "./promotionCard";

interface Props {
    promotions: Promotion[];
}

export default function PromotionList({ promotions }: Props) {
    if (!promotions || promotions.length === 0) {
        return (
            <div className="pp-empty">
                <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</p>
                <p>Chưa có ưu đãi nào cho mục này</p>
            </div>
        );
    }

    return (
        <div className="pp-grid">
            {promotions.map((promo) => (
                <PromotionCard key={promo.promo_id} promo={promo} />
            ))}
        </div>
    );
}