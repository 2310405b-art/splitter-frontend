import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { YStack, XStack, Text, View, Circle, ScrollView } from 'tamagui';
import { ScanLine, Users, UserPlus, RefreshCw, Edit3, History, ChevronRight } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';

import { ScreenContainer } from '@/shared/ui/ScreenContainer';
import UserAvatar from '@/shared/ui/UserAvatar';
import type { SessionHistoryEntry } from '@/features/sessions/api/history.api';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';
import { useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';
import { ReceiptApi } from '@/features/receipt/api/receipt.api';
import { BalanceWidget } from '@/features/balances/ui/BalanceWidget';

const HOME_HISTORY_LIMIT = 10;
const DEFAULT_CURRENCY = 'UZS';

const formatSessionDate = (value?: string, locale: string = 'en') => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  };
  try {
    return date.toLocaleString(locale, options);
  } catch {
    return date.toLocaleString(undefined, options);
  }
};

function ActionButton({
  title,
  icon,
  onPress,
  width = 112,
}: {
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
  width?: number;
}) {
  return (
    <XStack
      onPress={onPress}
      width={width}
      height={48}
      borderRadius={12}
      alignItems="center"
      justifyContent="center"
      gap={6}
      borderWidth={1}
      borderColor="$gray6"
      backgroundColor="transparent"
      pressStyle={{ backgroundColor: '$gray2' }}
      hoverStyle={{ backgroundColor: '$gray2' }}
      focusStyle={{ borderColor: '$gray7' }}
    >
      {icon}
      <Text fontSize={12} fontWeight="600">{title}</Text>
    </XStack>
  );
}

