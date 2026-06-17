import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from '../../../../components/Icon';
import { LinearGradient } from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING } from '../../../../constants';
import { useAuth } from '../../../../context/AuthContext';
import { useAppSelector } from '../../../../store/hooks';
import { translations } from '../../../../i18n/translations';

const PaymentPasswordScreen = () => {
  const navigation = useNavigation();
  const locale = useAppSelector((state) => state.i18n.locale) as 'en' | 'ko' | 'zh';
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const userEmail = user?.email || 'user@example.com';
  
  // Translation function
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  const handleSendVerificationCode = async () => {
    if (isSendingCode || countdown > 0) return;

    setIsSendingCode(true);
    try {
      // TODO: Implement actual API call to send verification code
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCodeSent(true);
      setCountdown(60);
      Alert.alert(t('shareApp.success'), t('profile.verificationCodeSent'));

      // Start countdown
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.failedToSendCode'));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentPassword) {
      Alert.alert(t('common.error'), t('profile.enterCurrentPasswordError'));
      return;
    }
    if (!newPassword) {
      Alert.alert(t('common.error'), t('profile.enterNewPasswordError'));
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('profile.passwordMin6Chars'));
      return;
    }
    if (!verificationCode) {
      Alert.alert(t('common.error'), t('profile.enterVerificationCodeError'));
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement actual API call to update payment password
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(t('shareApp.success'), t('profile.paymentPasswordUpdated'), [
        { text: t('profile.ok'), onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.failedToUpdatePaymentPassword'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Gradient */}
      {/* <LinearGradient
        colors={['#FFE4E6', '#FFF0F1', '#FFFFFF']} */}
      <View
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.paymentPassword')}</Text>
        <View style={styles.placeholder} />
      {/* </LinearGradient> */}
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>{t('profile.setPaymentPassword')}</Text>
          <Text style={styles.sectionDescription}>
            {t('profile.paymentPasswordDescription')}
          </Text>

          <View style={styles.formCard}>
            {/* Current Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('profile.currentPassword')}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={t('profile.enterCurrentPasswordPayment')}
                  placeholderTextColor={COLORS.text.secondary}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={showCurrentPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Icon
                    name={showCurrentPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.gray[500]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('profile.newPassword')}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={t('profile.enterNewPasswordPayment')}
                  placeholderTextColor={COLORS.text.secondary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Icon
                    name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.gray[500]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Email Verification Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('profile.emailVerificationCode')}</Text>
              <View style={styles.codeContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('profile.enterVerificationCode')}
                    placeholderTextColor={COLORS.text.secondary}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.sendCodeButton,
                    (isSendingCode || countdown > 0) && styles.sendCodeButtonDisabled
                  ]}
                  onPress={handleSendVerificationCode}
                  disabled={isSendingCode || countdown > 0}
                >
                  {isSendingCode ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.sendCodeButtonText}>
                      {countdown > 0 ? `${countdown}s` : t('profile.getCode')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Email Info */}
            <View style={styles.emailInfoContainer}>
              <Icon name="mail-outline" size={18} color={COLORS.text.secondary} />
              <Text style={styles.emailInfoText}>
                {t('profile.yourEmailIs')} <Text style={styles.emailText}>{userEmail}</Text>
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>{t('profile.submit')}</Text>
            )}
          </TouchableOpacity>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Icon name="shield-checkmark-outline" size={24} color="#4A90E2" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>{t('profile.securityTips')}</Text>
              <Text style={styles.infoText}>
                {t('profile.securityTip1')}{'\n'}
                {t('profile.securityTip2')}{'\n'}
                {t('profile.securityTip3')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg * 2,
    // marginBottom: SPACING.md,
    paddingTop: SPACING['2xl'] * 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    marginTop: -20,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  sectionDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xl,
    lineHeight: Math.round(FONTS.sizes.sm * 20 / 14),
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.md,
    padding: SPACING.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 50,
    flex: 1,
  },
  input: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    padding: 0,
  },
  eyeButton: {
    padding: SPACING.xs,
  },
  codeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sendCodeButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  sendCodeButtonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  sendCodeButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  emailInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: SPACING.md,
    borderRadius: 8,
    gap: SPACING.sm,
  },
  emailInfoText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    lineHeight: Math.round(FONTS.sizes.sm * 18 / 14),
  },
  emailText: {
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  submitButton: {
    backgroundColor: COLORS.error,
    borderRadius: 999,
    paddingVertical: SPACING.smmd,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F4FD',
    borderRadius: SPACING.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#D0E8F7',
    marginBottom: 50,
  },
  infoIconContainer: {
    marginRight: SPACING.md,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  infoText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    lineHeight: Math.round(FONTS.sizes.sm * 20 / 14),
  },
});

export default PaymentPasswordScreen;
