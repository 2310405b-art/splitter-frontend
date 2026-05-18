import React, { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text, Button, ScrollView, Input, Sheet } from 'tamagui';
import { ChevronLeft, Plus, Trash2, Pencil } from '@tamagui/lucide-icons';
import { useReceiptSessionStore, ReceiptSplitItem } from '@/features/receipt/model/receipt-session.store';
import { useTranslation } from 'react-i18next';

export default function VerifyItemsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  const storeItems = useReceiptSessionStore((s) => s.items);
  const setStoreItems = useReceiptSessionStore((s) => s.setItems);
  const session = useReceiptSessionStore((s) => s.session);
  const currency = useReceiptSessionStore((s) => s.currency);

  const [editingItem, setEditingItem] = useState<ReceiptSplitItem | Partial<ReceiptSplitItem> | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQty, setEditQty] = useState('1');

  const goBack = useCallback(() => router.back(), [router]);
  const goNext = useCallback(() => router.push('/tabs/sessions/simple-split'), [router]);

  const openEdit = (item: ReceiptSplitItem) => {
    setEditingItem(item);
    setIsAdding(false);
    setEditName(item.name);
    setEditPrice(String(item.unitPrice));
    setEditQty(String(item.quantity));
  };

  const openAdd = () => {
    setEditingItem(null);
    setIsAdding(true);
    setEditName('');
    setEditPrice('');
    setEditQty('1');
  };

  const closeEdit = () => {
    setEditingItem(null);
    setIsAdding(false);
  };

  const saveEdit = () => {
    const priceNum = parseFloat(editPrice) || 0;
    const qtyNum = parseInt(editQty, 10) || 1;
    const totalNum = priceNum * qtyNum;

    if (isAdding) {
      const newItem: ReceiptSplitItem = {
        id: `manual-${Date.now()}`,
        name: editName || 'New Item',
        unitPrice: priceNum,
        quantity: qtyNum,
        totalPrice: totalNum,
        splitMode: qtyNum > 1 ? 'count' : 'equal',
        assignedTo: [],
        perPersonCount: {},
      };
      setStoreItems([...storeItems, newItem]);
    } else if (editingItem && 'id' in editingItem) {
      const updated = storeItems.map(it => {
        if (it.id === editingItem.id) {
          return {
            ...it,
            name: editName || 'Item',
            unitPrice: priceNum,
            quantity: qtyNum,
            totalPrice: totalNum,
          };
        }
        return it;
      });
      setStoreItems(updated);
    }
    closeEdit();
  };

  const deleteItem = (id: string) => {
    setStoreItems(storeItems.filter(it => it.id !== id));
  };

  const grandTotal = storeItems.reduce((acc, it) => acc + (it.totalPrice || (it.unitPrice * it.quantity)), 0);

  return (
    <YStack f={1} bg="$background" position="relative">
      <YStack bg="$background" p="$4" pb="$2">
        <XStack w="100%" ai="center" jc="space-between" mb="$3">
          <Button size="$3" chromeless onPress={goBack} icon={<ChevronLeft size={24} color="$color" />} ml="$-3" />
          <YStack ai="center">
            <Text fontSize={18} fontWeight="700">{t('verify.title')}</Text>
            <Text fontSize={12} color="$gray10">{session?.sessionName || 'Receipt'}</Text>
          </YStack>
          <Button size="$3" chromeless onPress={openAdd} icon={<Plus size={24} color="#2ECC71" />} mr="$-3" />
        </XStack>
      </YStack>

      <ScrollView f={1} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: (insets?.bottom ?? 0) + 120 }}>
        <YStack px="$4" gap="$3">
          {storeItems.map((item) => (
            <XStack key={item.id} bg="$color1" p="$3" borderRadius={12} borderWidth={1} borderColor="$gray5" jc="space-between" ai="center">
              <YStack f={1}>
                <Text fontSize={16} fontWeight="600" mb="$1">{item.name}</Text>
                <Text fontSize={14} color="$gray10">{item.quantity} x {currency} {item.unitPrice}</Text>
              </YStack>
              <YStack ai="flex-end" ml="$3">
                <Text fontSize={16} fontWeight="700" mb="$2">{currency} {item.totalPrice || (item.unitPrice * item.quantity)}</Text>
                <XStack gap="$2">
                  <Button size="$2" theme="red" onPress={() => deleteItem(item.id)} icon={<Trash2 size={14} />} chromeless />
                  <Button size="$2" theme="active" onPress={() => openEdit(item)} icon={<Pencil size={14} />} />
                </XStack>
              </YStack>
            </XStack>
          ))}
        </YStack>
      </ScrollView>

      <YStack position="absolute" left={0} right={0} bottom={0} bg="$background" p="$4" pb={(insets?.bottom ?? 0) + 16} borderTopWidth={1} borderColor="$gray5">
        <XStack jc="space-between" mb="$3">
          <Text fontSize={16} fontWeight="600">{t('verify.total')}</Text>
          <Text fontSize={18} fontWeight="700">{currency} {grandTotal}</Text>
        </XStack>
        <Button size="$4" backgroundColor="#2ECC71" borderRadius={10} onPress={goNext} disabled={storeItems.length === 0} opacity={storeItems.length === 0 ? 0.5 : 1}>
          <Text fontSize={16} fontWeight="600" color="white">{t('verify.continueToSplit')}</Text>
        </Button>
      </YStack>

      <Sheet modal open={!!editingItem || isAdding} onOpenChange={closeEdit} snapPoints={[60]} position={0} dismissOnSnapToBottom>
        <Sheet.Overlay animation="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
        <Sheet.Frame p="$4" gap="$4" bg="$background">
          <Sheet.Handle />
          <Text fontSize={20} fontWeight="700">{isAdding ? t('verify.addItem') : t('verify.editItem')}</Text>
          
          <YStack gap="$2">
            <Text fontSize={14} color="$gray10">{t('verify.itemName')}</Text>
            <Input value={editName} onChangeText={setEditName} placeholder={t('verify.itemNamePlaceholder')} h={44} />
          </YStack>
          
          <XStack gap="$3">
            <YStack gap="$2" f={1}>
              <Text fontSize={14} color="$gray10">{t('verify.price')} ({currency})</Text>
              <Input value={editPrice} onChangeText={setEditPrice} keyboardType="numeric" placeholder="0.00" h={44} />
            </YStack>
            <YStack gap="$2" w={100}>
              <Text fontSize={14} color="$gray10">{t('verify.quantity')}</Text>
              <Input value={editQty} onChangeText={setEditQty} keyboardType="numeric" placeholder="1" h={44} />
            </YStack>
          </XStack>

          <Button size="$4" backgroundColor="#2ECC71" mt="$4" onPress={saveEdit}>
            <Text color="white" fontWeight="600">{t('verify.save')}</Text>
          </Button>
        </Sheet.Frame>
      </Sheet>
    </YStack>
  );
}
