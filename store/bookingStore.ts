import { create } from "zustand";

export interface HotelBooking {
    type: "hotel";
    hotelId: number;
    hotelName: string;
    roomTypeId: number;
    roomName: string;
    quantity: number;
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    adultsCount: number;
    childrenCount: number;
    basePrice: number;
    taxAndFees: number;
    originalPrice?: number;
    totalPrice: number;
    checkInTime?: string;
    checkOutTime?: string;
    allowsRefund?: boolean;
    allowsReschedule?: boolean;
}

export interface FlightBooking {
    type: "flight";
    flightId: number;
    airline: string;
    fromCity: string;
    toCity: string;
    departTime: string;
    arriveTime: string;
    seatClass: string;
    passengers: number;
    adultsCount: number;
    childrenCount: number;
    infantsCount: number;
    basePrice: number;
    taxAndFees: number;
    totalPrice: number;
    isInternational: boolean;
}

export interface BusBooking {
    type: "bus";
    busId: number;
    company: string;
    fromCity: string;
    toCity: string;
    departTime: string;
    arriveTime: string;
    passengers: number;
    seatClass?: string;
    basePrice: number;
    taxAndFees: number;
    totalPrice: number;
}

export interface TrainBooking {
    type: "train";
    trainId: number;
    trainCode: string;
    fromCity: string;
    toCity: string;
    fromStation: string;
    toStation: string;
    departTime: string;
    arriveTime: string;
    seatClass: string;
    seatClassName: string;
    passengers: number;
    basePrice: number;
    taxAndFees: number;
    totalPrice: number;
}

export type BookingData = HotelBooking | FlightBooking | BusBooking | TrainBooking;

interface BookingStore {
    booking: BookingData | null;
    setBooking: (data: BookingData) => void;
    clearBooking: () => void;
}

export const useBookingStore = create<BookingStore>((set) => ({
    booking: null,
    setBooking: (data) => set({ booking: data }),
    clearBooking: () => set({ booking: null }),
}));
