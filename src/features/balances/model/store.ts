import { create } from 'zustand';
import {
  getBalances,
  getPendingSettlements,
  settleUp,
  confirmSettlement,
  rejectSettlement,
  BalancesResponse,
  PendingSettlementsResponse,
  SettleUpRequest
} from '../api';

interface BalanceState {
  balances: BalancesResponse | null;
  pendingSettlements: PendingSettlementsResponse | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchBalances: () => Promise<void>;
  fetchPendingSettlements: () => Promise<void>;
  fetchAll: () => Promise<void>;
  requestSettleUp: (payload: SettleUpRequest) => Promise<void>;
  handleConfirmSettlement: (id: number) => Promise<void>;
  handleRejectSettlement: (id: number) => Promise<void>;
}

export const useBalanceStore = create<BalanceState>((set, get) => ({
  balances: null,
  pendingSettlements: null,
  isLoading: false,
  error: null,

  fetchBalances: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await getBalances();
      set({ balances: data });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch balances' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPendingSettlements: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await getPendingSettlements();
      set({ pendingSettlements: data });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch pending settlements' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAll: async () => {
    try {
      set({ isLoading: true, error: null });
      const [balances, pending] = await Promise.all([
        getBalances(),
        getPendingSettlements()
      ]);
      set({ balances, pendingSettlements: pending });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch balance data' });
    } finally {
      set({ isLoading: false });
    }
  },

  requestSettleUp: async (payload: SettleUpRequest) => {
    try {
      set({ isLoading: true, error: null });
      await settleUp(payload);
      // Refresh data
      await get().fetchAll();
    } catch (err: any) {
      set({ error: err.message || 'Failed to submit settlement' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  handleConfirmSettlement: async (id: number) => {
    try {
      set({ isLoading: true, error: null });
      await confirmSettlement(id);
      await get().fetchAll();
    } catch (err: any) {
      set({ error: err.message || 'Failed to confirm settlement' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  handleRejectSettlement: async (id: number) => {
    try {
      set({ isLoading: true, error: null });
      await rejectSettlement(id);
      await get().fetchAll();
    } catch (err: any) {
      set({ error: err.message || 'Failed to reject settlement' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  }
}));
