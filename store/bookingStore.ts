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
    basePrice: number;
    taxAndFees: number;
    originalPrice?: number;
    totalPrice: number;
    checkInTime?: string;
    checkOutTime?: string;
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
    basePrice: number;
    taxAndFees: number;
    totalPrice: number;
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
    basePrice: number;
    taxAndFees: number;
    totalPrice: number;
}

export type BookingData = HotelBooking | FlightBooking | BusBooking;

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
