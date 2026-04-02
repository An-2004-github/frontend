export interface Flight {
    flight_id: number;
    airline: string;
    from_city: string;
    to_city: string;
    depart_time: string;
    arrive_time: string;
    price: number;
    available_seats?: number;
    economy_seats?: number;
    business_seats?: number;
    first_seats?: number;
    status?: "active" | "cancelled" | "delayed" | "completed";

    // Tính toán
    duration_minutes?: number;
    min_price?: number;
}

export interface FlightSeat {
    seat_id: number;
    flight_id: number;
    seat_number: string;
    seat_class: "economy" | "business" | "first";
    price_modifier: number;
    is_booked: boolean;
}

export interface FlightSearchParams {
    from_city: string;
    to_city: string;
    depart_date: string;
    return_date?: string;
    passengers?: number;
    trip_type: "one_way" | "round_trip";
}