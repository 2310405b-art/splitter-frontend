import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, ScrollView, Button } from 'tamagui';
import { ChevronDown, ChevronUp } from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import UserAvatar from '@/shared/ui/UserAvatar';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';
import type {
  SessionHistoryEntry,
  SessionHistoryAllocation,
  SessionHistoryItem,
  SessionHistoryParticipantLight,
  SessionHistoryTotalsByParticipant,
} from '@/features/sessions/api/history.api';

const DEFAULT_CURRENCY = 'UZS';
const fmtCurrency = (value: number, currency: string) => `${currency} ${value.toLocaleString()}`;
const BULLET = '\u2022';
const DETAIL_LIMIT = 50;

const formatSessionDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

type ParticipantView = {
  participant: SessionHistoryParticipantLight;
  avatarUrl?: string | null;
  amount: number;
  items: {
    id: string;
    title: string;
    price: number;
  }[];
};

const buildParticipantsView = (bill?: SessionHistoryEntry): ParticipantView[] => {
  if (!bill) return [];

  const payload = bill.payload as any;
  const byParticipantList = bill.totals?.byParticipant ?? payload?.totalsByParticipant ?? [];
  const byItemList = bill.totals?.byItem ?? payload?.totalsByItem ?? [];
  const allocationsList = bill.allocations ?? payload?.allocations ?? [];

  const totalsByParticipant = new Map<string, any>();
  byParticipantList.forEach((item: any) => {
    totalsByParticipant.set(item.uniqueId, item);
  });

  const itemsById = new Map<string, any>();
  byItemList.forEach((item: any) => {
    itemsById.set(item.itemId || item.id, item);
  });

  const allocationsByParticipant = new Map<string, any[]>();
  allocationsList.forEach((alloc: any) => {
    const collection = allocationsByParticipant.get(alloc.participantId) ?? [];
    collection.push(alloc);
    allocationsByParticipant.set(alloc.participantId, collection);
  });

  return (bill.participants ?? []).map(p => {
    const totals = totalsByParticipant.get(p.uniqueId);
    const allocations = allocationsByParticipant.get(p.uniqueId) ?? [];
    const items = allocations.map((allocation: any, index: number) => {
      const itemMeta = itemsById.get(allocation.itemId);
      return {
        id: `${allocation.itemId}-${p.uniqueId}-${index}`,
        title: itemMeta?.name || 'Tovar',
        price: allocation.shareAmount,
      };
    });
    return {
      participant: {
        uniqueId: p.uniqueId,
        username: totals?.username || p.username || 'U',
        avatarUrl: p.avatarUrl ?? null,
      },
      avatarUrl: p.avatarUrl ?? null,
      amount: totals?.amountOwed ?? totals?.amount ?? 0,
      items,
    };
  });
};

