export interface Bus {
    bus_id: number;
    company: string;
    from_city: string;
    to_city: string;
    depart_time: string;
    arrive_time: string;
    price: number;
    available_seats?: number;
    standard_seats?: number;
    vip_seats?: number;
    sleeper_seats?: number;
    status?: "active" | "cancelled" | "completed";
    duration_minutes?: number;
}

export interface BusSeat {
    seat_id: number;
    bus_id: number;
    seat_number: string;
    seat_class: "standard" | "vip" | "sleeper";
    price_modifier: number;
    is_booked: boolean;
}

export interface BusSearchParams {
    from_city: string;
    to_city: string;
    depart_date: string;
    passengers?: number;
}