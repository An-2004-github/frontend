import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/user';
import api from '@/lib/axios';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    hasHydrated: boolean;
    login: (user: User, token: string) => void;
    logout: () => void;
    setHasHydrated: (v: boolean) => void;
    updateUser: (partial: Partial<User>) => void;
    refreshWallet: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
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

            updateUser: (partial) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...partial } : state.user,
                })),

            refreshWallet: async () => {
                if (!get().user) return;
                try {
                    const res = await api.get('/api/auth/me');
                    if (res.data?.wallet !== undefined) {
                        set((state) => ({
                            user: state.user ? { ...state.user, wallet: res.data.wallet } : state.user,
                        }));
                    }
                } catch { /* ignore */ }
            },
        }),
        {
            name: 'auth-storage',
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
