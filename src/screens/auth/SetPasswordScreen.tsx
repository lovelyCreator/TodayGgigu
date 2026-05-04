import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  BackHandler,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import ArrowBackIcon from '../../assets/icons/ArrowBackIcon';
import ArrowDownIcon from '../../assets/icons/ArrowDownIcon';
import { Button, TextInput } from '../../components';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { setPassword } from '../../services/authApi';
import { useSocialLoginMutation } from '../../hooks/useAuthMutations';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SCREEN_HEIGHT } from '../../constants';
import { useAppSelector } from '../../store/hooks';
import { translations } from '../../i18n/translations';
import { AuthStackParamList } from '../../types';
import ShieldCheckIcon from '../../assets/icons/ShieldCheckIcon';

type SetPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'SetPassword'>;
type SetPasswordScreenRouteProp = RouteProp<AuthStackParamList, 'SetPassword'>;

const SetPasswordScreen = () => {
  const navigation = useNavigation<SetPasswordScreenNavigationProp>();
  const route = useRoute<SetPasswordScreenRouteProp>();
  const { email, code } = route.params || { email: '', code: '' };
  const { setAuthenticatedUser, setNavigateToProfile } = useAuth();
  const { showToast } = useToast();
  const locale = useAppSelector((state) => state.i18n.locale) as 'en' | 'ko' | 'zh';

  // Social login mutation
  const { mutate: socialLoginMutation, isLoading: isSocialLoading } = useSocialLoginMutation({
    onSuccess: (data) => {
      if (data && data.user) {
        setAuthenticatedUser(data.user);
        setNavigateToProfile();
      }
      showToast(t('auth.login.success') || 'Login successful', 'success');
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' as any }],
        });
      }, 1500);
    },
    onError: (error) => {
      showToast(error || t('auth.loginFailed') || 'Login failed', 'error');
    }
  });
  
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

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.password) {
      newErrors.password = t('auth.passwordRequired') || 'Password is required';
    } else if (formData.password.length <= 6 || formData.password.length > 20) {
      newErrors.password = t('auth.passwordLengthError') || 'Must be over 6 characters (letters, numbers or symbols)';
    } else {
      // Check for letter, number, and symbol
      const hasLetter = /[a-zA-Z]/.test(formData.password);
      const hasNumber = /[0-9]/.test(formData.password);
      const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password);
      
      if (!hasLetter || !hasNumber || !hasSymbol) {
        newErrors.password = t('auth.passwordRequirementError') || 'Password must contain letter, number, and symbol';
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.enterConfirmPassword') || 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordMismatch') || 'Password mismatch.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple' | 'twitter' | 'kakao' | 'naver') => {
    try {
      if (provider === 'naver') {
        // TODO: Implement Naver social login when backend support is available
        return;
      }
      await socialLoginMutation(provider as 'google' | 'facebook' | 'apple' | 'twitter' | 'kakao');
    } catch (error) {
      // Social login error
    }
  };

  const handleSignIn = () => {
    navigation.navigate('Login' as never);
  };

  const handleSetPassword = async () => {
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await setPassword(email, formData.password, code);
      setIsLoading(false);

      if (result.success && result.data) {
        // Update auth state if user data is available
        if (result.data.user) {
          setAuthenticatedUser(result.data.user);
          setNavigateToProfile();
        }

        showToast(t('auth.passwordSetSuccess') || 'Password set successfully', 'success');
        
        // Navigate to main screen
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' as any }],
          });
        }, 1500);
      } else {
        showToast(result.error || t('auth.passwordSetFailed') || 'Failed to set password', 'error');
      }
    } catch (error: any) {
      setIsLoading(false);
      showToast(error?.message || t('auth.passwordSetFailed') || 'Failed to set password', 'error');
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

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.unifiedInputContainer,
                  !isPasswordFocused && styles.unifiedInputContainerUnfocused
                ]}>
                  <View style={[
                    styles.inputFieldContainer,
                    formData.password.length > 0 && styles.inputFieldContainerWithLabel
                  ]}>
                    {formData.password.length > 0 && (
                      <Text style={styles.floatingLabel}>
                        {t('auth.enterPassword') || 'Password'}
                      </Text>
                    )}
                    <View style={styles.inputRow}>
                      <RNTextInput
                        placeholder={formData.password.length > 0 
                          ? '' 
                          : (t('auth.enterPassword') || 'Password')
                        }
                        placeholderTextColor={'#999999'}
                        value={formData.password}
                        secureTextEntry={!showPassword}
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={() => setIsPasswordFocused(false)}
                        onChangeText={(text) => {
                          setFormData({ ...formData, password: text });
                          if (errors.password) {
                            setErrors({ ...errors, password: '' });
                          }
                        }}
                        style={styles.unifiedInput}
                      />
                    </View>
                  </View>
                  
                  {formData.password.length > 0 && (
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Icon name={showPassword ? "eye" : "eye-off"} size={20} color={COLORS.gray[500]} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={[styles.inputContainer, {marginTop: SPACING.sm}]}>
                <View style={[
                  styles.unifiedInputContainer,
                  !isConfirmPasswordFocused && styles.unifiedInputContainerUnfocused
                ]}>
                  <View style={[
                    styles.inputFieldContainer,
                    formData.confirmPassword.length > 0 && styles.inputFieldContainerWithLabel
                  ]}>
                    {formData.confirmPassword.length > 0 && (
                      <Text style={styles.floatingLabel}>
                        {t('auth.confirmPassword') || 'Confirm Password'}
                      </Text>
                    )}
                    <View style={styles.inputRow}>
                      <RNTextInput
                        placeholder={formData.confirmPassword.length > 0 
                          ? '' 
                          : (t('auth.confirmPassword') || 'Confirm Password')
                        }
                        placeholderTextColor={'#999999'}
                        value={formData.confirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        onFocus={() => setIsConfirmPasswordFocused(true)}
                        onBlur={() => setIsConfirmPasswordFocused(false)}
                        onChangeText={(text) => {
                          setFormData({ ...formData, confirmPassword: text });
                          if (errors.confirmPassword) {
                            setErrors({ ...errors, confirmPassword: '' });
                          }
                        }}
                        style={styles.unifiedInput}
                      />
                    </View>
                  </View>
                  
                  {formData.confirmPassword.length > 0 && (
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Icon name={showConfirmPassword ? "eye" : "eye-off"} size={20} color={COLORS.gray[500]} />
                    </TouchableOpacity>
                  )}
                </View>
                
                {errors.confirmPassword ? (
                  <View style={styles.errorMessageContainer}>
                    <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                  </View>
                ) : null}
              </View>

              <Button
                title={t('auth.register') || 'Register'}
                onPress={handleSetPassword}
                disabled={isLoading || !formData.password || !formData.confirmPassword}
                loading={isLoading}
                variant="danger"
                style={
                  (isLoading || !formData.password || !formData.confirmPassword)
                    ? { ...styles.setPasswordButton, ...styles.setPasswordButtonDisabled }
                    : styles.setPasswordButton
                }
                textStyle={
                  (isLoading || !formData.password || !formData.confirmPassword)
                    ? { ...styles.setPasswordButtonText, ...styles.setPasswordButtonTextDisabled }
                    : styles.setPasswordButtonText
                }
              />

              <View style={styles.signinContainer}>
                <Text style={styles.signinText}>{t('auth.haveAccount') || 'Have an account? '}</Text>
                <TouchableOpacity onPress={handleSignIn}>
                  <Text style={styles.signinLink}>{t('auth.signIn') || 'Sign in'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <Text style={styles.dividerText}>{t('auth.orContinueWith') || 'Or continue with'}</Text>

            <View style={styles.socialButtons}>
              {/* 1. Google */}
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialLogin('google')}
                disabled={isSocialLoading}
              >
                <Image
                  source={require('../../assets/icons/google.png')}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
                <Text style={styles.socialButtonText}>google</Text>
              </TouchableOpacity>

              {/* 2. Kakao */}
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialLogin('kakao')}
                disabled={isSocialLoading}
              >
                <Image
                  source={require('../../assets/icons/kakao.png')}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
                <Text style={styles.socialButtonText}>kakao</Text>
              </TouchableOpacity>

              {/* 3. Naver */}
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialLogin('naver')}
                disabled={isSocialLoading}
              >
                <Image
                  source={require('../../assets/icons/naver.png')}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
                <Text style={styles.socialButtonText}>naver</Text>
              </TouchableOpacity>

              {/* 4. Facebook */}
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialLogin('facebook')}
                disabled={isSocialLoading}
              >
                <Image
                  source={require('../../assets/icons/facebook.png')}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
                <Text style={styles.socialButtonText}>facebook</Text>
              </TouchableOpacity>

              {/* 5. Apple */}
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialLogin('apple')}
                disabled={isSocialLoading}
              >
                <Image
                  source={require('../../assets/icons/apple.png')}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
                <Text style={styles.socialButtonText}>apple</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.arrowDownContainer} onPress={handleSignIn}>
              <ArrowDownIcon width={24} height={24} color={COLORS.gray[500]} />
            </TouchableOpacity>
            
            {/* Footer bar - Inside ScrollView after social buttons */}
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
  inputContainer: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: SPACING.md,
    position: 'relative',
    zIndex: 1,
    marginTop: SPACING.md,
  },
  unifiedInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    minHeight: 56,
  },
  unifiedInputContainerUnfocused: {
    backgroundColor: '#F4F4F4',
    borderColor: '#F4F4F4',
  },
  inputFieldContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  inputFieldContainerWithLabel: {
    paddingTop: SPACING.md + 4,
    paddingBottom: SPACING.xs,
  },
  floatingLabel: {
    position: 'absolute',
    top: SPACING.xs,
    left: 0,
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unifiedInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    padding: 0,
  },
  eyeButton: {
    padding: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  errorText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  errorMessageContainerAboveButton: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    marginHorizontal: SPACING.md,
    alignItems: 'center',
  },
  errorTextAboveButton: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    textAlign: 'center',
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
  },
  alarmText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
    color: COLORS.error,
  },
  setPasswordButton: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.text.red,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.smmd,
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: '#0000001A',
  },
  setPasswordButtonDisabled: {
    backgroundColor: '#0000001A',
  },
  setPasswordButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  setPasswordButtonTextDisabled: {
    color: COLORS.black,
  },
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signinText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  signinLink: {
    fontSize: FONTS.sizes.md,
    color: COLORS.black,
    fontWeight: '700',
  },
  dividerText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    margin: SPACING.md,
    marginVertical: SPACING.mdlg,
    marginTop: SPACING.md,
    fontWeight: '400',
    textAlign: 'center',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  socialButton: {
    width: 60,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    width: 50,
    height: 50,
  },
  socialButtonText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '400',
    color: COLORS.gray[500],
    marginLeft: SPACING.xs,
  },
  arrowDownContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  footerContainer: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
    marginTop: SPACING.lg,
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

export default SetPasswordScreen;

