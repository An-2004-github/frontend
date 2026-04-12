export type SeatClass = "hard_seat" | "soft_seat" | "hard_sleeper" | "soft_sleeper";

export interface TrainSeatClassInfo {
    seat_class: SeatClass;
    total: number;
    available: number;
    price: number;
}

export interface Train {
    train_id: number;
    train_code: string;
    from_city: string;
    to_city: string;
    from_station: string;
    to_station: string;
    depart_time: string;
    arrive_time: string;
    price: number;
    status: "active" | "cancelled" | "completed";
    duration_minutes: number;
    available_seats: number;
    // per-class info from search endpoint
    hard_seat_count?: number;
    hard_seat_price?: number;
    soft_seat_count?: number;
    soft_seat_price?: number;
    hard_sleeper_count?: number;
    hard_sleeper_price?: number;
    soft_sleeper_count?: number;
    soft_sleeper_price?: number;
}

export interface TrainDetail extends Train {
    seat_classes: TrainSeatClassInfo[];
}

export interface TrainSearchParams {
    from_city?: string;
    to_city?: string;
    depart_date?: string;
    seat_class?: SeatClass;
    min_price?: number;
    max_price?: number;
    sort?: "price_asc" | "price_desc" | "depart_asc" | "duration";
}
