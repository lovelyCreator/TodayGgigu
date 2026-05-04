import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { AuthStackParamList } from '../../types';
import { BORDER_RADIUS, COLORS, FONTS, SPACING, SCREEN_HEIGHT } from '../../constants';
import Icon from '../../components/Icon';
import ArrowBackIcon from '../../assets/icons/ArrowBackIcon';
import { useResendVerificationMutation } from '../../hooks/useAuthMutations';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { Button } from '../../components';
import { useAppSelector } from '../../store/hooks';
import { translations } from '../../i18n/translations';
import LinearGradient from 'react-native-linear-gradient';

type OtpVerificationScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'OtpVerification'
>;

type OtpVerificationScreenRouteProp = RouteProp<
  AuthStackParamList,
  'OtpVerification'
>;

const CELL_COUNT = 6;

const OtpVerificationScreen: React.FC = () => {
  const navigation = useNavigation<OtpVerificationScreenNavigationProp>();
  const route = useRoute<OtpVerificationScreenRouteProp>();
  const { email, phoneNumber, countryCode, recoveryMethod = 'email' } = route.params || { 
    email: '', 
    phoneNumber: '', 
    countryCode: '+82',
    recoveryMethod: 'email' 
  };
  const locale = useAppSelector((state) => state.i18n.locale) as 'en' | 'ko' | 'zh';
  
  // Translation function
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  const [value, setValue] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    // Remove country code for display formatting if needed
    const displayPhone = phone.startsWith(countryCode || '+82') 
      ? phone.substring((countryCode || '+82').length).trim()
      : phone;
    // Format: +82 13388766478 -> +82 133 8876 6478 or keep as is
    return phone;
  };

  // Handle OTP value change
  const handleOtpChange = (text: string) => {
    setValue(text);
    
    // Clear error when user starts typing
    if (error) {
      setError('');
      
      // Clear any existing error timeout
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
    }
  };

  // Verify OTP
  const verifyOtp = () => {
    // Check if all fields are filled
    if (value.length !== CELL_COUNT) {
      setError(t('auth.enterCompleteCode') || `Please enter all ${CELL_COUNT} digits of the code`);
      return;
    }
    
    // Navigate to reset password screen with email/phone and code
    navigation.navigate('ResetPassword', { 
      token: value, 
      email: recoveryMethod === 'phone' ? phoneNumber : email 
    });
  };

  // Resend OTP
  const { mutate: resendOtp, isLoading: isResending } = useResendVerificationMutation({
    onSuccess: (data) => {
      // Reset cooldown to 60 seconds
      setResendCooldown(60);
      setValue('');
      setError('');
      
      // Clear any existing error timeout
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
    },
    onError: (error) => {
      setError(error || t('auth.resendFailed') || 'Failed to resend code');
    },
  });

  const handleResendOtp = () => {
    if (resendCooldown > 0) return;
    resendOtp({ email: recoveryMethod === 'phone' ? phoneNumber : email });
  };

  const handleEditNumber = () => {
    navigation.goBack();
  };

  // Cooldown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
    }
    
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Cleanup effect for error timeout
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const displayPhoneNumber = recoveryMethod === 'phone' 
    ? formatPhoneNumber(phoneNumber || email) 
    : email;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[...COLORS.gradients.authBackground]}
        style={styles.gradientBackground}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowBackIcon width={12} height={20} color={COLORS.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('auth.accountInfo') || 'Account info'}</Text>
            <View style={styles.placeholder} />
          </View>

          {/* White Card */}
          <View style={styles.card}>
            {/* Title */}
            <Text style={styles.title}>
              {recoveryMethod === 'phone' 
                ? (t('auth.verificationPhoneNumber') || 'Verification phone number')
                : (t('auth.verificationEmail') || 'Verification email')
              }
            </Text>

            {/* Instruction */}
            <View style={styles.instructionContainer}>
              <Text style={styles.instruction}>
                {recoveryMethod === 'phone'
                  ? (t('auth.codeSentToPhone') || 'We have sent the code to')
                  : (t('auth.codeSentToEmail') || 'We have sent the code to')
                }
                {' '}
                <Text style={styles.phoneNumberBold}>{displayPhoneNumber}</Text>
                {' '}
                {recoveryMethod === 'phone' && t('auth.enterVerificationCode') || 'Enter the verification code you received or'}
              </Text>
            </View>

            {/* OTP Input Fields */}
            <View style={styles.codeFieldContainer}>
              <CodeField
                ref={ref}
                {...props}
                value={value}
                onChangeText={handleOtpChange}
                cellCount={CELL_COUNT}
                rootStyle={styles.codeFieldRoot}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                renderCell={({index, symbol, isFocused}) => (
                  <View
                    onLayout={getCellOnLayoutHandler(index)}
                    key={`cell-${index}`}
                    style={[styles.cell, isFocused && styles.focusCell]}>
                    <Text style={styles.cellText}>
                      {symbol || (isFocused ? <Cursor /> : null)}
                    </Text>
                  </View>
                )}
              />
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Resend Code Link */}
            <TouchableOpacity 
              style={styles.resendLink}
              onPress={handleResendOtp}
              disabled={resendCooldown > 0 || isResending}
            >
              <Text style={[
                styles.resendLinkText,
                (resendCooldown > 0 || isResending) && styles.resendLinkTextDisabled
              ]}>
                {resendCooldown > 0
                  ? `${t('auth.resend') || 'Resend code'} (${resendCooldown}s)`
                  : (t('auth.resend') || 'Resend code')
                }
              </Text>
            </TouchableOpacity>

            {/* Verify Button */}
            <Button
              title={t('auth.verify') || 'Verify'}
              onPress={verifyOtp}
              disabled={value.length !== CELL_COUNT || !!error}
              variant="danger"
              style={
                (value.length !== CELL_COUNT || !!error)
                  ? { ...styles.verifyButton, ...styles.verifyButtonDisabled }
                  : styles.verifyButton
              }
              textStyle={
                (value.length !== CELL_COUNT || !!error)
                  ? { ...styles.verifyButtonText, ...styles.verifyButtonTextDisabled }
                  : styles.verifyButtonText
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT / 2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.smmd,
    backgroundColor: COLORS.white,
  },
  backButton: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 32,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    marginHorizontal: SPACING.smmd,
  },
  title: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  instructionContainer: {
    marginBottom: SPACING.sm,
  },
  instruction: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  phoneNumberBold: {
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  editNumberLink: {
    marginBottom: SPACING.lg,
  },
  editNumberText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  codeFieldContainer: {
    marginVertical: SPACING.lg,
  },
  codeFieldRoot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cell: {
    width: 48,
    height: 56,
    lineHeight: 54,
    borderWidth: 1,
    borderColor: COLORS.black,
    borderRadius: BORDER_RADIUS.md,
    textAlign: 'center',
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  focusCell: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  cellText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  errorContainer: {
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  errorText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    textAlign: 'center',
  },
  resendLink: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
  },
  resendLinkText: {
    fontSize: FONTS.sizes.sm,
    color: '#4285F4',
    textDecorationLine: 'underline',
  },
  resendLinkTextDisabled: {
    color: COLORS.gray[400],
    textDecorationLine: 'none',
  },
  verifyButton: {
    backgroundColor: COLORS.text.red,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.smmd,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: '#F4F4F4',
  },
  verifyButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  verifyButtonTextDisabled: {
    color: COLORS.black,
  },
});

export default OtpVerificationScreen;
