import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowBackIcon from '../../assets/icons/ArrowBackIcon';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SCREEN_HEIGHT } from '../../constants';
import { useAppSelector } from '../../store/hooks';
import { translations } from '../../i18n/translations';
import { AuthStackParamList } from '../../types';
import { useVerifyEmailMutation, useResendVerificationMutation } from '../../hooks/useAuthMutations';
import { useAuth } from '../../context/AuthContext';
import { checkEmail } from '../../services/authApi';
import LinearGradient from 'react-native-linear-gradient';
import ShieldCheckIcon from '../../assets/icons/ShieldCheckIcon';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { Button } from '../../components';

type EmailVerificationScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'EmailVerification'>;
type EmailVerificationScreenRouteProp = RouteProp<AuthStackParamList, 'EmailVerification'>;

const CELL_COUNT = 4; // Changed from 6 to 4

const EmailVerificationScreen = () => {
  const navigation = useNavigation<EmailVerificationScreenNavigationProp>();
  const route = useRoute<EmailVerificationScreenRouteProp>();
  const { email, verified = false } = route.params || { email: '', verified: false };
  const { setAuthenticatedUser, setNavigateToProfile } = useAuth();
  const locale = useAppSelector((state) => state.i18n.locale) as 'en' | 'ko' | 'zh';
  
  // Resend code cooldown state
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Translation function
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  // Map language codes to flag emojis
  const getLanguageFlag = (locale: string) => {
    const flags: { [key: string]: string } = {
      'en': '🇺🇸',
      'ko': '🇰🇷',
      'zh': '🇨🇳',
    };
    return flags[locale] || '🇺🇸';
  };

  const [value, setValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  const { mutate: verifyEmail, isLoading } = useVerifyEmailMutation({
    useSignupCode: verified === false,
    onSuccess: async (data) => {
      // Clear any error messages
      setErrorMessage('');
      
      // For signup code verification (verified: false), handle differently
      if (verified === false && data && data.signup_code_verified) {
        // Navigate to set password screen after successful signup verification
        // Pass the verification code so it can be sent with the set-password request
        setTimeout(() => {
          (navigation as any).navigate('SetPassword', { email, code: value });
        }, 500);
        return;
      }
      
      // For signin code verification (verified: true), navigate to login page
      if (verified === true && data && (data.token || data.user)) {
        // Update auth state if user data is available
        if (data.user) {
          const user = {
            id: data.user.id || data.user.email || Date.now().toString(),
            email: data.user.email || '',
            name: data.user.name || data.user.email?.split('@')[0] || 'User',
            avatar: data.user.avatar || 'https://via.placeholder.com/150',
            phone: data.user.phone || '',
            addresses: data.user.addresses || [],
            paymentMethods: data.user.paymentMethods || [],
            wishlist: data.user.wishlist || [],
            followersCount: data.user.followersCount || 0,
            followingsCount: data.user.followingsCount || 0,
            preferences: data.user.preferences || {
              notifications: {
                email: true,
                push: true,
                sms: true,
              },
              language: 'en',
              currency: 'USD',
            },
            createdAt: data.user.createdAt || new Date(),
            updatedAt: data.user.updatedAt || new Date(),
          };
          
          setAuthenticatedUser(user);
          setNavigateToProfile();
        }
        
        // Navigate to login page (or main if already authenticated)
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' as any }],
          });
        }, 500);
        return;
      }
      
      // The token and user data are already stored in the API call
      // Now update the AuthContext with the user data
      if (data && data.user) {
        const user = {
          id: data.user.id || data.user.email || Date.now().toString(),
          email: data.user.email || '',
          name: data.user.name || data.user.email?.split('@')[0] || 'User',
          avatar: data.user.avatar || 'https://via.placeholder.com/150',
          phone: data.user.phone || '',
          addresses: data.user.addresses || [],
          paymentMethods: data.user.paymentMethods || [],
          wishlist: data.user.wishlist || [],
          followersCount: data.user.followersCount || 0,
          followingsCount: data.user.followingsCount || 0,
          preferences: data.user.preferences || {
            notifications: {
              email: true,
              push: true,
              sms: true,
            },
            language: 'en',
            currency: 'USD',
          },
          createdAt: data.user.createdAt || new Date(),
          updatedAt: data.user.updatedAt || new Date(),
        };
        
        // Update auth state - this will trigger the app to show as logged in
        setAuthenticatedUser(user);
        setNavigateToProfile();
        
        // Wait for state to update, then navigate
        await Promise.resolve();
        
        // Navigate to main screen after a short delay
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' as any }],
          });
        }, 1500);
      } else {
        // If no user data, just navigate
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' as any }],
          });
        }, 1500);
      }
    },
    onError: (error, errorCode) => {
      // Handle specific error codes and show error below code field
      let errorMsg = error;
      
      switch (errorCode) {
        case 'INVALID_VERIFICATION_CODE':
          errorMsg = t('auth.invalidVerificationCode');
          break;
        case 'USER_NOT_FOUND':
          errorMsg = t('auth.userNotFound');
          break;
        case 'VERIFICATION_CODE_EXPIRED':
          errorMsg = t('auth.codeExpired');
          break;
        case 'VALIDATION_ERROR':
          errorMsg = t('auth.invalidCodeFormat');
          break;
        default:
          errorMsg = error || t('auth.verificationFailed');
      }
      
      setErrorMessage(errorMsg);
    },
  });

  const { mutate: resendCode } = useResendVerificationMutation({
    onSuccess: (data) => {
      // Clear error message on successful resend
      setErrorMessage('');
    },
    onError: (error) => {
      // Handle error silently or show toast
    },
  });

  const handleVerify = async () => {
    // Clear previous error
    setErrorMessage('');
    
    if (value.length !== CELL_COUNT) {
      setErrorMessage(t('auth.enterCompleteCode') || 'Please enter the complete code');
      return;
    }

    await verifyEmail({ email, code: value, verified });
  };

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      // Cleanup will be handled by the interval itself when countdown reaches 0
    };
  }, []);

  const handleResendCode = async () => {
    if (resendCooldown > 0) return; // Prevent resend during cooldown
    
    try {
      // Call check email API to resend code
      const result = await checkEmail(email);
      if (result.success) {
        // Start 60 second cooldown
        setResendCooldown(60);
        setErrorMessage('');
        
        // Countdown timer
        const interval = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setErrorMessage(result.error || t('auth.resendFailed') || 'Failed to resend code');
      }
    } catch (error: any) {
      setErrorMessage(error?.message || t('auth.resendFailed') || 'Failed to resend code');
    }
  };

  // Handle back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      return () => {
        sub.remove();
      };
    }, [navigation])
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top half linear gradient background */}
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowBackIcon width={12} height={20} color={COLORS.text.primary} />
            </TouchableOpacity>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => (navigation as any).navigate('LanguageSettings')}
              >
                <Text style={styles.flagText}>{getLanguageFlag(locale)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.form}>
            {/* Toy illustration below logo and behind input fields */}
            <View style={styles.toyContainer}>
              <Image
                source={require('../../assets/icons/logo.png')}
                style={styles.headerImage}
                resizeMode="contain"
              />
              <Image
                source={require('../../assets/icons/toy.png')}
                style={styles.toyImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.formInputs}>
              {/* Security message in green border area */}
              <View style={styles.securityMessageContainer}>
                <ShieldCheckIcon width={16} height={16} color="#34A853" />
                <Text style={styles.securityMessageText}>
                  {t('auth.infoProtected') || 'Your information is protected'}
                </Text>
              </View>

              {/* Title */}
              <View style={styles.titleContainer}>
                <Text style={styles.titleText}>
                  {t('auth.verifyYourEmail') || 'Verify your email'}
                </Text>
              </View>

              {/* Instructions with email */}
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsText}>
                  {t('auth.enterCodeSentTo') || 'Please enter the 4-digit code sent to '}
                  <Text style={styles.emailText}> {email}</Text>
                </Text>
              </View>

              {/* Modify email address link */}
              <TouchableOpacity 
                style={styles.modifyEmailContainer}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.modifyEmailText}>
                  {t('auth.modifyEmailAddress') || 'Modify email address'}
                </Text>
              </TouchableOpacity>

              {/* Code Field Container */}
              <View style={styles.codeFieldContainer}>
                <CodeField
                  ref={ref}
                  {...props}
                  value={value}
                  onChangeText={(text) => {
                    setValue(text);
                    // Clear error when user starts typing
                    if (errorMessage) {
                      setErrorMessage('');
                    }
                  }}
                  cellCount={CELL_COUNT}
                  rootStyle={styles.codeFieldRoot}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  renderCell={({ index, symbol, isFocused }) => (
                    <View
                      key={`cell-${index}`}
                      style={[
                        styles.cell, 
                        isFocused && styles.focusCell,
                        errorMessage && styles.cellError
                      ]}
                      onLayout={getCellOnLayoutHandler(index)}
                    >
                      <Text style={styles.cellText}>
                        {symbol || (isFocused ? <Cursor /> : null)}
                      </Text>
                    </View>
                  )}
                />
              </View>

              {errorMessage ? (
                <View style={styles.errorMessageContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity 
                onPress={handleResendCode}
                disabled={resendCooldown > 0}
                style={styles.resendContainer}
              >
                <Text style={[
                  styles.resendLink,
                  resendCooldown > 0 && styles.resendLinkDisabled
                ]}>
                  {resendCooldown > 0 
                    ? `${t('auth.resend') || 'Resend'} (${resendCooldown}s)`
                    : (t('auth.resend') || 'Resend code')
                  }
                </Text>
              </TouchableOpacity>

              <Button
                title={t('auth.continue') || 'Continue'}
                onPress={handleVerify}
                disabled={isLoading || value.length !== CELL_COUNT}
                loading={isLoading}
                variant="danger"
                style={
                  (isLoading || value.length !== CELL_COUNT)
                    ? { ...styles.verifyButton, ...styles.verifyButtonDisabled }
                    : styles.verifyButton
                }
                textStyle={
                  (isLoading || value.length !== CELL_COUNT)
                    ? { ...styles.verifyButtonText, ...styles.verifyButtonTextDisabled }
                    : styles.verifyButtonText
                }
              />

            </View>
              
              {/* Footer bar - Inside ScrollView after verify button */}
              <View style={styles.footerContainer}>
                {/* Support text */}
                <Text style={styles.footerSupportText}>
                  <Text style={styles.footerSupportGray}>
                    {t('auth.supportText') || '주식회사:투데이직구 /대표 유두성 주소: 경기도 의정부시 녹양로34번길 47, 101동 305호(가능동, e편한세상 녹양역) 사업자번호: 661-12-03163 전화: 07077926663 서비스 이메일: taoexpress_1@163.com '}
                  </Text>
                </Text>

                {/* Copyright */}
                <Text style={styles.footerCopyright}>
                  {t('auth.copyright') || '© 2025 TodayMall. All Rights Reserved.'}
                </Text>
              </View>
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
    position: 'relative',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.smmd,
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.lg,
  },
  backButton: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  flagText: {
    fontSize: 24,
  },
  toyContainer: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  headerImage: {
    position: 'absolute',
    width: 270,
    height: 61,
    top: 62,
  },
  toyImage: {
    marginTop: SPACING.sm,
    width: 106,
    height: 125,
  },
  form: {
    flex: 1,
    position: 'relative',
    paddingHorizontal: SPACING.xs,
  },
  formInputs: {
    marginTop: 147,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingTop: 0,
    backgroundColor: COLORS.background,
    overflow: 'visible',
    position: 'relative',
    zIndex: 1,
  },
  securityMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
    paddingVertical: SPACING.xs,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  securityMessageText: {
    marginLeft: SPACING.xs,
    fontSize: FONTS.sizes.xs,
    color: '#34A853',
    fontWeight: '500',
  },
  titleContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  titleText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  instructionsContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  instructionsText: {
    fontSize: FONTS.sizes.md,
    color: '#999999',
    lineHeight: FONTS.sizes.md * 1.4,
    textAlign: 'center',
  },
  emailText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  codeFieldContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeFieldRoot: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cell: {
    width: 56,
    height: 56,
    lineHeight: 54,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    textAlign: 'center',
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  focusCell: {
    borderColor: COLORS.primary,
  },
  cellError: {
    borderColor: COLORS.error,
  },
  cellText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  errorMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  alarmMark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
    marginRight: SPACING.xs,
  },
  alarmText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
    color: COLORS.error,
  },
  errorText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    flex: 1,
    textAlign: 'center',
  },
  verifyButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.text.red,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.smmd,
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: '#0000001A',
  },
  verifyButtonDisabled: {
    backgroundColor: '#0000001A',
  },
  verifyButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  verifyButtonTextDisabled: {
    color: COLORS.black,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  resendLink: {
    fontSize: FONTS.sizes.sm,
    color: '#4285F4',
    fontWeight: '500',
  },
  resendLinkDisabled: {
    color: COLORS.gray[400],
    opacity: 0.6,
  },
  modifyEmailContainer: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.xs,
  },
  modifyEmailText: {
    fontSize: FONTS.sizes.md,
    color: '#4285F4',
    fontWeight: '500',
    textAlign: 'center',
  },
  footerContainer: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
    marginTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  footerSupportText: {
    fontSize: 11,
    lineHeight: FONTS.sizes.xs + 4,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },
  footerSupportGray: {
    color: COLORS.gray[500],
  },
  footerCopyright: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.black,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});

export default EmailVerificationScreen;
