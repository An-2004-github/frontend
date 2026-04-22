export interface Hotel {
    hotel_id: number;
    destination_id: number;

    name: string;
    address: string;
    description?: string;
    amenities?: string[];        // JSON array từ DB
    avg_rating?: number;
    review_count?: number;

    // Thêm từ ALTER TABLE trước đó
    star_rating?: number;
    stars?: number;              // alias phòng trường hợp DB dùng tên khác
    check_in_time?: string;
    check_out_time?: string;

    // JOIN từ room_types (tính trong query)
    price_per_night?: number;
    min_price?: number;
    total_rooms?: number;
    available_rooms?: number;
    max_guest_capacity?: number;

    // JOIN từ destinations
    destination_name?: string;
    destination_city?: string;

    // JOIN từ images (polymorphic)
    image_url?: string;
    images?: string[];           // dùng ở trang detail

    // Chính sách hoàn tiền của khách sạn
    allows_refund?: boolean;

    // Dùng ở trang detail
    room_types?: RoomType[];
}

export interface RoomType {
    room_type_id: number;
    hotel_id: number;
    name: string;
    price_per_night: number;
    max_guests: number;
    total_rooms?: number;
    available_rooms?: number;
    check_in_time?: string;
    check_out_time?: string;
    image_url?: string;
}