export default function HistoryDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { historyId } = useLocalSearchParams<{ historyId: string }>();
  const router = useRouter();
  const [showItems, setShowItems] = useState(false);
  const sessions = useSessionsHistoryStore(state => state.sessions);
  const loading = useSessionsHistoryStore(state => state.loading);
  const initialized = useSessionsHistoryStore(state => state.initialized);
  const currentLimit = useSessionsHistoryStore(state => state.limit);
  const error = useSessionsHistoryStore(state => state.error);
  const fetchHistory = useSessionsHistoryStore(state => state.fetchHistory);

  const bill: SessionHistoryEntry | undefined = useMemo(() => {
    if (!historyId) return undefined;
    const id = Number(historyId);
    if (Number.isNaN(id)) return undefined;
    return sessions.find(session => session.sessionId === id);
  }, [historyId, sessions]);

  useEffect(() => {
    if (loading) return;
    const hasBill = Boolean(bill);
    if (!initialized || (!hasBill && (currentLimit ?? 0) < DETAIL_LIMIT)) {
      fetchHistory(DETAIL_LIMIT).catch(() => {});
    }
  }, [initialized, loading, currentLimit, fetchHistory, bill]);

  const participants = useMemo(() => buildParticipantsView(bill), [bill]);
  
  const byItemList = useMemo(() => {
    if (!bill) return [];
    return bill.totals?.byItem ?? (bill.payload as any)?.totalsByItem ?? [];
  }, [bill]);

  const currency =
    bill?.currency ||
    bill?.totals?.currency ||
    bill?.payload?.totals?.currency ||
    DEFAULT_CURRENCY;

  if (!bill && loading) {
    return (
      <YStack f={1} bg="$background" ai="center" jc="center">
        <Text fontSize={16}>Yuklanmoqda...</Text>
      </YStack>
    );
  }

  if (!bill) {
    return (
      <YStack f={1} bg="$background" ai="center" jc="center" gap="$3">
        <Text fontSize={16} fontWeight="600">History not found</Text>
        {error && (
          <Text fontSize={14} color="$red10">
            {error}
          </Text>
        )}
        <Button onPress={() => router.back()}>Go back</Button>
      </YStack>
    );
  }

  return (
    <YStack f={1} bg="$background" px="$4" pt="$4">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (insets?.bottom ?? 0) + 300, gap: 16 }}
      >
        <YStack w="100%" gap="$3">
          <Text fontSize={24} fontWeight="700">{bill.sessionName || 'Hisob'}</Text>
          <Button unstyled alignSelf="flex-start" onPress={() => router.back()}>
            <Text color="#2ECC71">{'< Ortga'}</Text>
          </Button>
          <Text fontSize={14} color="$gray10">
            {`${formatSessionDate(bill.finalizedAt || bill.createdAt)} ${BULLET} ${(bill.participants ?? []).length} ishtirokchi`}
          </Text>
          <Text fontSize={16} fontWeight="700" color="#2ECC71">
            {fmtCurrency(bill.grandTotal ?? 0, currency)}
          </Text>
        </YStack>

        {participants.map(({ participant, avatarUrl, amount, items }) => (
          <YStack
            key={participant.uniqueId}
            w="100%"
            borderWidth={1}
            borderColor="#2ECC71"
            br={12}
            bg="$color1"
            px={16}
            py={12}
            gap="$3"
          >
            <XStack jc="space-between" ai="center">
              <XStack ai="center" gap="$2">
                <UserAvatar
                  uri={avatarUrl ?? undefined}
                  label={(participant.username || 'U').slice(0, 1).toUpperCase()}
                  size={40}
                  textSize={16}
                  backgroundColor="$gray5"
                />
                <Text fontSize={16} fontWeight="600">{participant.username}</Text>
              </XStack>
              <Text fontSize={16} fontWeight="700" color="#2ECC71">
                {fmtCurrency(amount, currency)}
              </Text>
            </XStack>

            <YStack gap={8}>
              {items.length ? (
                items.map(item => (
                  <XStack key={item.id} jc="space-between" ai="center" gap="$2">
                    <Text fontSize={14} numberOfLines={1} f={1} mr="$2">{item.title}</Text>
                    <Text fontSize={14} fontWeight="600" color="#2ECC71" shrink={0}>
                      {item.price.toLocaleString()}
                    </Text>
                  </XStack>
                ))
              ) : (
                <Text fontSize={12} color="$gray9">
                  Hech qanday element biriktirilmagan
                </Text>
              )}
            </YStack>
          </YStack>
        ))}

        {/* Narsalar ro'yxati (All items) - Collapsible Accordion */}
        {byItemList.length > 0 && (
          <YStack
            w="100%"
            borderWidth={1}
            borderColor="$gray3"
            br={16}
            bg="$color1"
            overflow="hidden"
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.04}
            shadowRadius={10}
            elevationAndroid={2}
          >
            {/* Header / Toggle Button */}
            <XStack
              onPress={() => setShowItems(!showItems)}
              p="$4"
              jc="space-between"
              ai="center"
              backgroundColor="$color1"
              pressStyle={{ backgroundColor: '$gray1' }}
            >
              <Text fontSize={16} fontWeight="700" color="$gray12">
                Narsalar ro'yxati ({byItemList.length})
              </Text>
              {showItems ? (
                <ChevronUp size={20} color="#2ECC71" />
              ) : (
                <ChevronDown size={20} color="#2ECC71" />
              )}
            </XStack>

            {/* Collapsible Content list */}
            {showItems && (
              <YStack px="$4" pb="$4" gap={12} borderTopWidth={1} borderColor="$gray3">
                {byItemList.map((item: any) => (
                  <XStack key={item.itemId || item.id} jc="space-between" ai="center" gap="$2">
                    <Text fontSize={14} color="$gray11" numberOfLines={1} f={1} mr="$2">{item.name}</Text>
                    <Text fontSize={14} fontWeight="700" color="#2ECC71" shrink={0}>
                      {fmtCurrency(item.total || item.totalPrice, currency)}
                    </Text>
                  </XStack>
                ))}
              </YStack>
            )}
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}
