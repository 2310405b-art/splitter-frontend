import { apiClient } from '@/features/auth/api';

// ─── Types ─────────────────────────────────────────────────────────────

export interface BalanceSummary {
  totalToReceive: number;
  totalToPay: number;
  netBalance: number;
}

export interface FriendBalance {
  friendId: number;
  uniqueId: string;
  username: string;
  avatarUrl: string | null;
  balance: number; // positive = friend owes me, negative = I owe friend
}

export interface BalancesResponse {
  totalToReceive: number;
  totalToPay: number;
  netBalance: number;
  balancesByFriend: FriendBalance[];
}

export interface CreateSettlementRequest {
  receiverId: number;
  amount: number;
  currency?: string;
  note?: string;
}

export interface Settlement {
  id: number;
  senderId: number;
  receiverId: number;
  amount: number;
  currency: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  note?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
}

// ─── API ───────────────────────────────────────────────────────────────

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  return new Error('Unexpected error');
};

export const BalancesApi = {
  /** Get net balances with all friends */
  async getBalances(): Promise<BalancesResponse> {
    try {
      const { data } = await apiClient.get<BalancesResponse>('/balances');
      return data;
    } catch (error) {
      console.error('[BalancesApi] getBalances error:', error);
      throw normalizeError(error);
    }
  },

  /** Create a new settlement (mark as "I paid") */
  async createSettlement(payload: CreateSettlementRequest): Promise<Settlement> {
    try {
      const { data } = await apiClient.post<Settlement>('/settlements', payload);
      return data;
    } catch (error) {
      console.error('[BalancesApi] createSettlement error:', error);
      throw normalizeError(error);
    }
  },

  /** Confirm a pending settlement (receiver confirms) */
  async confirmSettlement(id: number): Promise<Settlement> {
    try {
      const { data } = await apiClient.patch<Settlement>(`/settlements/${id}/confirm`);
      return data;
    } catch (error) {
      console.error('[BalancesApi] confirmSettlement error:', error);
      throw normalizeError(error);
    }
  },

  /** Reject a pending settlement */
  async rejectSettlement(id: number): Promise<Settlement> {
    try {
      const { data } = await apiClient.patch<Settlement>(`/settlements/${id}/reject`);
      return data;
    } catch (error) {
      console.error('[BalancesApi] rejectSettlement error:', error);
      throw normalizeError(error);
    }
  },

  /** Get all settlements for current user */
  async getSettlements(): Promise<Settlement[]> {
    try {
      const { data } = await apiClient.get<Settlement[]>('/settlements');
      return data;
    } catch (error) {
      console.error('[BalancesApi] getSettlements error:', error);
      throw normalizeError(error);
    }
  },
};
