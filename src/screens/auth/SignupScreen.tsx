import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  BackHandler,
  Modal,
  FlatList,
  TextInput as RNTextInput,
  StatusBar,
} from 'react-native';
import Icon from '../../components/Icon';
import ArrowBackIcon from '../../assets/icons/ArrowBackIcon';
import ArrowDownIcon from '../../assets/icons/ArrowDownIcon';
import { Button, TextInput } from '../../components';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useRegisterMutation } from '../../hooks/useAuthMutations';
import { useSocialLogin } from '../../services/socialAuth';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, VALIDATION_RULES, ERROR_MESSAGES, SCREEN_HEIGHT } from '../../constants';
import { useAppSelector } from '../../store/hooks';
import { translations } from '../../i18n/translations';
import ShieldCheckIcon from '../../assets/icons/ShieldCheckIcon';
import ArrowDropDownIcon from '../../assets/icons/ArrowDropDownIcon';

const SignupScreen: React.FC = () => {
  const navigation = useNavigation();
  const { socialLogin, signupError, clearSignupError } = useAuth();
  const locale = useAppSelector((state) => state.i18n.locale) as 'en' | 'ko' | 'zh';
  const { showToast } = useToast();
  
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
  
  const { mutate: register, isLoading, isError, error, isSuccess, data } = useRegisterMutation({
    onSuccess: (data) => {
      // The AuthContext will handle updating the global state
      // This is just for side effects if needed
      // console.log('User Registeration successful:', data);
      showToast(t('auth.signupSuccess') || 'Signup successful', 'success');
      handleLogin();
    },
    onError: (errorMessage, errorCode) => {
      // Handle specific error codes
      // console.log('User signup error:', errorMessage, 'Code:', errorCode);
      
      if (errorCode === 'EMAIL_ALREADY_REGISTERED') {
        // Show error only on email field
        setErrors({ 
          email: t('auth.emailAlreadyRegistered')
        });
        showToast(t('auth.emailAlreadyRegistered') || 'Email already registered', 'error');
      } else if (errorCode === 'INVALID_REFERRAL_CODE') {
        // Show error only on referral code field
        setErrors({ 
          referralCode: t('auth.invalidReferralCode')
        });
        showToast(t('auth.invalidReferralCode') || 'Invalid referral code', 'error');
      } else if (errorCode === 'VALIDATION_ERROR') {
        // Show validation error
        setErrors({ 
          email: errorMessage
        });
        showToast(errorMessage || 'Validation error', 'error');
      } else {
        // Show generic error
        showToast(errorMessage || t('auth.signupFailed') || 'Signup failed', 'error');
      }
    }
  });
  
  const { mutate: socialLoginMutation, isLoading: isSocialLoading, isError: isSocialError, error: socialError } = useSocialLogin({
    onSuccess: (data) => {
      // Handle successful social login
      // console.log('Social login successful:', data);
      // showToast({ message: `Welcome ${data.userInfo.name || 'User'}!`, type: 'success' });
    },
    onError: (error) => {
      // Handle social login error
      // console.log('Social signup error:', error);
      // showToast({ message: error, type: 'error' });
    }
  });
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    referralCode: '',
    gender: 'woman',
    user_id: '',
  });
  // Show password fields as dots but keep inputs always visible.
  // Default: not showing raw characters (secureTextEntry = true).
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [hasSignupError, setHasSignupError] = useState(false);
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Email verification screen is no longer needed after signup.
  // Success handling is done in the onSuccess callback (toast + navigate to Login).

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name) {
      newErrors.name = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (formData.name.length < VALIDATION_RULES.NAME_MIN_LENGTH) {
      newErrors.name = t('auth.nameTooShort');
    }

    if (!formData.email) {
      newErrors.email = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (!VALIDATION_RULES.EMAIL_REGEX.test(formData.email)) {
      newErrors.email = ERROR_MESSAGES.INVALID_EMAIL;
    }

    // Phone number is optional
    // if (!formData.phone) {
    //   newErrors.phone = ERROR_MESSAGES.REQUIRED_FIELD;
    // } else if (formData.phone.length < 10) {
    //   newErrors.phone = 'Phone number must be at least 10 digits';
    // }

    if (!formData.password) {
      newErrors.password = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (formData.password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
      newErrors.password = t('auth.passwordTooShort');
    } else if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(formData.password)) {
      newErrors.password = t('auth.passwordTooShort');
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordsDoNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    // console.log('SignupScreen: handleSignup called');
    // Always clear field errors and signup errors first
    setErrors({});
    setHasSignupError(false);
    clearSignupError();

    const isValid = validateForm();
    if (!isValid) {
      // console.log('SignupScreen: Form validation failed');
      return;
    }

    // console.log('SignupScreen: Calling signup function with data:', {
    //   email: formData.email,
    //   name: formData.name,
    //   phone: formData.phone || '',
    //   isBusiness: isBusinessAccount,
    //   referralCode: formData.referralCode || '',
    // });
    await register({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      phone: formData.phone || '',
      isBusiness: isBusinessAccount,
      referralCode: formData.referralCode || undefined,
      user_id: formData.user_id || undefined,
      isSeller,
    });
    // console.log('SignupScreen: Signup function completed');
  };

  // Demo signup function
  const handleDemoSignup = async () => {
    // Clear any existing errors
    setErrors({});
    setHasSignupError(false);
    clearSignupError();
    
    // Use demo credentials
    const demoData = {
      name: 'Demo User',
      email: 'demo@example.com',
      password: 'Demo123!',
      confirmPassword: 'Demo123!',
      referralCode: '',
      gender: 'woman',
    };
    
    // Update form data to show demo credentials
    // setFormData(demoData);
    
    // // Perform signup with demo credentials
    // await register({
    //   email: demoData.email,
    //   password: demoData.password,
    //   name: demoData.name,
    //   gender: demoData.gender,
    // });
  };

  const handleSocialSignup = async (provider: 'google' | 'facebook' | 'apple' | 'naver' | 'kakao') => {
    try {
      await socialLoginMutation(provider);
    } catch (error) {
      // console.log('Social signup error:', error);
      // showToast({ message: error as string, type: 'error' });
    }
  };

  const handleLogin = () => {
    // console.log('SignupScreen: handleLogin called - navigating to Login');
    // console.log('SignupScreen: handleLogin call stack:', new Error().stack);
    // Clear any signup errors before navigating to login
    clearSignupError();
    navigation.navigate('Login' as never);
  };

  useFocusEffect(
    React.useCallback(() => {
      // console.log('SignupScreen: useFocusEffect - screen focused');
      // console.log('SignupScreen: Current signupError when focused:', signupError);
      // console.log('SignupScreen: Current hasSignupError when focused:', hasSignupError);
      
      const onBackPress = () => {
        // console.log('SignupScreen: Back button pressed');
        // After logout, go to Home instead of going back
        (navigation as any).navigate('Main', { screen: 'Home' });
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      return () => {
        // console.log('SignupScreen: useFocusEffect - screen unfocused');
        // console.log('SignupScreen: Current signupError when unfocused:', signupError);
        // console.log('SignupScreen: Current hasSignupError when unfocused:', hasSignupError);
        sub.remove();
      };
    }, [navigation, signupError, hasSignupError])
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {/* Match login screen background */}
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
              <Icon name="arrow-back" size={20} color={COLORS.text.primary} />
            </TouchableOpacity>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => navigation.navigate('LanguageSettings' as never)}
              >
                <Text style={styles.flagText}>{getLanguageFlag(locale)}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* <View style={styles.subHeader}>
            <Text style={styles.subtitle}>{t('auth.signup')}</Text>
            <Text style={styles.subtitle}>Please register to continue</Text>
          </View> */}
          <View style={styles.form}>
            <View style={styles.logoContainer}>
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

              {/* Name Input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.unifiedInputContainer,
                  !isInputFocused && styles.unifiedInputContainerUnfocused
                ]}>
                  <View style={[
                    styles.inputFieldContainer,
                    formData.name.length > 0 && styles.inputFieldContainerWithLabel
                  ]}>
                    {formData.name.length > 0 && (
                      <Text style={styles.floatingLabel}>
                        {t('auth.name') || 'Name'}
                      </Text>
                    )}
                    <View style={styles.inputRow}>
                      <RNTextInput
                        placeholder={formData.name.length > 0 
                          ? '' 
                          : (t('auth.enterName') || 'Enter name')
                        }
                        placeholderTextColor={'#999999'}
                        value={formData.name}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        onChangeText={(text) => {
                          setFormData({ ...formData, name: text });
                          if (errors.name) {
                            setErrors({ ...errors, name: '' });
                          }
                          if (signupError) {
                            clearSignupError();
                            setHasSignupError(false);
                          }
                        }}
                        autoCapitalize="words"
                        autoCorrect={false}
                        style={styles.unifiedInput}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* User ID Input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.unifiedInputContainer,
                  !isInputFocused && styles.unifiedInputContainerUnfocused
                ]}>
                  <View style={[
                    styles.inputFieldContainer,
                    formData.user_id.length > 0 && styles.inputFieldContainerWithLabel
                  ]}>
                    {formData.user_id.length > 0 && (
                      <Text style={styles.floatingLabel}>
                        {t('auth.userId') || 'User ID'}
                      </Text>
                    )}
                    <View style={styles.inputRow}>
                      <RNTextInput
                        placeholder={formData.user_id.length > 0
                          ? ''
                          : (t('auth.enterUserId') || 'Enter user ID')
                        }
                        placeholderTextColor={'#999999'}
                        value={formData.user_id}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        onChangeText={(text) => {
                          setFormData({ ...formData, user_id: text });
                          if (errors.user_id) {
                            setErrors({ ...errors, user_id: '' });
                          }
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={styles.unifiedInput}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.unifiedInputContainer,
                  !isInputFocused && styles.unifiedInputContainerUnfocused
                ]}>
                  <View style={[
                    styles.inputFieldContainer,
                    formData.email.length > 0 && styles.inputFieldContainerWithLabel
                  ]}>
                    {formData.email.length > 0 && (
                      <Text style={styles.floatingLabel}>
                        {t('auth.email') || 'Email'}
                      </Text>
                    )}
                    <View style={styles.inputRow}>
                      <RNTextInput
                        placeholder={formData.email.length > 0
                          ? ''
                          : (t('auth.enterEmail') || 'Enter email')
                        }
                        placeholderTextColor={'#999999'}
                        value={formData.email}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        onChangeText={(text) => {
                          setFormData({ ...formData, email: text });
                          if (errors.email) {
                            setErrors({ ...errors, email: '' });
                          }
                          if (signupError) {
                            clearSignupError();
                            setHasSignupError(false);
                          }
                          if (isError) {
                            setErrors({ ...errors, email: '', password: '' });
                          }
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={styles.unifiedInput}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.unifiedInputContainer,
                  !isInputFocused && styles.unifiedInputContainerUnfocused
                ]}>
                  <View style={[
                    styles.inputFieldContainer,
                    formData.phone.length > 0 && styles.inputFieldContainerWithLabel
                  ]}>
                    {formData.phone.length > 0 && (
                      <Text style={styles.floatingLabel}>
                        {t('auth.phone') || 'Phone'}
                      </Text>
                    )}
                    <View style={styles.inputRow}>
                      <RNTextInput
                        placeholder={formData.phone.length > 0 
                          ? '' 
                          : (t('auth.enterPhoneNumber') || 'Enter phone')
                        }
                        placeholderTextColor={'#999999'}
                        value={formData.phone}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        onChangeText={(text) => {
                          setFormData({ ...formData, phone: text });
                          if (errors.phone) {
                            setErrors({ ...errors, phone: '' });
                          }
                        }}
                        keyboardType="phone-pad"
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={styles.unifiedInput}
                      />
                    </View>
                  </View>
                </View>
                
                {/* Error text below phone input */}
                {errors.phone && (
                  <View style={styles.errorMessageContainer}>
                    <Text style={styles.errorText}>{errors.phone}</Text>
                  </View>
                )}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.unifiedInputContainer,
                  !isInputFocused && styles.unifiedInputContainerUnfocused
                ]}>
                  <View style={[
                    styles.inputFieldContainer,
                    formData.password.length > 0 && styles.inputFieldContainerWithLabel
                  ]}>
                    {formData.password.length > 0 && (
                      <Text style={styles.floatingLabel}>
                        {t('auth.password') || 'Password'}
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
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        onChangeText={(text) => {
                          setFormData({ ...formData, password: text });
                          if (errors.password) {
                            setErrors({ ...errors, password: '' });
                          }
                          if (signupError) {
                            clearSignupError();
                            setHasSignupError(false);
                          }
                          if (isError) {
                            setErrors({ ...errors, email: '', password: '' });
                          }
                        }}
                        keyboardType="default"
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry={!showPassword}
                        style={styles.unifiedInput}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Icon 
                          name={showPassword ? "eye-outline" : "eye-off-outline"} 
                          size={20} 
                          color={COLORS.gray[600]} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                
                {/* Error text below password input */}
                {errors.password && (
                  <View style={styles.errorMessageContainer}>
                    <Text style={styles.errorText}>{errors.password}</Text>
                  </View>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.unifiedInputContainer,
                  !isInputFocused && styles.unifiedInputContainerUnfocused
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
                          : (t('auth.confirmPassword') || 'Re-enter password')
                        }
                        placeholderTextColor={'#999999'}
                        value={formData.confirmPassword}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        onChangeText={(text) => {
                          setFormData({ ...formData, confirmPassword: text });
                          if (errors.confirmPassword) {
                            setErrors({ ...errors, confirmPassword: '' });
                          }
                        }}
                        keyboardType="default"
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry={!showConfirmPassword}
                        style={styles.unifiedInput}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <Icon 
                          name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                          size={20} 
                          color={COLORS.gray[600]} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                
                {/* Error text below confirm password input */}
                {errors.confirmPassword && (
                  <View style={styles.errorMessageContainer}>
                    <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                  </View>
                )}
              </View>

              {/* Referral Code Input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.unifiedInputContainer,
                  !isInputFocused && styles.unifiedInputContainerUnfocused
                ]}>
                  <View style={[
                    styles.inputFieldContainer,
                    formData.referralCode.length > 0 && styles.inputFieldContainerWithLabel
                  ]}>
                    {formData.referralCode.length > 0 && (
                      <Text style={styles.floatingLabel}>
                        {t('auth.referralCode') || 'Referral Code'}
                      </Text>
                    )}
                    <View style={styles.inputRow}>
                      <RNTextInput
                        placeholder={formData.referralCode.length > 0 
                          ? '' 
                          : (t('auth.enterReferralCode') || 'Enter referral code')
                        }
                        placeholderTextColor={'#999999'}
                        value={formData.referralCode}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        onChangeText={(text) => {
                          setFormData({ ...formData, referralCode: text });
                          if (errors.referralCode) {
                            setErrors({ ...errors, referralCode: '' });
                          }
                        }}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        style={styles.unifiedInput}
                      />
                    </View>
                  </View>
                </View>
                
                {/* Error text below referral code input */}
                {errors.referralCode && (
                  <View style={styles.errorMessageContainer}>
                    <Text style={styles.errorText}>{errors.referralCode}</Text>
                  </View>
                )}
              </View>

              <View style={styles.checkboxContainer}>
                {/* <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setIsBusinessAccount(!isBusinessAccount)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isBusinessAccount && styles.checkboxChecked]}>
                    {isBusinessAccount && (
                      <Icon name="checkmark" size={16} color={COLORS.white} />
                    )}
                  </View>
                  <Text style={styles.checkboxText}>{t('auth.registerAsBusinessAccount')}</Text>
                </TouchableOpacity> */}

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setIsSeller(!isSeller)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isSeller && styles.checkboxChecked]}>
                    {isSeller && (
                      <Icon name="checkmark" size={16} color={COLORS.white} />
                    )}
                  </View>
                  <Text style={styles.checkboxText}>
                    {t('auth.registerAsSeller') || 'Register as a Seller'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setAgreeToTerms(!agreeToTerms)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                    {agreeToTerms && (
                      <Icon name="checkmark" size={16} color={COLORS.white} />
                    )}
                  </View>
                  <Text style={styles.checkboxText}>
                    {t('auth.agreeToTerms')}{' '}
                    <Text style={styles.linkText}>{t('auth.termsOfService')}</Text>
                    {' '}{t('auth.and')}{' '}
                    <Text style={styles.linkText}>{t('auth.privacyPolicy')}</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              <Button
                title={t('auth.register')}
                onPress={handleSignup}
                disabled={isLoading || !formData.email || !formData.password || !formData.confirmPassword || !formData.name || !agreeToTerms}
                loading={isLoading}
                variant="danger"
                style={
                  (isLoading || !formData.email || !formData.password || !formData.confirmPassword || !formData.name || !agreeToTerms)
                    ? { ...styles.registerButton, ...styles.registerButtonDisabled }
                    : styles.registerButton
                }
                textStyle={styles.registerButtonText}
              />

            </View>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{t('auth.alreadyHaveAccount')} </Text>
              <TouchableOpacity onPress={handleLogin}>
                <Text style={styles.loginLink}>{t('auth.loginButton')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>

            <View style={styles.socialButtons}>
              {/* 1. Google */}
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialSignup('google')}
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
                onPress={() => handleSocialSignup('kakao')}
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
                onPress={() => handleSocialSignup('naver')}
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
                onPress={() => handleSocialSignup('facebook')}
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
                onPress={() => handleSocialSignup('apple')}
              >
                <Image
                  source={require('../../assets/icons/apple.png')}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
                <Text style={styles.socialButtonText}>apple</Text>
              </TouchableOpacity>
            </View>

            {/* Footer bar - Inside ScrollView after social buttons */}
            <View style={styles.footerContainer}>
              {/* 1. Support text */}
              <Text style={styles.footerSupportText}>
                <Text style={styles.footerSupportGray}>
                  {t('auth.supportText') || '주식회사:투데이직구 /대표 유두성 주소: 경기도 의정부시 녹양로34번길 47, 101동 305호(가능동, e편한세상 녹양역) 사업자번호: 661-12-03163 전화: 07077926663 서비스 이메일: taoexpress_1@163.com '}
                </Text>
              </Text>

              {/* 2. Copyright */}
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

// ... existing styles ...
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
  headerTitle: {
    fontSize: FONTS.sizes['xl'],
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 40,
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
  subHeader: {
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  logoContainer: {
    position: 'absolute',
    top: 28, // just below logo area
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1, // send behind form inputs
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
    paddingHorizontal: SPACING.xs,
    paddingBottom: SPACING['3xl']
  },
  formInputs: {
    marginTop: 147,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingTop: 0,
    backgroundColor: COLORS.background,
    overflow: 'visible', // Changed to visible so dropdown can show over
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
  unifiedInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.black,
    marginTop: SPACING.md,
    overflow: 'hidden',
    paddingRight: SPACING.sm,
  },
  unifiedInputContainerUnfocused: {
    borderColor: '#F4F4F4',
    backgroundColor: '#F4F4F4',
  },
  inputFieldContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    position: 'relative',
  },
  inputFieldContainerWithLabel: {
    paddingTop: SPACING.xs + 16, // Add space for label
    paddingBottom: SPACING.xs,
  },
  floatingLabel: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.md,
    fontSize: FONTS.sizes.xs,
    color: '#999999',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unifiedInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    padding: 0,
    minHeight: 20,
  },
  eyeButton: {
    padding: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: SPACING.md,
    position: 'relative',
    zIndex: 1,
  },
  label: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.red,
    marginBottom: SPACING.sm,
  },
  signupLabel: {
    color: COLORS.black,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: '#FF6B9D',
  },
  input: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  eyeIcon: {
    padding: SPACING.xs,
  },
  errorMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  errorText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    marginLeft: SPACING.xs,
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
  genderContainer: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
    justifyContent: 'space-between',
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.xl,
    width: '50%',
  },
  genderSelected: {
    // Add any selected state styling if needed
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: COLORS.black,
    backgroundColor: COLORS.black,
  },
  radioInner: {
    width: 0,
    height: 0,
  },
  genderText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  genderTextSelected: {
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  checkboxContainer: {
    margin: SPACING.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  checkboxText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    flex: 1,
  },
  linkText: {
    color: COLORS.red,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: COLORS.text.red,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.smmd,
    marginHorizontal: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  registerButtonDisabled: {
    backgroundColor: COLORS.lightRed,
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  demoButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.smmd,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  demoButtonText: {
    fontSize: FONTS.sizes.base,
    fontWeight: '500',
    color: COLORS.white,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    margin: SPACING.md,
    marginVertical: SPACING.md,
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
  socialButtonGoogle: {
    backgroundColor: '#F9FAFB',
    borderColor: COLORS.border,
  },
  socialButtonText: {
    fontSize: 10,
    fontWeight: '400',
    color: COLORS.gray[500],
    marginLeft: SPACING.xs,
  },
  socialIcon: {
    width: 50,
    height: 50,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  loginText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  loginLink: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.red,
    fontWeight: '700',
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

export default SignupScreen;