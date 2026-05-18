import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Alert } from 'react-native';
import { YStack, XStack, Text, Button, ScrollView, Input, Circle, Sheet, Separator } from 'tamagui';
import { ChevronLeft, Plus, X, Check, Users } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { useFriendsStore } from '@/features/friends/model/friends.store';

// ==================== COLORS ====================
const PERSON_COLORS = [
  '#2ECC71', '#3498DB', '#E74C3C', '#F39C12',
  '#9B59B6', '#1ABC9C', '#E67E22', '#2980B9',
  '#C0392B', '#16A085', '#8E44AD', '#D35400',
];

// ==================== TYPES ====================
type Person = {
  id: string;
  name: string;
  color: string;
};

type ItemAssignment = Record<string, string[]>; // itemId -> person ids

// ==================== HELPERS ====================
const fmt = (n: number, currency: string) =>
  `${currency} ${Math.round(n).toLocaleString('en-US')}`;

// ==================== COMPONENT ====================
export default function SimpleSplitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const storeItems = useReceiptSessionStore((s) => s.items);
  const session = useReceiptSessionStore((s) => s.session);
  const currency = useReceiptSessionStore((s) => s.currency) || 'UZS';
  const setLastFinishPayload = useReceiptSessionStore((s) => s.setLastFinishPayload);

  const me = useAppStore((s) => s.user);
  const myName = me?.username || 'Men';

  // -------- Friends from account --------
  const { friends, fetchAll: fetchFriends } = useFriendsStore();
  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  // -------- People State --------
  const [people, setPeople] = useState<Person[]>([
    { id: 'me', name: myName, color: PERSON_COLORS[0] },
  ]);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newName, setNewName] = useState('');

  // -------- Assignment State --------
  // { itemId: [personId, personId, ...] }
  const [assignments, setAssignments] = useState<ItemAssignment>({});

  // -------- Add Person --------
  const addPerson = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const id = `person-${Date.now()}`;
    const colorIndex = people.length % PERSON_COLORS.length;
    setPeople((prev) => [...prev, { id, name: trimmed, color: PERSON_COLORS[colorIndex] }]);
    setNewName('');
    setShowAddSheet(false);
  }, [newName, people.length]);

  // -------- Add Friend from account --------
  const addFriendAsPerson = useCallback((friendName: string, friendUid: string) => {
    // Check if already added
    if (people.some((p) => p.id === friendUid || p.name === friendName)) return;
    const colorIndex = people.length % PERSON_COLORS.length;
    setPeople((prev) => [...prev, { id: friendUid, name: friendName, color: PERSON_COLORS[colorIndex] }]);
    setShowAddSheet(false);
  }, [people]);

  // Friends not yet added to the split
  const availableFriends = useMemo(() => {
    const addedIds = new Set(people.map((p) => p.id));
    const addedNames = new Set(people.map((p) => p.name.toLowerCase()));
    return (friends || []).filter((f: any) => {
      const uid = f?.user?.uniqueId || f?.uniqueId || '';
      const name = f?.user?.username || f?.username || '';
      return uid && !addedIds.has(uid) && !addedNames.has(name.toLowerCase());
    }).map((f: any) => ({
      uid: f?.user?.uniqueId || f?.uniqueId || '',
      name: f?.user?.username || f?.username || f?.user?.uniqueId || '',
    }));
  }, [friends, people]);

  // -------- Remove Person --------
  const removePerson = useCallback((personId: string) => {
    if (personId === 'me') return; // can't remove yourself
    Alert.alert(
      "O'chirish",
      t('split.deleteConfirm'),
      [
        { text: t('split.no'), style: 'cancel' },
        {
          text: t('split.yes'),
          style: 'destructive',
          onPress: () => {
            setPeople((prev) => prev.filter((p) => p.id !== personId));
            // Remove from all assignments
            setAssignments((prev) => {
              const next = { ...prev };
              for (const itemId of Object.keys(next)) {
                next[itemId] = next[itemId].filter((id) => id !== personId);
              }
              return next;
            });
          },
        },
      ]
    );
  }, []);

  // -------- Toggle Assignment --------
  const toggleAssignment = useCallback((itemId: string, personId: string) => {
    setAssignments((prev) => {
      const current = prev[itemId] || [];
      const has = current.includes(personId);
      return {
        ...prev,
        [itemId]: has
          ? current.filter((id) => id !== personId)
          : [...current, personId],
      };
    });
  }, []);

  // -------- Compute Totals --------
  const personTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    people.forEach((p) => { totals[p.id] = 0; });

    storeItems.forEach((item) => {
      const assigned = assignments[item.id] || [];
      if (assigned.length === 0) return;
      const itemTotal = item.totalPrice || (item.unitPrice * item.quantity);
      const perPerson = itemTotal / assigned.length;
      assigned.forEach((pid) => {
        totals[pid] = (totals[pid] || 0) + perPerson;
      });
    });

    return totals;
  }, [people, storeItems, assignments]);

  const grandTotal = storeItems.reduce(
    (acc, it) => acc + (it.totalPrice || it.unitPrice * it.quantity), 0
  );

  const assignedTotal = Object.values(personTotals).reduce((a, b) => a + b, 0);
  const unassignedCount = storeItems.filter((it) => !(assignments[it.id]?.length > 0)).length;

  // -------- Finish --------
  const handleFinish = useCallback(() => {
    if (unassignedCount > 0) {
      Alert.alert(
        t('split.attention'),
        t('split.unassignedAlert', { count: unassignedCount }),
        [
          { text: t('split.no'), style: 'cancel' },
          { text: t('split.yes'), onPress: doFinish },
        ]
      );
    } else {
      doFinish();
    }
  }, [unassignedCount, personTotals, people, storeItems, assignments, currency, session]);

  const doFinish = useCallback(() => {
    const participants = people.map((p) => ({
      uniqueId: p.id === 'me' ? (me?.uniqueId || 'me') : p.id,
      username: p.name,
    }));

    const totalsByParticipant = participants.map((p) => ({
      uniqueId: p.uniqueId,
      username: p.username,
      amountOwed: personTotals[people.find(pp => pp.name === p.username)?.id || p.uniqueId] || 0,
    }));

    const totalsByItem = storeItems.map((item) => ({
      itemId: item.id,
      name: item.name,
      total: item.totalPrice || item.unitPrice * item.quantity,
    }));

    const allocations = storeItems.flatMap((item) => {
      const assigned = assignments[item.id] || [];
      if (assigned.length === 0) return [];
      const itemTotal = item.totalPrice || item.unitPrice * item.quantity;
      const perPerson = itemTotal / assigned.length;
      return assigned.map((pid) => ({
        itemId: item.id,
        participantId: pid === 'me' ? (me?.uniqueId || 'me') : pid,
        shareAmount: perPerson,
        shareRatio: 1 / assigned.length,
      }));
    });

    const payload = {
      sessionId: session?.sessionId,
      sessionName: session?.sessionName,
      participants,
      totalsByParticipant,
      totalsByItem,
      allocations,
      grandTotal,
      currency,
      status: 'COMPLETED',
    };

    setLastFinishPayload(payload);
    router.push('/tabs/sessions/finish');
  }, [people, storeItems, assignments, personTotals, grandTotal, currency, session, me, setLastFinishPayload, router]);

  // ==================== RENDER ====================
  return (
    <YStack f={1} bg="$background">
      {/* ====== HEADER ====== */}
      <YStack bg="$background" p="$4" pb="$2" borderBottomWidth={1} borderColor="$gray4">
        <XStack w="100%" ai="center" jc="space-between" mb="$2">
          <Button size="$3" chromeless onPress={() => router.back()} icon={<ChevronLeft size={24} />} ml="$-3" />
          <YStack ai="center">
            <Text fontSize={18} fontWeight="700">{t('split.title')}</Text>
            <Text fontSize={12} color="$gray10">{session?.sessionName || 'Receipt'}</Text>
          </YStack>
          <YStack w={48} />
        </XStack>

        {/* ====== PEOPLE CHIPS ====== */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} mb="$2">
          <XStack gap="$2" ai="center" py="$1">
            {people.map((person) => (
              <Pressable
                key={person.id}
                onLongPress={() => removePerson(person.id)}
              >
                <XStack
                  ai="center"
                  gap="$2"
                  bg={person.color + '20'}
                  borderColor={person.color}
                  borderWidth={1.5}
                  borderRadius={20}
                  px="$3"
                  py="$1.5"
                >
                  <Circle size={24} bg={person.color}>
                    <Text color="white" fontWeight="700" fontSize={12}>
                      {person.name[0].toUpperCase()}
                    </Text>
                  </Circle>
                  <Text fontSize={14} fontWeight="600" color={person.color}>
                    {person.name}
                  </Text>
                  {person.id !== 'me' && (
                    <Pressable onPress={() => removePerson(person.id)} hitSlop={8}>
                      <X size={14} color={person.color} />
                    </Pressable>
                  )}
                </XStack>
              </Pressable>
            ))}
            {/* Add Person Button */}
            <Pressable onPress={() => setShowAddSheet(true)}>
              <XStack
                ai="center"
                gap="$1"
                borderWidth={1.5}
                borderColor="$gray6"
                borderRadius={20}
                borderStyle="dashed"
                px="$3"
                py="$1.5"
              >
                <Plus size={16} color="$gray10" />
                <Text fontSize={14} color="$gray10">{t('split.addBtn')}</Text>
              </XStack>
            </Pressable>
          </XStack>
        </ScrollView>
      </YStack>

      {/* ====== ITEMS LIST ====== */}
      <ScrollView
        f={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (insets?.bottom ?? 0) + 220, paddingHorizontal: 16, paddingTop: 12 }}
      >
        <YStack gap="$3">
          {storeItems.map((item) => {
            const itemTotal = item.totalPrice || (item.unitPrice * item.quantity);
            const assigned = assignments[item.id] || [];
            const perPerson = assigned.length > 0 ? itemTotal / assigned.length : 0;

            return (
              <YStack
                key={item.id}
                bg="$color1"
                p="$3"
                borderRadius={14}
                borderWidth={1}
                borderColor={assigned.length > 0 ? '#2ECC7140' : '$gray5'}
              >
                {/* Item name + price */}
                <XStack jc="space-between" ai="center" mb="$2">
                  <YStack f={1}>
                    <Text fontSize={16} fontWeight="600">{item.name}</Text>
                    {item.quantity > 1 && (
                      <Text fontSize={12} color="$gray10">
                        {item.quantity} x {fmt(item.unitPrice, currency)}
                      </Text>
                    )}
                  </YStack>
                  <Text fontSize={16} fontWeight="700">{fmt(itemTotal, currency)}</Text>
                </XStack>

                {/* Person circles */}
                <XStack gap="$2" flexWrap="wrap" ai="center">
                  {people.map((person) => {
                    const isAssigned = assigned.includes(person.id);
                    return (
                      <Pressable
                        key={person.id}
                        onPress={() => toggleAssignment(item.id, person.id)}
                      >
                        <YStack ai="center" gap={4} minWidth={48}>
                          <Circle
                            size={40}
                            bg={isAssigned ? person.color : '$gray3'}
                            borderWidth={2}
                            borderColor={isAssigned ? person.color : '$gray5'}
                          >
                            {isAssigned ? (
                              <Check size={18} color="white" />
                            ) : (
                              <Text
                                color="$gray9"
                                fontWeight="700"
                                fontSize={14}
                              >
                                {person.name[0].toUpperCase()}
                              </Text>
                            )}
                          </Circle>
                          <Text
                            fontSize={11}
                            color={isAssigned ? person.color : '$gray9'}
                            fontWeight={isAssigned ? '600' : '400'}
                            numberOfLines={1}
                          >
                            {person.name.length > 6 ? person.name.slice(0, 5) + '…' : person.name}
                          </Text>
                        </YStack>
                      </Pressable>
                    );
                  })}
                </XStack>

                {/* Per-person cost hint */}
                {assigned.length > 0 && (
                  <XStack mt="$2" ai="center" gap="$1">
                    <Text fontSize={12} color="$gray10">
                      {assigned.length > 1
                        ? t('split.eachPays', { amount: fmt(perPerson, currency) })
                        : `${people.find(p => p.id === assigned[0])?.name || ''}: ${fmt(perPerson, currency)}`}
                    </Text>
                  </XStack>
                )}
              </YStack>
            );
          })}
        </YStack>
      </ScrollView>

      {/* ====== BOTTOM TOTALS ====== */}
      <YStack
        position="absolute"
        left={0}
        right={0}
        bottom={0}
        bg="$background"
        borderTopWidth={1}
        borderColor="$gray4"
        px="$4"
        pt="$3"
        pb={(insets?.bottom ?? 0) + 12}
      >
        {/* Person totals */}
        <YStack gap="$1" mb="$3">
          {people.map((person) => {
            const total = personTotals[person.id] || 0;
            return (
              <XStack key={person.id} jc="space-between" ai="center">
                <XStack ai="center" gap="$2">
                  <Circle size={20} bg={person.color}>
                    <Text color="white" fontWeight="700" fontSize={10}>
                      {person.name[0].toUpperCase()}
                    </Text>
                  </Circle>
                  <Text fontSize={14} fontWeight="500">{person.name}</Text>
                </XStack>
                <Text fontSize={14} fontWeight="700" color={total > 0 ? person.color : '$gray9'}>
                  {fmt(total, currency)}
                </Text>
              </XStack>
            );
          })}
        </YStack>

        {/* Grand total + unassigned warning */}
        <XStack jc="space-between" ai="center" mb="$2">
          <Text fontSize={15} fontWeight="600">{t('split.total')}</Text>
          <Text fontSize={17} fontWeight="700">{fmt(grandTotal, currency)}</Text>
        </XStack>

        {unassignedCount > 0 && (
          <Text fontSize={12} color="#E74C3C" mb="$2" textAlign="center">
            ⚠️ {t('split.unassignedWarning', { count: unassignedCount })}
          </Text>
        )}

        {/* Finish button */}
        <Button
          size="$4"
          backgroundColor="#2ECC71"
          borderRadius={12}
          onPress={handleFinish}
          pressStyle={{ opacity: 0.9 }}
        >
          <XStack ai="center" gap="$2">
            <Check size={18} color="white" />
            <Text fontSize={16} fontWeight="600" color="white">{t('split.done')}</Text>
          </XStack>
        </Button>
      </YStack>

      {/* ====== ADD PERSON SHEET ====== */}
      <Sheet
        modal
        open={showAddSheet}
        onOpenChange={setShowAddSheet}
        snapPoints={[55]}
        position={0}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay animation="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
        <Sheet.Frame p="$4" gap="$3" bg="$background">
          <Sheet.Handle />
          <Text fontSize={20} fontWeight="700">{t('split.addPerson')}</Text>

          {/* Manual name input */}
          <YStack gap="$2">
            <Text fontSize={14} color="$gray10">{t('split.typeName')}</Text>
            <XStack gap="$2" ai="center">
              <Input
                f={1}
                value={newName}
                onChangeText={setNewName}
                placeholder={t('split.namePlaceholder')}
                h={44}
                autoFocus
                onSubmitEditing={addPerson}
              />
              <Button
                size="$4"
                h={44}
                backgroundColor="#2ECC71"
                borderRadius={10}
                onPress={addPerson}
                disabled={!newName.trim()}
                opacity={newName.trim() ? 1 : 0.5}
              >
                <Plus size={18} color="white" />
              </Button>
            </XStack>
          </YStack>

          {/* Friends from account */}
          {availableFriends.length > 0 && (
            <YStack gap="$2">
              <XStack ai="center" gap="$2">
                <Users size={16} color="$gray10" />
                <Text fontSize={14} color="$gray10">{t('split.yourFriends')}</Text>
              </XStack>
              <ScrollView showsVerticalScrollIndicator={false} maxHeight={200}>
                <YStack borderWidth={1} borderColor="$gray5" borderRadius={10} overflow="hidden">
                  {availableFriends.map((friend, idx) => (
                    <React.Fragment key={friend.uid}>
                      <Pressable onPress={() => addFriendAsPerson(friend.name, friend.uid)}>
                        <XStack h={48} ai="center" jc="space-between" px="$3" bg="$color1">
                          <XStack ai="center" gap="$3">
                            <Circle size={32} bg="$gray5">
                              <Text color="white" fontWeight="700" fontSize={13}>
                                {friend.name[0]?.toUpperCase() || '?'}
                              </Text>
                            </Circle>
                            <Text fontSize={15} fontWeight="500">{friend.name}</Text>
                          </XStack>
                          <Plus size={18} color="#2ECC71" />
                        </XStack>
                      </Pressable>
                      {idx < availableFriends.length - 1 && <Separator />}
                    </React.Fragment>
                  ))}
                </YStack>
              </ScrollView>
            </YStack>
          )}
        </Sheet.Frame>
      </Sheet>
    </YStack>
  );
}
