import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
    id: number;
    type: ToastType;
    message: string;
}

let nextId = 0;

interface ToastStore {
    toasts: Toast[];
    show: (type: ToastType, message: string, duration?: number) => void;
    remove: (id: number) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    show: (type, message, duration = 3500) => {
        const id = ++nextId;
        set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), duration);
    },
    remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
    success: (msg: string, d?: number) => useToastStore.getState().show("success", msg, d),
    error:   (msg: string, d?: number) => useToastStore.getState().show("error",   msg, d),
    info:    (msg: string, d?: number) => useToastStore.getState().show("info",    msg, d),
    warning: (msg: string, d?: number) => useToastStore.getState().show("warning", msg, d),
};
