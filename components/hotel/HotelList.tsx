import { Hotel } from "@/types/hotel";
import HotelCard from "./HotelCard";

interface Props {
    hotels: Hotel[];
}

export default function HotelList({ hotels }: Props) {
    if (!hotels || hotels.length === 0) {
        return (
            <div className="text-center py-10 text-gray-500">
                Không tìm thấy khách sạn nào phù hợp.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotels.map((hotel) => (
                <HotelCard key={hotel.hotel_id} hotel={hotel} />
            ))}
        </div>
    );
}