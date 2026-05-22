import React, { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { YStack, XStack, Text, Spinner, View } from 'tamagui';
import { ArrowUpRight, ArrowDownLeft, Wallet, Send, DollarSign } from '@tamagui/lucide-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import UserAvatar from '@/shared/ui/UserAvatar';
import { useBalancesStore } from '@/features/balances/model/balances.store';
import type { FriendBalance } from '@/features/balances/api/balances.api';

const formatMoney = (value: number, locale: string = 'en') => {
  const abs = Math.abs(value);
  return abs.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

function FriendBalanceRow({ friend, locale }: { friend: FriendBalance; locale: string }) {
  const { t } = useTranslation();
  const owesMe = friend.balance > 0;
  const color = owesMe ? '#2ECC71' : '#E74C3C';
  const prefix = owesMe ? '+' : '-';
  const createSettlement = useBalancesStore(s => s.createSettlement);

  const handleSettle = async () => {
    if (owesMe) {
      // Remind — just show info for now
      Alert.alert(
        t('balance.remind.title', 'Remind'),
        t('balance.remind.msg', '{{name}} owes you {{amount}} UZS', {
          name: friend.username,
          amount: formatMoney(friend.balance, locale),
        })
      );
    } else {
      // I owe them — create settlement
      Alert.alert(
        t('balance.settle.title', 'Mark as Paid'),
        t('balance.settle.msg', 'Mark {{amount}} UZS to {{name}} as paid?', {
          amount: formatMoney(friend.balance, locale),
          name: friend.username,
        }),
        [
          { text: t('common.cancel', 'Cancel'), style: 'cancel' },
          {
            text: t('balance.settle.confirm', 'Paid'),
            onPress: async () => {
              try {
                await createSettlement({
                  receiverId: friend.friendId,
                  amount: Math.abs(friend.balance),
                  note: 'Marked as paid from app',
                });
              } catch (e) {
                Alert.alert('Error', String(e));
              }
            },
          },
        ]
      );
    }
  };

  return (
    <XStack
      w="100%"
      py="$2.5"
      px="$3"
      ai="center"
      jc="space-between"
      pressStyle={{ opacity: 0.7 }}
      onPress={handleSettle}
    >
      <XStack ai="center" gap="$2.5" f={1}>
        <UserAvatar
          uri={friend.avatarUrl ?? undefined}
          label={(friend.username || 'U').slice(0, 2).toUpperCase()}
          size={36}
          textSize={14}
          backgroundColor="$gray5"
        />
        <YStack f={1}>
          <Text fontSize={14} fontWeight="600" color="$gray12" numberOfLines={1}>
            {friend.username}
          </Text>
          <Text fontSize={11} color="$gray9">
            {friend.uniqueId}
          </Text>
        </YStack>
      </XStack>

      <XStack ai="center" gap="$2">
        <Text fontSize={15} fontWeight="700" color={color}>
          {prefix}{formatMoney(friend.balance, locale)} UZS
        </Text>
        {owesMe ? (
          <Send size={14} color={color} />
        ) : (
          <DollarSign size={14} color={color} />
        )}
      </XStack>
    </XStack>
  );
}

export function BalanceWidget() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'en';

  const totalToReceive = useBalancesStore(s => s.totalToReceive);
  const totalToPay = useBalancesStore(s => s.totalToPay);
  const netBalance = useBalancesStore(s => s.netBalance);
  const balancesByFriend = useBalancesStore(s => s.balancesByFriend);
  const loading = useBalancesStore(s => s.loading);
  const initialized = useBalancesStore(s => s.initialized);
  const error = useBalancesStore(s => s.error);
  const fetchBalances = useBalancesStore(s => s.fetchBalances);
  const forceRefresh = useBalancesStore(s => s.forceRefresh);

  useFocusEffect(
    useCallback(() => {
      forceRefresh();
    }, [forceRefresh])
  );

  const netColor = netBalance >= 0 ? '#2ECC71' : '#E74C3C';
  const netPrefix = netBalance >= 0 ? '+' : '-';

  return (
    <YStack w="100%" gap="$2" mb="$4">
      {/* Summary Card */}
      <YStack
        w="100%"
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
      >
        {/* Title */}
        <XStack ai="center" gap="$2" mb="$3">
          <Wallet size={20} color="$gray11" />
          <Text fontSize={16} fontWeight="700" color="$gray12">
            {t('balance.title', 'Balances')}
          </Text>
          {loading && <Spinner size="small" color="$gray8" />}
        </XStack>

        {error && (
          <Text fontSize={12} color="$red10" mb="$2">{error}</Text>
        )}

        {/* Receive / Pay / Net */}
        <YStack gap="$2">
          <XStack ai="center" jc="space-between">
            <XStack ai="center" gap="$1.5">
              <ArrowDownLeft size={16} color="#2ECC71" />
              <Text fontSize={13} color="$gray10">
                {t('balance.toReceive', 'To receive')}
              </Text>
            </XStack>
            <Text fontSize={15} fontWeight="700" color="#2ECC71">
              +{formatMoney(totalToReceive, locale)} UZS
            </Text>
          </XStack>

          <XStack ai="center" jc="space-between">
            <XStack ai="center" gap="$1.5">
              <ArrowUpRight size={16} color="#E74C3C" />
              <Text fontSize={13} color="$gray10">
                {t('balance.toPay', 'To pay')}
              </Text>
            </XStack>
            <Text fontSize={15} fontWeight="700" color="#E74C3C">
              -{formatMoney(totalToPay, locale)} UZS
            </Text>
          </XStack>

          {/* Separator */}
          <View h={1} bg="$gray4" w="100%" my="$1" />

          <XStack ai="center" jc="space-between">
            <Text fontSize={14} fontWeight="600" color="$gray11">
              {t('balance.net', 'Net balance')}
            </Text>
            <Text fontSize={18} fontWeight="800" color={netColor}>
              {netPrefix}{formatMoney(netBalance, locale)} UZS
            </Text>
          </XStack>
        </YStack>
      </YStack>

      {/* Friends List */}
      {initialized && balancesByFriend.length > 0 && (
        <YStack
          w="100%"
          br={20}
          borderWidth={1}
          borderColor="$gray3"
          py="$1"
          backgroundColor="$color1"
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.04}
          shadowRadius={12}
          elevationAndroid={2}
        >
          {balancesByFriend.map((friend, i) => (
            <React.Fragment key={friend.friendId}>
              <FriendBalanceRow friend={friend} locale={locale} />
              {i < balancesByFriend.length - 1 && (
                <View h={1} bg="$gray3" w="90%" alignSelf="center" />
              )}
            </React.Fragment>
          ))}
        </YStack>
      )}

      {initialized && !loading && balancesByFriend.length === 0 && !error && (
        <Text fontSize={13} color="$gray9" textAlign="center" py="$2">
          {t('balance.empty', 'No balances with friends yet')}
        </Text>
      )}
    </YStack>
  );
}
