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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import ArrowBackIcon from '../../assets/icons/ArrowBackIcon';
import { Button } from '../../components';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../types';
import { useResetPasswordMutation } from '../../hooks/useAuthMutations';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SCREEN_HEIGHT } from '../../constants';
import { useAppSelector } from '../../store/hooks';
import { translations } from '../../i18n/translations';
import LinearGradient from 'react-native-linear-gradient';

type ResetPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordScreenRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
  const route = useRoute<ResetPasswordScreenRouteProp>();
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
  
  const { mutate: resetPassword, isLoading } = useResetPasswordMutation({
    onSuccess: (data) => {
      // Navigate to login page on successful password reset
      navigation.navigate('Login' as never);
    },
    onError: (error) => {
      // Error handling
      setErrors({ general: error || 'Failed to reset password. Please try again.' });
    },
  });
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

  const handleResetPassword = async () => {
    setErrors({});
    
    if (!validateForm()) return;

    const { token, email } = route.params || { token: '', email: '' };
    
    if (!token || !email) {
      return;
    }

    await resetPassword({
      email,
      code: token,
      password: formData.password,
    });
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
              {t('auth.changePassword') || 'Change password'}
            </Text>

            {/* Instruction */}
            <Text style={styles.instruction}>
              {t('auth.passwordLengthError') || 'Must be 6-20 characters (letters, numbers or symbols)'}
            </Text>

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
                      {t('auth.newPassword') || 'New Password'}
                    </Text>
                  )}
                  <View style={styles.inputRow}>
                    <RNTextInput
                      placeholder={formData.password.length > 0 
                        ? '' 
                        : (t('auth.newPassword') || 'New Password')
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
                      {t('auth.confirmNewPassword') || 'Confirm password'}
                    </Text>
                  )}
                  <View style={styles.inputRow}>
                    <RNTextInput
                      placeholder={formData.confirmPassword.length > 0 
                        ? '' 
                        : (t('auth.confirmNewPassword') || 'Confirm password')
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
              
              {/* Error text below confirm password input */}
              {errors.confirmPassword && (
                <View style={styles.errorMessageContainer}>
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                </View>
              )}
            </View>

            {/* Update Password Button */}
            <Button
              title={isLoading ? (t('auth.updating') || 'Updating...') : (t('auth.updatePassword') || 'Update password')}
              onPress={handleResetPassword}
              disabled={isLoading || !formData.password || !formData.confirmPassword}
              loading={isLoading}
              variant="danger"
              style={
                (isLoading || !formData.password || !formData.confirmPassword)
                  ? { ...styles.updateButton, ...styles.updateButtonDisabled }
                  : styles.updateButton
              }
              textStyle={
                (isLoading || !formData.password || !formData.confirmPassword)
                  ? { ...styles.updateButtonText, ...styles.updateButtonTextDisabled }
                  : styles.updateButtonText
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
    padding: SPACING.md,
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
    lineHeight: 20,
  },
  inputContainer: {
    marginTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  unifiedInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.xs,
    minHeight: 56,
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
  updateButton: {
    backgroundColor: COLORS.text.red,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.smmd,
    alignItems: 'center',
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: '#0000001A',
  },
  updateButtonDisabled: {
    backgroundColor: '#0000',
  },
  updateButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  updateButtonTextDisabled: {
    color: '#666666',
  },
});

export default ResetPasswordScreen;
