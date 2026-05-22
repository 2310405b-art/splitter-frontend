// app/tabs/settings.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { YStack, Text, Separator, XStack, Circle } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sun, Moon } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/Button';
import { ScreenContainer } from '@/shared/ui/ScreenContainer';
import Input from '@/shared/ui/Input';
import PasswordInput from '@/shared/ui/PasswordInput';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { changePassword, updateUsername } from '@/features/auth/api';
import { LANGUAGE_OPTIONS, type LanguageCode } from '@/shared/config/languages';

export default function SettingsScreen() {
  const { user, setUser, language, setLanguage, theme, setTheme } = useAppStore();
  const { t } = useTranslation();
  const isLoggedIn = !!user;

  const [usernameValue, setUsernameValue] = useState(user?.username ?? '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    setUsernameValue(user?.username ?? '');
  }, [user?.username]);

  const usernameDirty = useMemo(() => {
    const trimmed = usernameValue.trim();
    return trimmed.length > 0 && trimmed !== (user?.username ?? '').trim();
  }, [usernameValue, user?.username]);

  const validateUsername = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Username cannot be empty';
    if (trimmed.length < 2) return 'Username must be at least 2 characters';
    return null;
  };

  const validatePasswordForm = () => {
    if (!currentPassword.trim()) return 'Enter your current password';
    if (newPassword.length < 8) return 'New password must be at least 8 characters';
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9\s]/.test(newPassword);
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
      return 'Password must include uppercase, lowercase, number, and special character';
    }
    if (newPassword !== confirmPassword) return 'Passwords do not match';
    if (newPassword === currentPassword) return 'Choose a different password';
    return null;
  };

  const handleLanguageChange = (code: LanguageCode) => {
    if (code === language) return;
    setLanguage(code);
  };

  const handleSaveUsername = async () => {
    if (!isLoggedIn) {
      Alert.alert('Unavailable', 'Sign in to update your username.');
      return;
    }
    const error = validateUsername(usernameValue);
    if (error) {
      setUsernameError(error);
      return;
    }
    setUsernameError(null);

    const trimmed = usernameValue.trim();

    try {
      setIsUpdatingUsername(true);
      const updatedUser = await updateUsername({ username: trimmed });
      setUser(updatedUser);
      Alert.alert('Success', 'Username updated.');
    } catch (error) {
      console.error('Username update failed:', error);
      const message = error instanceof Error ? error.message : 'Could not update the username.';
      Alert.alert('Error', message);
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleChangePassword = async () => {
    if (!isLoggedIn) {
      Alert.alert('Unavailable', 'Sign in to change your password.');
      return;
    }

    const error = validatePasswordForm();
    if (error) {
      setPasswordError(error);
      return;
    }
    setPasswordError(null);

    try {
      setIsChangingPassword(true);
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password updated', 'Your password has been changed.');
    } catch (error) {
      console.error('Password change failed:', error);
      const message = error instanceof Error ? error.message : 'Could not change the password.';
      Alert.alert('Error', message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    if (usernameError && usernameValue.trim().length >= 2) {
      setUsernameError(null);
    }
  }, [usernameError, usernameValue]);

  useEffect(() => {
    if (passwordError) {
      const err = validatePasswordForm();
      if (!err) setPasswordError(null);
    }
  }, [currentPassword, newPassword, confirmPassword, passwordError]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme === 'dark' ? '#111827' : 'white' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 }) ?? 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenContainer>
            <YStack space="$5">
              {/* Header */}
              <YStack space="$3" mt="$4">
                <Text fontSize={20} fontWeight="700">
                  {t('settings.title')}
                </Text>
                <Text color="$gray10">
                  {t('settings.subtitle')}
                </Text>
              </YStack>

              {/* LANGUAGE */}
              <YStack space="$3">
                <Text fontSize={16} fontWeight="600">
                  {t('settings.language.title', 'Language')}
                </Text>

                <XStack flexWrap="wrap" gap="$2">
                  {LANGUAGE_OPTIONS.map((option) => {
                    const isActive = option.code === language;
                    return (
                      <YStack
                        key={option.code}
                        ai="center"
                        jc="center"
                        gap="$2"
                        w={76}
                        h={76}
                        borderRadius={12}
                        borderWidth={isActive ? 2 : 1}
                        borderColor={isActive ? '#2ECC71' : '$gray5'}
                        bg={isActive ? '#2ECC711A' : '$color1'}
                        onPress={() => handleLanguageChange(option.code)}
                        pressStyle={{ opacity: 0.8 }}
                        cursor="pointer"
                      >
                        <Circle size={32} bg={option.color} ai="center" jc="center">
                          <Text fontSize={18}>
                            {option.flag}
                          </Text>
                        </Circle>
                        <Text fontSize={11} fontWeight={isActive ? '700' : '500'} color={isActive ? '$gray12' : '$gray10'}>
                          {option.code}
                        </Text>
                      </YStack>
                    );
                  })}
                </XStack>
              </YStack>

              <Separator />

              {/* THEME */}
              <YStack space="$3">
                <Text fontSize={16} fontWeight="600">
                  {t('settings.theme.title', 'Theme')}
                </Text>

                <XStack gap="$2">
                  <YStack
                    ai="center"
                    jc="center"
                    gap="$2"
                    w={112}
                    h={76}
                    borderRadius={12}
                    borderWidth={theme === 'light' ? 2 : 1}
                    borderColor={theme === 'light' ? '#2ECC71' : '$gray5'}
                    bg={theme === 'light' ? '#2ECC711A' : '$color1'}
                    onPress={() => setTheme('light')}
                    pressStyle={{ opacity: 0.8 }}
                    cursor="pointer"
                  >
                    <Circle size={32} bg="$gray3" ai="center" jc="center">
                      <Sun size={20} color={theme === 'light' ? '#F39C12' : '$gray11'} />
                    </Circle>
                    <Text fontSize={11} fontWeight={theme === 'light' ? '700' : '500'} color={theme === 'light' ? '$gray12' : '$gray10'}>
                      {t('settings.theme.light', 'Light')}
                    </Text>
                  </YStack>

                  <YStack
                    ai="center"
                    jc="center"
                    gap="$2"
                    w={112}
                    h={76}
                    borderRadius={12}
                    borderWidth={theme === 'dark' ? 2 : 1}
                    borderColor={theme === 'dark' ? '#2ECC71' : '$gray5'}
                    bg={theme === 'dark' ? '#2ECC711A' : '$color1'}
                    onPress={() => setTheme('dark')}
                    pressStyle={{ opacity: 0.8 }}
                    cursor="pointer"
                  >
                    <Circle size={32} bg="$gray3" ai="center" jc="center">
                      <Moon size={20} color={theme === 'dark' ? '#9B59B6' : '$gray11'} />
                    </Circle>
                    <Text fontSize={11} fontWeight={theme === 'dark' ? '700' : '500'} color={theme === 'dark' ? '$gray12' : '$gray10'}>
                      {t('settings.theme.dark', 'Dark')}
                    </Text>
                  </YStack>
                </XStack>
              </YStack>

              <Separator />

              {/* USERNAME */}
              <YStack space="$3">
                <Text fontSize={16} fontWeight="600">{t('settings.username')}</Text>
                <Input
                  value={usernameValue}
                  onChangeText={setUsernameValue}
                  placeholder={t('profile.info.usernamePlaceholder')}
                  textInputProps={{ autoCapitalize: 'none', autoCorrect: false }}
                  error={usernameError || undefined}
                />
                <XStack space="$2">
                  <Button
                    title={isUpdatingUsername ? t('settings.saving') : t('settings.saveUsername')}
                    variant="primary"
                    size="medium"
                    disabled={!usernameDirty || isUpdatingUsername}
                    onPress={handleSaveUsername}
                  />
                  <Button
                    title={t('settings.reset')}
                    variant="outline"
                    size="medium"
                    disabled={!usernameDirty}
                    onPress={() => setUsernameValue(user?.username ?? '')}
                  />
                </XStack>
              </YStack>

              <Separator />

              {/* PASSWORD */}
              <YStack space="$3">
                <Text fontSize={16} fontWeight="600">{t('settings.password')}</Text>
                <PasswordInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder={t('settings.currentPassword')}
                  textInputProps={{ returnKeyType: 'next' }}
                />
                <PasswordInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('settings.newPassword')}
                  textInputProps={{ returnKeyType: 'next' }}
                />
                <Text fontSize={12} color="$gray10">
                  {t('settings.passwordHint')}
                </Text>
                <PasswordInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('settings.confirmNewPassword')}
                  error={passwordError || undefined}
                  textInputProps={{ returnKeyType: 'done' }}
                />
                <Button
                  title={isChangingPassword ? t('settings.updating') : t('settings.changePassword')}
                  variant="primary"
                  size="medium"
                  disabled={isChangingPassword}
                  onPress={handleChangePassword}
                />
              </YStack>
            </YStack>
          </ScreenContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
