import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from '../../../../components/Icon';
import { LinearGradient } from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SPACING } from '../../../../constants';
import { RootStackParamList } from '../../../../types';
import { useChangePasswordMutation } from '../../../../hooks/useAuthMutations';
import { useAppSelector } from '../../../../store/hooks';
import { translations } from '../../../../i18n/translations';

type ChangePasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ChangePassword'>;

const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<ChangePasswordScreenNavigationProp>();
  const locale = useAppSelector((state) => state.i18n.locale) as 'en' | 'ko' | 'zh';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(true);
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(true);
  
  // Translation function
  const t = (key: string, params?: { [key: string]: string }) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    if (params && typeof value === 'string') {
      Object.keys(params).forEach(paramKey => {
        value = value.replace(`{${paramKey}}`, params[paramKey]);
      });
    }
    return value || key;
  };
  
  const { mutate: changePassword, isLoading } = useChangePasswordMutation({
    onSuccess: () => {
      Alert.alert(
        t('shareApp.success'),
        t('profile.passwordChanged'),
        [
          {
            text: t('profile.ok'),
            onPress: () => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              navigation.goBack();
            },
          },
        ]
      );
    },
    onError: (error) => {
      Alert.alert(t('common.error'), error || t('profile.failedToUpdateProfile'));
    }
  });

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('profile.missingInformation'), t('profile.fillAllFields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('profile.passwordMismatch'), t('profile.passwordsDoNotMatch'));
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(t('profile.weakPassword'), t('profile.passwordMinLength'));
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert(t('profile.samePassword'), t('profile.passwordMustBeDifferent'));
      return;
    }

    changePassword({ currentPassword, newPassword });
  };

  const renderHeader = () => (
    // <LinearGradient
    //   colors={['#FFE4E6', '#FFF0F1', '#FFFFFF']}
    <View
      style={styles.header}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('profile.changePassword')}</Text>
      <View style={styles.placeholder} />
    {/* </LinearGradient> */}
    </View>
  );

  const renderPasswordInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    showPassword: boolean,
    onToggleShow: () => void,
    placeholder: string
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.text.secondary}
          secureTextEntry={showPassword}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={onToggleShow}
        >
          <Icon
            name={showPassword ? "eye-outline" : "eye-off-outline"}
            size={20}
            color={COLORS.gray[500]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPasswordRequirements = () => (
    <View style={styles.requirementsCard}>
      <Text style={styles.requirementsTitle}>{t('profile.passwordRequirements')}</Text>
      <View style={styles.requirementsList}>
        <View style={styles.requirementItem}>
          <Icon
            name={newPassword.length >= 8 ? "checkmark-circle" : "ellipse-outline"}
            size={18}
            color={newPassword.length >= 8 ? '#4CAF50' : COLORS.gray[400]}
          />
          <Text style={[
            styles.requirementText,
            { color: newPassword.length >= 8 ? '#4CAF50' : COLORS.gray[500] }
          ]}>
            {t('profile.atLeast8Chars')}
          </Text>
        </View>
        <View style={styles.requirementItem}>
          <Icon
            name={/[A-Z]/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"}
            size={18}
            color={/[A-Z]/.test(newPassword) ? '#4CAF50' : COLORS.gray[400]}
          />
          <Text style={[
            styles.requirementText,
            { color: /[A-Z]/.test(newPassword) ? '#4CAF50' : COLORS.gray[500] }
          ]}>
            {t('profile.oneUppercase')}
          </Text>
        </View>
        <View style={styles.requirementItem}>
          <Icon
            name={/[a-z]/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"}
            size={18}
            color={/[a-z]/.test(newPassword) ? '#4CAF50' : COLORS.gray[400]}
          />
          <Text style={[
            styles.requirementText,
            { color: /[a-z]/.test(newPassword) ? '#4CAF50' : COLORS.gray[500] }
          ]}>
            {t('profile.oneLowercase')}
          </Text>
        </View>
        <View style={styles.requirementItem}>
          <Icon
            name={/\d/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"}
            size={18}
            color={/\d/.test(newPassword) ? '#4CAF50' : COLORS.gray[400]}
          />
          <Text style={[
            styles.requirementText,
            { color: /\d/.test(newPassword) ? '#4CAF50' : COLORS.gray[500] }
          ]}>
            {t('profile.oneNumber')}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          {renderPasswordInput(
            t('profile.currentPassword'),
            currentPassword,
            setCurrentPassword,
            showCurrentPassword,
            () => setShowCurrentPassword(!showCurrentPassword),
            t('profile.enterCurrentPassword')
          )}

          {renderPasswordInput(
            t('profile.newPassword'),
            newPassword,
            setNewPassword,
            showNewPassword,
            () => setShowNewPassword(!showNewPassword),
            t('profile.enterNewPassword')
          )}

          {renderPasswordInput(
            t('profile.confirmNewPassword'),
            confirmPassword,
            setConfirmPassword,
            showConfirmPassword,
            () => setShowConfirmPassword(!showConfirmPassword),
            t('profile.confirmNewPasswordPlaceholder')
          )}

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.saveButtonText}>{t('profile.saveChanges')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {newPassword.length > 0 && renderPasswordRequirements()}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg * 2,
    marginBottom: SPACING.md,
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
  scrollContent: {
    padding: SPACING.lg,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.md,
    padding: SPACING.xl,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: -20,
    marginBottom: SPACING.lg,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
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
  saveButton: {
    backgroundColor: COLORS.error,
    borderRadius: 999,
    paddingVertical: SPACING.smmd,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  saveButtonText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  requirementsCard: {
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
  },
  requirementsTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  requirementsList: {
    gap: SPACING.sm,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requirementText: {
    fontSize: FONTS.sizes.md,
    marginLeft: SPACING.sm,
    fontWeight: '500',
  },
});

export default ChangePasswordScreen;
