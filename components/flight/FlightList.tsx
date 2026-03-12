import { Flight } from "@/types/flight";
import FlightCard from "./FlightCard";

interface Props {
    flights: Flight[];
}

export default function FlightList({ flights }: Props) {
    if (!flights || flights.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="text-4xl mb-3">✈️</div>
                <h3 className="text-lg font-bold text-gray-900">Không tìm thấy chuyến bay</h3>
                <p className="text-gray-500 mt-1">Vui lòng thử thay đổi điểm đi/đến hoặc ngày bay.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {flights.map((flight) => (
                <FlightCard key={flight.flight_id} flight={flight} />
            ))}
        </div>
    );
}