function AvatarStack({ participants }: { participants: { uniqueId: string; username: string; avatarUrl?: string | null }[] }) {
  const shown = participants.slice(0, 3);
  const extra = Math.max(0, participants.length - shown.length);

  return (
    <XStack w={92} h={28} ai="center">
      {shown.map((p, i) => (
        <View key={p.uniqueId ?? i} ml={i === 0 ? 0 : -8}>
          <UserAvatar
            uri={p.avatarUrl ?? undefined}
            label={(p.username || 'U').slice(0, 2).toUpperCase()}
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
          backgroundColor="$gray3"
          borderWidth={2}
          borderColor="white"
          ml={shown.length === 0 ? 0 : -8}
          ai="center"
          jc="center"
        >
          <Text fontSize={10} color="$gray11">
            +{extra}
          </Text>
        </View>
      )}
    </XStack>
  );
}

function BillCard({
  title,
  date,
  participantsLabel,
  amountLabel,
  participants,
  onPress,
}: {
  title: string;
  date: string;
  participantsLabel: string;
  amountLabel: string;
  participants: { uniqueId: string; username: string; avatarUrl?: string | null }[];
  onPress?: () => void;
}) {
  return (
    <YStack
      onPress={onPress}
      disabled={!onPress}
      w="100%"
      h={115}
      br={20}
      borderWidth={1}
      borderColor="$gray3"
      p="$4"
      backgroundColor="$color1"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 6 }}
      shadowOpacity={0.06}
      shadowRadius={16}
      elevationAndroid={3}
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      hoverStyle={{ scale: 1.01 }}
    >
      <XStack jc="space-between" ai="flex-start">
        <YStack gap="$1.5" f={1} mr="$2">
          {/* Sana yozilgan to'rtburchak (Date Badge) */}
          <XStack
            px="$2.5"
            py="$1"
            bg="#2ECC7115"
            br={6}
            alignSelf="flex-start"
            ai="center"
            jc="center"
          >
            <Text fontSize={10} fontWeight="700" color="#2ECC71">
              {date}
            </Text>
          </XStack>
          <Text fontSize={16} fontWeight="700" lineHeight={19} color="$gray12" numberOfLines={1}>
            {title}
          </Text>
        </YStack>
        
        <YStack ai="flex-end" gap="$1">
          <Text fontSize={16} fontWeight="800" color="#2ECC71">
            {amountLabel}
          </Text>
          <Text fontSize={11} color="$gray10">
            {participantsLabel}
          </Text>
        </YStack>
      </XStack>

      <XStack mt="auto" jc="space-between" ai="center">
        <AvatarStack participants={participants} />
        <ChevronRight size={16} color="$gray8" />
      </XStack>
    </YStack>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const sessions = useSessionsHistoryStore(state => state.sessions);
  const loading = useSessionsHistoryStore(state => state.loading);
  const initialized = useSessionsHistoryStore(state => state.initialized);
  const currentLimit = useSessionsHistoryStore(state => state.limit);
  const error = useSessionsHistoryStore(state => state.error);
  const fetchHistory = useSessionsHistoryStore(state => state.fetchHistory);
  const refreshIfStale = useSessionsHistoryStore(state => state.refreshIfStale);
  const forceRefresh = useSessionsHistoryStore(state => state.forceRefresh);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (hasFetchedRef.current) return;
    if (!initialized || (currentLimit ?? 0) < HOME_HISTORY_LIMIT) {
      hasFetchedRef.current = true;
      fetchHistory(HOME_HISTORY_LIMIT).catch(() => {
        hasFetchedRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, loading, currentLimit]);

  useFocusEffect(
    useCallback(() => {
      forceRefresh(HOME_HISTORY_LIMIT).catch(() => {});
    }, [forceRefresh])
  );

  const onManualRefresh = useCallback(() => {
    forceRefresh(HOME_HISTORY_LIMIT).catch(() => {});
  }, [forceRefresh]);

  const openFriends = () => router.push('/tabs/friends');
  const openGroups = () => router.push('/tabs/groups');
  const onScan = () => router.push('/tabs/scan-receipt');
  const onManualCreate = async () => {
    useReceiptSessionStore.getState().reset();
    let uniqueSessionId = Math.floor(100000 + Math.random() * 900000);
    try {
      const response = await ReceiptApi.createSession();
      if (response && response.id) {
        uniqueSessionId = response.id;
      }
    } catch (err) {
      console.warn('Failed to create backend session for manual bill, using random ID:', err);
    }
    useReceiptSessionStore.setState({
      session: {
        sessionId: uniqueSessionId,
        sessionName: t('home.manual.defaultName', 'Manual Bill'),
        language: i18n.language || 'en',
      },
      items: [],
      participants: [],
      currency: 'UZS',
    });
    router.push('/tabs/sessions/verify-items');
  };
  const openAllSessions = () => router.push('/tabs/sessions/history');

  const recent = useMemo<SessionHistoryEntry[]>(() => sessions.slice(0, HOME_HISTORY_LIMIT), [sessions]);

  return (
    <ScrollView
      w="100%"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 320 }}
    >
      <ScreenContainer>
        <YStack ai="center" bg="$background" w="100%">
        <XStack gap="$6" ai="center" mt="$6" mb="$4">
          <YStack ai="center">
            <Circle
              onPress={onScan}
              size={64}
              bg="#2ECC71"
              ai="center"
              jc="center"
              elevationAndroid={4}
              pressStyle={{ scale: 0.95 }}
            >
              <ScanLine size={26} color="white" />
            </Circle>
            <Text mt="$2" color="$gray10" fontSize={13}>
              {t('home.scan.cta', 'Scan receipt')}
            </Text>
          </YStack>

          <YStack ai="center">
            <Circle
              onPress={onManualCreate}
              size={64}
              bg="#3498DB"
              ai="center"
              jc="center"
              elevationAndroid={4}
              pressStyle={{ scale: 0.95 }}
            >
              <Edit3 size={26} color="white" />
            </Circle>
            <Text mt="$2" color="$gray10" fontSize={13}>
              {t('home.manual.cta', 'Manual bill')}
            </Text>
          </YStack>
        </XStack>

        <XStack w="100%" jc="space-between" mb="$5">
          <ActionButton
            title={t('home.actions.friends', 'Friends')}
            icon={<Users size={18} />}
            onPress={openFriends}
            width={112}
          />
          <ActionButton
            title={t('home.actions.groups', 'Groups')}
            icon={<UserPlus size={18} />}
            onPress={openGroups}
            width={112}
          />
          <ActionButton
            title={t('home.actions.history', 'History')}
            icon={<History size={18} />}
            onPress={openAllSessions}
            width={112}
          />
        </XStack>

        <BalanceWidget />

        <XStack w="100%" jc="space-between" ai="center" mb="$3">
          <Text fontSize={18} fontWeight="600">
            {t('home.recent.title', 'Recent bills')}
          </Text>

          {/* Справа: только иконка Refresh + кнопка Show more */}
          <XStack ai="center" gap="$3">
            <Pressable
              onPress={onManualRefresh}
              disabled={loading}
              accessibilityLabel="Refresh recent bills"
            >
              <XStack ai="center" opacity={loading ? 0.6 : 1}>
                <RefreshCw size={18} />
              </XStack>
            </Pressable>

            <Pressable onPress={openAllSessions}>
              <Text color="#2ECC71">
                {t('home.recent.showMore', 'Show more')}
              </Text>
            </Pressable>
          </XStack>
        </XStack>

        <YStack w="100%" gap="$3" pb="$6">
          {loading && (
            <Text color="$gray10" fontSize={14}>
              {t('home.recent.loading', 'Loading recent bills...')}
            </Text>
          )}
          {error && (
            <Text color="$red10" fontSize={14}>
              {error}
            </Text>
          )}
          {!loading && !error && !recent.length && (
            <Text color="$gray10" fontSize={14}>
              {t('home.recent.empty', 'No bills yet')}
            </Text>
          )}
          {recent.map((bill) => {
            const participantsLabel = t('home.recent.participants', {
              count: (bill.participants ?? []).length,
              defaultValue: `${(bill.participants ?? []).length} participants`,
            });
            const dateForSummary = bill.finalizedAt || bill.createdAt;
            const dateStr = formatSessionDate(dateForSummary, i18n.language);
            const totalAmount = bill.grandTotal ?? 0;
            const currency = bill.currency || bill.payload?.totals?.currency || DEFAULT_CURRENCY;
            const amountLabel = `${totalAmount.toLocaleString(i18n.language ?? 'en', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })} ${currency}`;

            return (
              <BillCard
                key={bill.sessionId}
                title={bill.sessionName || t('home.recent.fallbackName', 'Bill')}
                date={dateStr}
                participantsLabel={participantsLabel}
                amountLabel={amountLabel}
                participants={bill.participants ?? []}
                onPress={() =>
                  router.push({
                    pathname: '/tabs/sessions/history/[historyId]',
                    params: { historyId: String(bill.sessionId) },
                  })
                }
              />
            );
          })}
        </YStack>
      </YStack>
      </ScreenContainer>
    </ScrollView>
  );
}
