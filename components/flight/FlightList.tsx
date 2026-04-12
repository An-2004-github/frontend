import { Flight } from "@/types/flight";
import FlightCard from "./FlightCard";

interface Props {
    flights: Flight[];
    passengers?: number;
    adults?: number;
    childrenCount?: number;
    infants?: number;
}

export default function FlightList({ flights, passengers = 1, adults = 1, childrenCount = 0, infants = 0 }: Props) {
    if (!flights || flights.length === 0) {
        return (
            <div className="fl-empty">
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✈️</div>
                <p style={{ fontWeight: 600, color: "#1a3c6b" }}>Không tìm thấy chuyến bay phù hợp</p>
                <p style={{ fontSize: "0.88rem", marginTop: "0.4rem", color: "#6b8cbf" }}>Thử thay đổi ngày bay hoặc điểm đến</p>
            </div>
        );
    }

    return (
        <div className="fl-list">
            {flights.map((flight) => (
                <FlightCard
                    key={flight.flight_id}
                    flight={flight}
                    passengers={passengers}
                    adults={adults}
                    childrenCount={childrenCount}
                    infants={infants}
                />
            ))}
        </div>
    );
}
