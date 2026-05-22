import { apiClient } from '@/features/auth/api';

export interface FriendBalance {
  friendId: number;
  uniqueId: string;
  username: string;
  avatarUrl: string | null;
  balance: number; // positive: friend owes me, negative: I owe friend
}

export interface BalancesResponse {
  totalToReceive: number;
  totalToPay: number;
  netBalance: number;
  balancesByFriend: FriendBalance[];
}

export interface Settlement {
  id: number;
  senderId: number;
  receiverId: number;
  amount: number;
  currency: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  sessionHistoryId: number | null;
  note: string | null;
  createdAt: string;
  confirmedAt: string | null;
  sender?: { id: number; username: string; avatarUrl: string | null };
  receiver?: { id: number; username: string; avatarUrl: string | null };
}

export interface PendingSettlementsResponse {
  toConfirm: Settlement[]; // someone paid me, waiting for my confirmation
  sent: Settlement[]; // I paid someone, waiting for their confirmation
}

export interface SettleUpRequest {
  receiverId: number;
  amount: number;
  method?: string;
  note?: string;
}

/** Get overall balances */
export async function getBalances(): Promise<BalancesResponse> {
  const { data } = await apiClient.get<BalancesResponse>('/balances');
  return data;
}

/** Get pending settlements */
export async function getPendingSettlements(): Promise<PendingSettlementsResponse> {
  const { data } = await apiClient.get<PendingSettlementsResponse>('/settlements/pending');
  return data;
}

/** Settle up (I pay a friend) */
export async function settleUp(payload: SettleUpRequest): Promise<Settlement> {
  const { data } = await apiClient.post<Settlement>('/settlements', payload);
  return data;
}

/** Confirm receiving payment */
export async function confirmSettlement(settlementId: number): Promise<Settlement> {
  const { data } = await apiClient.patch<Settlement>(`/settlements/${settlementId}/confirm`);
  return data;
}

/** Reject a payment claim */
export async function rejectSettlement(settlementId: number): Promise<Settlement> {
  const { data } = await apiClient.patch<Settlement>(`/settlements/${settlementId}/reject`);
  return data;
}
