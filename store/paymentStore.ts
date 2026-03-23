import { create } from "zustand";

export interface PaymentInfo {
    bookingId: number;
    totalAmount: number;
    description: string; // e.g. "Vietnam Airlines: Hà Nội → TP.HCM"
    entityType: "hotel" | "flight" | "bus";
}

interface PaymentStore {
    payment: PaymentInfo | null;
    setPayment: (data: PaymentInfo) => void;
    clearPayment: () => void;
}

export const usePaymentStore = create<PaymentStore>((set) => ({
    payment: null,
    setPayment: (data) => set({ payment: data }),
    clearPayment: () => set({ payment: null }),
}));
