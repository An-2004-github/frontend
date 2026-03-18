import { Hotel } from "@/types/hotel";
import HotelCard from "./HotelCard";

interface Props {
    hotels: Hotel[];
}

export default function HotelList({ hotels }: Props) {
    if (!hotels || hotels.length === 0) {
        return (
            <div className="h-empty">
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔍</div>
                <p style={{ fontWeight: 600, color: "#1a3c6b" }}>Không tìm thấy khách sạn phù hợp</p>
                <p style={{ fontSize: "0.88rem", marginTop: "0.4rem", color: "#6b8cbf" }}>
                    Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                </p>
            </div>
        );
    }

    return (
        <div className="h-grid">
            {hotels.map((hotel) => (
                <HotelCard key={hotel.hotel_id} hotel={hotel} />
            ))}
        </div>
    );
}