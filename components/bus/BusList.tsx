import { Bus } from "@/types/bus";
import BusCard from "./BusCard";

interface Props {
    buses: Bus[];
    passengers?: number;
}

export default function BusList({ buses, passengers = 1 }: Props) {
    if (!buses || buses.length === 0) {
        return (
            <div className="bl-empty">
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🚌</div>
                <p style={{ fontWeight: 600, color: "#1a3c6b" }}>
                    Không tìm thấy chuyến xe phù hợp
                </p>
                <p style={{ fontSize: "0.88rem", marginTop: "0.4rem", color: "#6b8cbf" }}>
                    Thử thay đổi ngày đi hoặc điểm đến
                </p>
            </div>
        );
    }

    return (
        <div className="bl-list">
            {buses.map((bus) => (
                <BusCard key={bus.bus_id} bus={bus} passengers={passengers} />
            ))}
        </div>
    );
}