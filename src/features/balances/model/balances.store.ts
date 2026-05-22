import { create } from 'zustand';
import {
  BalancesApi,
  type BalancesResponse,
  type FriendBalance,
  type CreateSettlementRequest,
  type Settlement,
} from '@/features/balances/api/balances.api';

// ─── State ─────────────────────────────────────────────────────────────

type State = {
  totalToReceive: number;
  totalToPay: number;
  netBalance: number;
  balancesByFriend: FriendBalance[];
  pendingSettlements: Settlement[];
  loading: boolean;
  initialized: boolean;
  error?: string;
  lastFetchedAt?: number | null;
};

type Actions = {
  fetchBalances: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  refreshIfStale: (maxAgeMs?: number) => Promise<void>;
  createSettlement: (payload: CreateSettlementRequest) => Promise<Settlement>;
  confirmSettlement: (id: number) => Promise<void>;
  rejectSettlement: (id: number) => Promise<void>;
  clearError: () => void;
  reset: () => void;
};

const initialState: State = {
  totalToReceive: 0,
  totalToPay: 0,
  netBalance: 0,
  balancesByFriend: [],
  pendingSettlements: [],
  loading: false,
  initialized: false,
  error: undefined,
  lastFetchedAt: null,
};

// ─── Store ─────────────────────────────────────────────────────────────

export const useBalancesStore = create<State & Actions>((set, get) => ({
  ...initialState,

  async fetchBalances() {
    const { loading } = get();
    if (loading) return;

    set({ loading: true, error: undefined });

    try {
      const data = await BalancesApi.getBalances();

      set({
        totalToReceive: data.totalToReceive,
        totalToPay: data.totalToPay,
        netBalance: data.netBalance,
        balancesByFriend: data.balancesByFriend,
        initialized: true,
        loading: false,
        lastFetchedAt: Date.now(),
      });
    } catch (error: any) {
      set({
        error: error?.message ?? 'Failed to load balances',
        initialized: true,
        loading: false,
      });
      console.error('Failed to fetch balances:', error);
    }
  },

  async forceRefresh() {
    return get().fetchBalances();
  },

  async refreshIfStale(maxAgeMs = 30_000) {
    const { lastFetchedAt, initialized } = get();

    if (!initialized || !lastFetchedAt) {
      await get().fetchBalances();
      return;
    }

    const age = Date.now() - lastFetchedAt;
    if (age > maxAgeMs) {
      await get().fetchBalances();
    }
  },

  async createSettlement(payload) {
    const settlement = await BalancesApi.createSettlement(payload);
    // Refresh balances after creating settlement
    await get().fetchBalances();
    return settlement;
  },

  async confirmSettlement(id) {
    await BalancesApi.confirmSettlement(id);
    await get().fetchBalances();
  },

  async rejectSettlement(id) {
    await BalancesApi.rejectSettlement(id);
    await get().fetchBalances();
  },

  clearError() {
    set({ error: undefined });
  },

  reset() {
    set(initialState);
  },
}));
