import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl } from 'react-native';
import { YStack, XStack, Text, ScrollView, View, Button } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from '@tamagui/lucide-icons';

import UserAvatar from '@/shared/ui/UserAvatar';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';
import type { SessionHistoryEntry, SessionHistoryParticipantLight } from '@/features/sessions/api/history.api';

const BULLET = '\u2022';
const HISTORY_LIMIT = 50;
const DEFAULT_CURRENCY = 'UZS';

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

function AvatarGroup({ participants }: { participants: SessionHistoryParticipantLight[] }) {
  const shown = participants.slice(0, 4);
  const extra = Math.max(0, participants.length - shown.length);
  return (
    <XStack ai="center">
      {shown.map((participant, idx) => (
        <View key={participant.uniqueId ?? idx} ml={idx === 0 ? 0 : -8}>
          <UserAvatar
            uri={participant.avatarUrl ?? undefined}
            label={(participant.username || 'U').slice(0, 1).toUpperCase()}
            size={28}
            textSize={12}
            backgroundColor="$gray5"
          />
        </View>
      ))}
      {extra > 0 && (
        <View
          w={28}
          h={28}
          br={14}
          backgroundColor="#CBD5F5"
          borderWidth={2}
          borderColor="white"
          ml={shown.length === 0 ? 0 : -8}
          ai="center"
          jc="center"
        >
          <Text fontSize={10} color="$gray11">+{extra}</Text>
        </View>
      )}
    </XStack>
  );
}

function HistoryCard({
  title,
  summary,
  amountLabel,
  participants,
  onPress,
}: {
  title: string;
  summary: string;
  amountLabel: string;
  participants: SessionHistoryParticipantLight[];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ width: '100%', opacity: pressed ? 0.9 : 1 })}
    >
      <YStack
        h={110}
        w="100%"
        br={12}
        borderWidth={1}
        borderColor="$gray3"
        p="$3"
        backgroundColor="$color1"
      >
        <XStack jc="space-between" ai="center">
          <YStack>
            <Text fontSize={16} fontWeight="600" lineHeight={19}>
              {title}
            </Text>
            <Text mt="$1" fontSize={12} lineHeight={12} color="$gray10">
              {summary}
            </Text>
          </YStack>
          <Text fontSize={14} lineHeight={22} fontWeight="700" color="#2ECC71">
            {amountLabel}
          </Text>
        </XStack>

        <XStack mt="auto" ai="center">
          <AvatarGroup participants={participants} />
        </XStack>
      </YStack>
    </Pressable>
  );
}

export default function SessionsHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sessions = useSessionsHistoryStore(state => state.sessions);
  const loading = useSessionsHistoryStore(state => state.loading);
  const initialized = useSessionsHistoryStore(state => state.initialized);
  const currentLimit = useSessionsHistoryStore(state => state.limit);
  const error = useSessionsHistoryStore(state => state.error);
  const fetchHistory = useSessionsHistoryStore(state => state.fetchHistory);
  const refreshIfStale = useSessionsHistoryStore(state => state.refreshIfStale);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!initialized || (currentLimit ?? 0) < HISTORY_LIMIT) {
      fetchHistory(HISTORY_LIMIT).catch(() => {});
    } else {
      // если уже инициализировано — подёргаем обновление по давности
      refreshIfStale(15_000, HISTORY_LIMIT).catch(() => {});
    }
  }, [initialized, loading, currentLimit, fetchHistory, refreshIfStale]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchHistory(HISTORY_LIMIT);
    } finally {
      setRefreshing(false);
    }
  }, [fetchHistory]);

  const history = useMemo<SessionHistoryEntry[]>(() => sessions, [sessions]);

  return (
    <YStack f={1} bg="$background" px="$4" pt={(insets?.top ?? 0) + 16}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (insets?.bottom ?? 0) + 300, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <YStack w="100%" gap="$2" mb="$2">
          <Button unstyled alignSelf="flex-start" onPress={() => router.back()} mb="$1">
            <XStack ai="center" gap="$1">
              <ChevronLeft size={20} color="#2ECC71" />
              <Text color="#2ECC71" fontSize={16} fontWeight="600">Ortga</Text>
            </XStack>
          </Button>
          <Text fontSize={24} fontWeight="700">Oxirgi hisoblar</Text>
          <Text fontSize={12} color="$gray10">Hisobotlar tarixi</Text>
        </YStack>

        {loading && (
          <Text color="$gray10" fontSize={14}>
            Yuklanmoqda...
          </Text>
        )}
        {error && (
          <Text color="$red10" fontSize={14}>
            {error}
          </Text>
        )}
        {!loading && !error && !history.length && (
          <Text color="$gray10" fontSize={14}>
            Hali tarix mavjud emas
          </Text>
        )}

        {history.map((bill) => {
          const participants = bill.participants ?? [];
          const dateForSummary = bill.finalizedAt || bill.createdAt;
          const summary = `${formatSessionDate(dateForSummary)} ${BULLET} ${participants.length} ishtirokchi`;
          const totalAmount = bill.grandTotal ?? 0;
          const currency = bill.currency || bill.totals?.currency || bill.payload?.totals?.currency || DEFAULT_CURRENCY;
          const amountLabel = `${currency} ${totalAmount.toLocaleString()}`;
          return (
            <HistoryCard
              key={bill.sessionId}
              title={bill.sessionName || 'Hisob'}
              summary={summary}
              amountLabel={amountLabel}
              participants={participants}
              onPress={() =>
                router.push({
                  pathname: '/tabs/sessions/history/[historyId]',
                  params: { historyId: String(bill.sessionId) },
                })
              }
            />
          );
        })}
      </ScrollView>
    </YStack>
  );
}
