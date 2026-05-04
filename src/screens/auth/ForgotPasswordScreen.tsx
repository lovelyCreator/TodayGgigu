import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput as RNTextInput,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import ArrowBackIcon from '../../assets/icons/ArrowBackIcon';
import ArrowDropDownIcon from '../../assets/icons/ArrowDropDownIcon';
import { Button } from '../../components';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';
import { useForgotPasswordMutation } from '../../hooks/useAuthMutations';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SCREEN_HEIGHT } from '../../constants';
import { useAppSelector } from '../../store/hooks';
import { translations } from '../../i18n/translations';
import LinearGradient from 'react-native-linear-gradient';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
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

  const { mutate: forgotPassword, isLoading } = useForgotPasswordMutation({
    onSuccess: (data) => {
      // Navigate to OTP verification or next step
      if (recoveryMethod === 'email') {
        setTimeout(() => {
          navigation.navigate('OtpVerification', { 
            email: inputValue,
            recoveryMethod: 'email'
          });
        }, 1000);
      }
      // For phone, navigation is handled in handleContinue
    },
    onError: (error) => {
      // Error handling
    },
  });

  const [recoveryMethod, setRecoveryMethod] = useState<'email' | 'phone'>('email');
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isPhoneNumber, setIsPhoneNumber] = useState(false);
  const [countryCode, setCountryCode] = useState('+82'); // Default to Korean
  const [showCountryCodeModal, setShowCountryCodeModal] = useState(false);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);

  // Common email domains
  const commonEmailDomains = [
    'qq.com',
    'aol.com',
    'hotmail.com',
    'icloud.com',
    'gmail.com',
    'outlook.com',
    'naver.com',
    'yahoo.com',
    'kakao.com',
  ];

  // Common country codes
  const countryCodes = [
    { code: '+82', flag: '🇰🇷', name: 'South Korea' },
    { code: '+1', flag: '🇺🇸', name: 'United States' },
    { code: '+86', flag: '🇨🇳', name: 'China' },
    { code: '+81', flag: '🇯🇵', name: 'Japan' },
    { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
    { code: '+33', flag: '🇫🇷', name: 'France' },
    { code: '+49', flag: '🇩🇪', name: 'Germany' },
    { code: '+61', flag: '🇦🇺', name: 'Australia' },
    { code: '+65', flag: '🇸🇬', name: 'Singapore' },
    { code: '+852', flag: '🇭🇰', name: 'Hong Kong' },
  ];

  const handleRecoveryMethodChange = (method: 'email' | 'phone') => {
    setRecoveryMethod(method);
    setInputValue('');
    setIsPhoneNumber(method === 'phone');
    setShowEmailSuggestions(false);
  };

  const handleInputChange = (text: string) => {
    if (recoveryMethod === 'phone') {
      // Remove non-numeric characters for phone
      const numericText = text.replace(/[^0-9]/g, '');
      setInputValue(numericText);
    } else {
      setInputValue(text);
      
      // Show email suggestions when @ is typed
      const hasAtSymbol = text.includes('@');
      if (hasAtSymbol) {
        const atIndex = text.indexOf('@');
        const afterAt = text.substring(atIndex + 1);
        
        if (afterAt.length === 0 || !afterAt.includes('.')) {
          // Filter domains based on what's typed after @
          const filtered = commonEmailDomains.filter(domain =>
            domain.toLowerCase().startsWith(afterAt.toLowerCase())
          );
          setEmailSuggestions(filtered);
          setShowEmailSuggestions(filtered.length > 0);
        } else {
          setShowEmailSuggestions(false);
        }
      } else {
        setShowEmailSuggestions(false);
      }
    }
  };

  const handleContinue = async () => {
    if (!inputValue) return;

    if (recoveryMethod === 'email') {
      await forgotPassword({ email: inputValue });
    } else {
      // Handle phone number recovery
      const phoneNumber = `${countryCode}${inputValue}`;
      await forgotPassword({ email: phoneNumber });
      // Navigate to OTP verification with phone number
      setTimeout(() => {
        navigation.navigate('OtpVerification', { 
          email: phoneNumber,
          phoneNumber: phoneNumber,
          countryCode: countryCode,
          recoveryMethod: 'phone'
        });
      }, 1000);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

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
              onPress={handleBack}
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
              {t('auth.resetYourPassword') || 'Reset your password'}
            </Text>

            {/* Instruction */}
            <Text style={styles.instruction}>
              {t('auth.resetPasswordInstruction') || 'Enter your email, Member ID or phone number to get back into your account'}
            </Text>

            {/* Check Buttons */}
            <View style={styles.checkContainer}>
              <TouchableOpacity
                style={styles.checkOption}
                onPress={() => handleRecoveryMethodChange('email')}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, recoveryMethod === 'email' && styles.checkboxChecked]}>
                  {recoveryMethod === 'email' && (
                    <Icon name="checkmark" size={14} color={COLORS.white} />
                  )}
                </View>
                <Text style={styles.checkLabel}>
                  {t('auth.emailOrMemberId') || 'Email/Member ID'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkOption}
                onPress={() => handleRecoveryMethodChange('phone')}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, recoveryMethod === 'phone' && styles.checkboxChecked]}>
                  {recoveryMethod === 'phone' && (
                    <Icon name="checkmark" size={14} color={COLORS.white} />
                  )}
                </View>
                <Text style={styles.checkLabel}>
                  {t('auth.phoneNumber') || 'Phone number'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Field */}
            <View style={styles.inputContainer}>
              <View style={[
                styles.unifiedInputContainer,
                !isInputFocused && styles.unifiedInputContainerUnfocused
              ]}>
                {/* Country Code Selector - Left side, only show when phone and input > 1 */}
                {recoveryMethod === 'phone' && inputValue.length > 1 && (
                  <>
                    <TouchableOpacity
                      style={styles.countryCodeSelector}
                      onPress={() => setShowCountryCodeModal(true)}
                    >
                      <View style={styles.countryCodeFlagContainer}>
                        <Text style={styles.countryCodeFlag}>
                          {countryCodes.find(c => c.code === countryCode)?.flag || '🇰🇷'}
                        </Text>
                      </View>
                      <Text style={styles.countryCodeText}>{countryCode}</Text>
                      <ArrowDropDownIcon width={8} height={8} color={COLORS.black} />
                    </TouchableOpacity>
                    <View style={styles.separator} />
                  </>
                )}
                
                <View style={[
                  styles.inputFieldContainer,
                  inputValue.length > 0 && styles.inputFieldContainerWithLabel
                ]}>
                  {inputValue.length > 0 && (
                    <Text style={styles.floatingLabel}>
                      {recoveryMethod === 'phone'
                        ? (t('auth.enterPhoneNumber') || 'Enter phone number')
                        : (t('auth.emailOrMemberId') || 'Email or Member ID')
                      }
                    </Text>
                  )}
                  <View style={styles.inputRow}>
                    <RNTextInput
                      placeholder={inputValue.length > 0 
                        ? '' 
                        : (recoveryMethod === 'phone'
                          ? (t('auth.enterPhoneNumber') || 'Enter phone number')
                          : (t('auth.emailOrMemberId') || 'Email or Member ID')
                        )
                      }
                      placeholderTextColor={'#999999'}
                      value={inputValue}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => {
                        setIsInputFocused(false);
                        setTimeout(() => {
                          setShowEmailSuggestions(false);
                        }, 200);
                      }}
                      onChangeText={handleInputChange}
                      keyboardType={recoveryMethod === 'phone' ? "phone-pad" : "email-address"}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.unifiedInput}
                    />
                  </View>
                </View>
                
                {inputValue.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setInputValue('');
                      setShowEmailSuggestions(false);
                    }}
                  >
                    <Icon name="close" size={12} color={COLORS.white} />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Email Suggestions Dropdown */}
              {showEmailSuggestions && emailSuggestions.length > 0 && recoveryMethod === 'email' && (
                <View style={styles.emailSuggestionsWrapper}>
                  <View style={styles.emailSuggestionsContainer}>
                    {emailSuggestions.map((domain, index) => {
                      const atIndex = inputValue.indexOf('@');
                      const beforeAt = inputValue.substring(0, atIndex);
                      const fullEmail = `${beforeAt}@${domain}`;
                      const isLast = index === emailSuggestions.length - 1;
                      
                      return (
                        <TouchableOpacity
                          key={`suggestion-${fullEmail}`}
                          style={[
                            styles.emailSuggestionItem,
                            isLast && styles.emailSuggestionItemLast
                          ]}
                          onPress={() => {
                            setInputValue(fullEmail);
                            setShowEmailSuggestions(false);
                            setIsInputFocused(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.emailSuggestionText}>{fullEmail}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* Continue Button */}
            <Button
              title={t('auth.continue') || 'Continue'}
              onPress={handleContinue}
              disabled={isLoading || !inputValue}
              loading={isLoading}
              variant="danger"
              style={
                (isLoading || !inputValue)
                  ? { ...styles.continueButton, ...styles.continueButtonDisabled }
                  : styles.continueButton
              }
              textStyle={
                (isLoading || !inputValue)
                  ? { ...styles.continueButtonText, ...styles.continueButtonTextDisabled }
                  : styles.continueButtonText
              }
            />
          </View>
        </ScrollView>

        {/* Country Code Selection Modal */}
        <Modal
          visible={showCountryCodeModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCountryCodeModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCountryCodeModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('auth.selectCountryCode') || 'Select Country Code'}</Text>
                <TouchableOpacity
                  onPress={() => setShowCountryCodeModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Icon name="close" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={countryCodes}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.countryCodeItem,
                      countryCode === item.code && styles.countryCodeItemSelected
                    ]}
                    onPress={() => {
                      setCountryCode(item.code);
                      setShowCountryCodeModal(false);
                    }}
                  >
                    <Text style={styles.countryCodeItemFlag}>{item.flag}</Text>
                    <Text style={styles.countryCodeItemText}>{item.code}</Text>
                    <Text style={styles.countryCodeItemName}>{item.name}</Text>
                    {countryCode === item.code && (
                      <Icon name="checkmark" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
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
  instruction: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  checkContainer: {
    marginBottom: SPACING.lg,
  },
  checkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.text.red,
    borderColor: COLORS.text.red,
  },
  checkLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: SPACING.lg,
    position: 'relative',
    zIndex: 1,
  },
  unifiedInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.black,
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
    paddingTop: SPACING.xs + 16,
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
  clearButton: {
    width: 14.4,
    height: 14.4,
    borderRadius: 10,
    backgroundColor: '#999999',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
    alignSelf: 'center',
  },
  separator: {
    width: 1,
    height: 32,
    backgroundColor: '#F4F4F4',
  },
  countryCodeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  countryCodeFlagContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeFlag: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginRight: SPACING.xs,
  },
  emailSuggestionsWrapper: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 2000,
    marginTop: SPACING.xs,
  },
  emailSuggestionsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 264,
    overflow: 'hidden',
  },
  emailSuggestionItem: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  emailSuggestionItemLast: {
    borderBottomWidth: 0,
  },
  emailSuggestionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
  },
  continueButton: {
    backgroundColor: COLORS.text.red,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.smmd,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  continueButtonDisabled: {
    backgroundColor: '#F4F4F4',
  },
  continueButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  continueButtonTextDisabled: {
    color: COLORS.black,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  countryCodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  countryCodeItemSelected: {
    backgroundColor: COLORS.gray[50],
  },
  countryCodeItemFlag: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  countryCodeItemText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginRight: SPACING.sm,
    minWidth: 60,
  },
  countryCodeItemName: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
  },
});

export default ForgotPasswordScreen;
