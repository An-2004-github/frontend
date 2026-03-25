import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/user';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    hasHydrated: boolean;
    login: (user: User, token: string) => void;
    logout: () => void;
    setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            hasHydrated: false,

            login: (user, token) => {
                set({ user, token, isAuthenticated: true });
            },

            logout: () => {
                set({ user: null, token: null, isAuthenticated: false });
            },

            setHasHydrated: (v) => set({ hasHydrated: v }),
        }),
        {
            name: 'auth-storage',
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);