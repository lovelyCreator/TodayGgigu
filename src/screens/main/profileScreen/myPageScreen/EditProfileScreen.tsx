import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput as RNTextInput, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, Image, Modal, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { launchCamera, launchImageLibrary, MediaType, ImagePickerResponse, CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';
import Icon from '../../../../components/Icon';
import ImagePickerModal from '../../../../components/ImagePickerModal';
import DatePickerModal from '../../../../components/DatePickerModal';
import { COLORS, FONTS, SPACING } from '../../../../constants';
import { RootStackParamList } from '../../../../types';
import { useAuth } from '../../../../context/AuthContext';
import { useAppSelector } from '../../../../store/hooks';
import { translations } from '../../../../i18n/translations';
import { requestCameraPermission, requestPhotoLibraryPermission } from '../../../../utils/permissions';
import { changePassword, confirmEmailUpdate, getProfile, requestEmailUpdate, updateProfile } from '../../../../services/authApi';
import AccountIcon from '../../../../assets/icons/AccountIcon';

type EditProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditProfile'>;
type GenderValue = '' | 'male' | 'female';
type EmailStep = 'request' | 'confirm';

interface ProfileFormData {
  memberId: string;
  memberName: string;
  email: string;
  phone: string;
  gender: GenderValue | string;
  birthday: string;
}

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const { user, updateUser } = useAuth();
  const locale = useAppSelector((state) => state.i18n.locale) as 'en' | 'ko' | 'zh';
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) value = value?.[k];
    return value || key;
  };

  const [formData, setFormData] = useState<ProfileFormData>({
    memberId: user?.memberId || user?.userUniqueId || '',
    memberName: user?.userName || user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    birthday: user?.birthday || '',
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(typeof user?.avatar === 'string' ? user.avatar : null);
  const [selectedPictureUri, setSelectedPictureUri] = useState<string | null>(null);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailStep, setEmailStep] = useState<EmailStep>('request');
  const [requestingEmail, setRequestingEmail] = useState(false);
  const [confirmingEmail, setConfirmingEmail] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(true);
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);

  const genderOptions = useMemo(() => [
    { value: 'male', label: t('profile.male'), icon: 'male-outline' },
    { value: 'female', label: t('profile.female'), icon: 'female-outline' },
    // { value: 'other', label: t('profile.other'), icon: 'person-outline' },
  ], [locale]);

  const mapProfileToForm = (profileUser: any): ProfileFormData => ({
    memberId: profileUser?.userUniqueId || profileUser?.user_id || '',
    memberName: profileUser?.userName || profileUser?.user_id || '',
    email: profileUser?.email || '',
    phone: profileUser?.phone || '',
    gender: profileUser?.gender || '',
    birthday: profileUser?.birthday || '',
  });

  const syncLocalUser = async (profileUser: any, overrides?: Partial<ProfileFormData>) => {
    const nextForm = { ...mapProfileToForm(profileUser), ...(overrides || {}) };
    setFormData(nextForm);
    setProfileImageUri(profileUser?.pictureUrl || selectedPictureUri || profileImageUri || null);
    await updateUser({
      memberId: nextForm.memberId,
      name: nextForm.memberName,
      userName: nextForm.memberName,
      email: nextForm.email,
      phone: nextForm.phone,
      gender: nextForm.gender,
      birthday: nextForm.birthday,
      avatar: profileUser?.pictureUrl || selectedPictureUri || profileImageUri || undefined,
      userUniqueId: profileUser?.userUniqueId || user?.userUniqueId,
    });
  };

  const refreshProfile = async () => {
    setLoadingProfile(true);
    try {
      const response = await getProfile();
      if (response.success && response.data?.user) {
        setSelectedPictureUri(null);
        await syncLocalUser(response.data.user);
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => { refreshProfile(); }, []);

  const maskMemberId = (value: string) => !value ? '-' : value.length <= 4 ? value : `${value.slice(0, 2)}${'*'.repeat(Math.max(2, value.length - 4))}${value.slice(-2)}`;
  const formatBirthday = (value: string) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString().split('T')[0];
  };
  const getBirthdayDate = () => {
    const parsed = formData.birthday ? new Date(formData.birthday) : new Date(2000, 0, 1);
    return Number.isNaN(parsed.getTime()) ? new Date(2000, 0, 1) : parsed;
  };
  const handleFieldChange = (key: keyof ProfileFormData, value: string) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleImageSelected = async (uri: string) => {
    setSelectedPictureUri(uri);
    setProfileImageUri(uri);
    setShowImagePicker(false);
  };
  const handleTakePhoto = async () => {
    const granted = await requestCameraPermission();
    if (!granted) return Alert.alert(t('common.error'), t('profile.cameraPermissionRequired'));
    const options: CameraOptions = { mediaType: 'photo' as MediaType, quality: 0.5, saveToPhotos: false };
    launchCamera(options, async (response: ImagePickerResponse) => {
      if (response.didCancel) return setShowImagePicker(false);
      if (response.errorCode) {
        Alert.alert(t('common.error'), response.errorMessage || t('profile.failedToTakePhoto'));
        return setShowImagePicker(false);
      }
      const uri = response.assets?.[0]?.uri;
      if (uri) await handleImageSelected(uri); else setShowImagePicker(false);
    });
  };
  const handleChooseFromGallery = async () => {
    const granted = await requestPhotoLibraryPermission();
    if (!granted) return Alert.alert(t('common.error'), t('profile.photoLibraryPermissionRequired'));
    const options: ImageLibraryOptions = { mediaType: 'photo' as MediaType, quality: 0.5, selectionLimit: 1 };
    launchImageLibrary(options, async (response: ImagePickerResponse) => {
      if (response.didCancel) return setShowImagePicker(false);
      if (response.errorCode) {
        Alert.alert(t('common.error'), response.errorMessage || t('profile.failedToPickImage'));
        return setShowImagePicker(false);
      }
      const uri = response.assets?.[0]?.uri;
      if (uri) await handleImageSelected(uri); else setShowImagePicker(false);
    });
  };

  const handleSaveProfile = async () => {
    if (!formData.memberName.trim()) return Alert.alert(t('common.error'), t('profile.enterMemberName'));
    setSavingProfile(true);
    try {
      const response = await updateProfile({
        userName: formData.memberName.trim(),
        gender: formData.gender || undefined,
        birthday: formData.birthday || undefined,
        picture: selectedPictureUri || undefined,
      });
      if (!response.success || !response.data?.user) return Alert.alert(t('common.error'), response.error || t('profile.failedToUpdateProfile'));
      setSelectedPictureUri(null);
      await syncLocalUser(response.data.user, { memberName: response.data.user.userName || formData.memberName.trim() });
      Alert.alert(t('shareApp.success'), response.message || t('profile.profileUpdated'));
    } finally {
      setSavingProfile(false);
    }
  };

  const openEmailModal = () => {
    setNewEmail(formData.email);
    setEmailCode('');
    setEmailStep('request');
    setEmailModalVisible(true);
  };
  const handleRequestEmail = async () => {
    if (!newEmail.trim()) return Alert.alert(t('common.error'), t('profile.emailRequired'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) return Alert.alert(t('common.error'), t('profile.validEmailRequired'));
    setRequestingEmail(true);
    try {
      const response = await requestEmailUpdate(newEmail.trim());
      if (!response.success) return Alert.alert(t('common.error'), response.error || 'Failed to request email update');
      setEmailStep('confirm');
      Alert.alert(t('shareApp.success'), response.message || t('profile.verificationCodeSent'));
    } finally {
      setRequestingEmail(false);
    }
  };
  const handleConfirmEmail = async () => {
    if (!emailCode.trim()) return Alert.alert(t('common.error'), t('auth.enterOtp'));
    setConfirmingEmail(true);
    try {
      const response = await confirmEmailUpdate(emailCode.trim());
      if (!response.success || !response.data?.user) return Alert.alert(t('common.error'), response.error || 'Failed to confirm email update');
      await syncLocalUser(response.data.user, { email: response.data.user.email || newEmail.trim() });
      setEmailModalVisible(false);
      setEmailStep('request');
      setNewEmail('');
      setEmailCode('');
      Alert.alert(t('shareApp.success'), response.message || t('profile.emailVerified'));
    } finally {
      setConfirmingEmail(false);
    }
  };

  const openPhoneModal = () => {
    setPhoneDraft(formData.phone);
    setPhoneModalVisible(true);
  };
  const handleSavePhone = async () => {
    if (!phoneDraft.trim()) return Alert.alert(t('common.error'), t('auth.enterPhoneNumber'));
    setSavingPhone(true);
    try {
      const response = await updateProfile({ phone: phoneDraft.trim() });
      if (!response.success || !response.data?.user) return Alert.alert(t('common.error'), response.error || t('profile.failedToUpdateProfile'));
      await syncLocalUser(response.data.user, { phone: response.data.user.phone || phoneDraft.trim() });
      setPhoneModalVisible(false);
      Alert.alert(t('shareApp.success'), response.message || t('profile.profileUpdated'));
    } finally {
      setSavingPhone(false);
    }
  };

  const resetPasswordState = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(true);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
  };
  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return Alert.alert(t('profile.missingInformation'), t('profile.fillAllFields'));
    if (newPassword !== confirmPassword) return Alert.alert(t('profile.passwordMismatch'), t('profile.passwordsDoNotMatch'));
    if (newPassword.length < 8) return Alert.alert(t('profile.weakPassword'), t('profile.passwordMinLength'));
    if (currentPassword === newPassword) return Alert.alert(t('profile.samePassword'), t('profile.passwordMustBeDifferent'));
    setChangingPassword(true);
    try {
      const response = await changePassword(currentPassword, newPassword);
      if (!response.success) return Alert.alert(t('common.error'), response.error || 'Failed to change password');
      setPasswordModalVisible(false);
      resetPasswordState();
      Alert.alert(t('shareApp.success'), response.message || t('profile.passwordChanged'));
    } finally {
      setChangingPassword(false);
    }
  };

  const renderPasswordInput = (label: string, value: string, onChangeText: (text: string) => void, secure: boolean, onToggle: () => void, placeholder: string = '') => (
    <View style={styles.modalInputGroup}>
      <Text style={styles.modalLabel}>{label}</Text>
      <View style={styles.passwordWrapper}>
        <RNTextInput style={styles.passwordInput} value={value} onChangeText={onChangeText} secureTextEntry={secure} autoCapitalize="none" autoCorrect={false} placeholder={placeholder} placeholderTextColor={COLORS.text.secondary} />
        <TouchableOpacity onPress={onToggle} style={styles.eyeButton}>
          <Icon name={secure ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.gray[500]} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.editProfileTitle')}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>{t('profile.loadingProfile')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={16} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.editProfileTitle')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarContainer}>
            <Image source={profileImageUri ? { uri: profileImageUri } : require('../../../../assets/images/avatar.png')} style={styles.avatar} />
            <View style={styles.avatarRing} />
            <TouchableOpacity style={styles.cameraButton} onPress={() => setShowImagePicker(true)} disabled={savingProfile}>
              <Icon name="camera" size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setShowImagePicker(true)} disabled={savingProfile}>
            <Text style={styles.changePictureText}>{t('profile.changePicture')}</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AccountIcon width={20} color="#FF6B00" />
            <Text style={styles.cardHeaderTitle}>{t('profile.personalInfo')}</Text>
          </View>

          {/* Member ID */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('profile.memberId')}</Text>
            <View style={[styles.fieldInput, styles.readOnlyField]}>
              {/* <Icon name="id-card-outline" size={18} color={COLORS.gray[400]} /> */}
              <Text style={styles.readOnlyText}>{maskMemberId(formData.memberId)}</Text>
            </View>
          </View>

          {/* Member Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('profile.memberName')}</Text>
            <View style={styles.fieldInput}>
              {/* <Icon name="person-outline" size={18} color={COLORS.gray[400]} /> */}
              <RNTextInput
                style={styles.textInput}
                value={formData.memberName}
                onChangeText={(text) => handleFieldChange('memberName', text)}
                placeholder={t('profile.enterMemberName')}
                placeholderTextColor={COLORS.text.secondary}
              />
            </View>
          </View>

          {/* Gender */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('profile.gender')}</Text>
            <View style={styles.genderRow}>
              {genderOptions.map((option) => {
                const selected = formData.gender === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.genderChip, selected && styles.genderChipSelected]}
                    onPress={() => handleFieldChange('gender', option.value)}
                  >
                    {/* <Icon name={option.icon} size={16} color={selected ? '#FF6B00' : COLORS.gray[500]} /> */}
                    <Text style={[styles.genderText, selected && styles.genderTextSelected]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Birthday */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('profile.birthday')}</Text>
            <TouchableOpacity style={styles.fieldInput} onPress={() => setShowBirthdayPicker(true)}>
              <Icon name="calendar-outline" size={18} color={COLORS.gray[400]} />
              <Text style={formData.birthday ? styles.textInputText : styles.placeholderText}>
                {formData.birthday ? formatBirthday(formData.birthday) : t('profile.selectBirthday')}
              </Text>
              <Icon name="chevron-down" size={16} color={COLORS.gray[400]} />
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, savingProfile && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                {/* <Icon name="checkmark-circle-outline" size={18} color={COLORS.white} /> */}
                <Text style={styles.saveButtonText}>{t('profile.saveChanges')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Contact & Security Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="shield-checkmark-outline" size={20} color="#FF6B00" />
            <Text style={styles.cardHeaderTitle}>{t('profile.contactAndSecurity')}</Text>
          </View>

          {/* Email */}
          <TouchableOpacity style={styles.securityRow} onPress={openEmailModal}>
            {/* <View style={styles.securityIconBox}>
              <Icon name="mail-outline" size={20} color="#FF6B00" />
            </View> */}
            <View style={styles.securityInfo}>
              <Text style={styles.securityLabel}>{t('auth.email')}</Text>
              <Text style={styles.securityValue}>{formData.email || '-'}</Text>
            </View>
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>{t('profile.edit')}</Text>
            </View>
          </TouchableOpacity>

          {/* Phone */}
          <TouchableOpacity style={styles.securityRow} onPress={openPhoneModal}>
            {/* <View style={styles.securityIconBox}>
              <Icon name="call-outline" size={20} color="#FF6B00" />
            </View> */}
            <View style={styles.securityInfo}>
              <Text style={styles.securityLabel}>{t('auth.phoneNumber')}</Text>
              <Text style={styles.securityValue}>{formData.phone || '-'}</Text>
            </View>
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>{t('profile.edit')}</Text>
            </View>
          </TouchableOpacity>

          {/* Password */}
          <TouchableOpacity style={[styles.securityRow, { borderBottomWidth: 0 }]} onPress={() => setPasswordModalVisible(true)}>
            {/* <View style={styles.securityIconBox}>
              <Icon name="lock-closed-outline" size={20} color="#FF6B00" />
            </View> */}
            <View style={styles.securityInfo}>
              <Text style={styles.securityLabel}>{t('profile.password')}</Text>
              <Text style={styles.securityValue}>••••••••</Text>
            </View>
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>{t('profile.edit')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <ImagePickerModal visible={showImagePicker} onClose={() => setShowImagePicker(false)} onTakePhoto={handleTakePhoto} onChooseFromGallery={handleChooseFromGallery} />
      <DatePickerModal visible={showBirthdayPicker} onClose={() => setShowBirthdayPicker(false)} onConfirm={(date) => handleFieldChange('birthday', date.toISOString())} initialDate={getBirthdayDate()} title={t('profile.birthday')} />

      {/* Email Modal */}
      <Modal visible={emailModalVisible} transparent animationType="fade" onRequestClose={() => setEmailModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEmailModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBox}>
                  <Icon name="mail-outline" size={20} color="#FF6B00" />
                </View>
                <Text style={styles.modalTitle}>{t('profile.changeEmail')}</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setEmailModalVisible(false)}>
                <Icon name="close" size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>{t('auth.email')}</Text>
              <View style={styles.modalInputWrapper}>
                <Icon name="mail-outline" size={18} color={COLORS.gray[400]} />
                <RNTextInput style={styles.modalInput} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" placeholder={t('profile.enterEmail')} placeholderTextColor={COLORS.text.secondary} />
              </View>
            </View>
            {emailStep === 'confirm' && (
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>{t('profile.emailVerificationCode')}</Text>
                <View style={styles.modalInputWrapper}>
                  <Icon name="keypad-outline" size={18} color={COLORS.gray[400]} />
                  <RNTextInput style={styles.modalInput} value={emailCode} onChangeText={setEmailCode} keyboardType="number-pad" placeholder={t('auth.enterOtp')} placeholderTextColor={COLORS.text.secondary} />
                </View>
              </View>
            )}
            {emailStep === 'request' ? (
              <TouchableOpacity style={styles.modalActionButton} onPress={handleRequestEmail} disabled={requestingEmail}>
                {requestingEmail ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.modalActionText}>{t('profile.getCode')}</Text>}
              </TouchableOpacity>
            ) : (
              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={styles.modalSecondaryButton} onPress={handleRequestEmail} disabled={requestingEmail}>
                  {requestingEmail ? <ActivityIndicator size="small" color={COLORS.text.primary} /> : <Text style={styles.modalSecondaryText}>{t('profile.resendCode')}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalHalfPrimary} onPress={handleConfirmEmail} disabled={confirmingEmail}>
                  {confirmingEmail ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.modalActionText}>{t('profile.confirm')}</Text>}
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Phone Modal */}
      <Modal visible={phoneModalVisible} transparent animationType="fade" onRequestClose={() => setPhoneModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPhoneModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBox}>
                  <Icon name="call-outline" size={20} color="#FF6B00" />
                </View>
                <Text style={styles.modalTitle}>{t('profile.changePhoneNumber')}</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPhoneModalVisible(false)}>
                <Icon name="close" size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>{t('auth.phoneNumber')}</Text>
              <View style={styles.modalInputWrapper}>
                <Icon name="call-outline" size={18} color={COLORS.gray[400]} />
                <RNTextInput style={styles.modalInput} value={phoneDraft} onChangeText={setPhoneDraft} keyboardType="phone-pad" placeholder={t('auth.enterPhoneNumber')} placeholderTextColor={COLORS.text.secondary} />
              </View>
            </View>
            <TouchableOpacity style={styles.modalActionButton} onPress={handleSavePhone} disabled={savingPhone}>
              {savingPhone ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.modalActionText}>{t('profile.saveChanges')}</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Password Modal */}
      <Modal visible={passwordModalVisible} transparent animationType="fade" onRequestClose={() => setPasswordModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => { setPasswordModalVisible(false); resetPasswordState(); }}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBox}>
                  <Icon name="lock-closed-outline" size={20} color="#FF6B00" />
                </View>
                <Text style={styles.modalTitle}>{t('profile.changePassword')}</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { setPasswordModalVisible(false); resetPasswordState(); }}>
                <Icon name="close" size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>
            {renderPasswordInput(t('profile.currentPassword'), currentPassword, setCurrentPassword, showCurrentPassword, () => setShowCurrentPassword((prev) => !prev), t('profile.enterCurrentPassword'))}
            {renderPasswordInput(t('profile.newPassword'), newPassword, setNewPassword, showNewPassword, () => setShowNewPassword((prev) => !prev), t('profile.enterNewPassword'))}
            {renderPasswordInput(t('profile.confirmNewPassword'), confirmPassword, setConfirmPassword, showConfirmPassword, () => setShowConfirmPassword((prev) => !prev), t('profile.confirmNewPasswordPlaceholder'))}
            <TouchableOpacity style={styles.modalActionButton} onPress={handleSavePassword} disabled={changingPassword}>
              {changingPassword ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.modalActionText}>{t('profile.saveChanges')}</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingTop: SPACING['2xl'],
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 24,
    height: 24,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING['3xl'],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.base,
    color: COLORS.text.secondary,
  },

  // Avatar Card
  avatarCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.gray[200],
  },
  avatarRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    width: 102,
    height: 102,
    borderRadius: 51,
    borderWidth: 2.5,
    borderColor: '#FFD4A8',
  },
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.white,
  },
  changePictureText: {
    fontSize: FONTS.sizes.sm,
    color: '#FF6B00',
    fontWeight: '600',
  },

  // Cards
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  cardHeaderTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },

  // Form Fields
  fieldGroup: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 6,
  },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
    gap: 10,
  },
  readOnlyField: {
    backgroundColor: COLORS.gray[100],
  },
  textInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    paddingVertical: SPACING.sm,
  },
  textInputText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
  },
  readOnlyText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
  },
  placeholderText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
  },
  genderRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  genderChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.gray[50],
  },
  genderChipSelected: {
    backgroundColor: '#FFF5ED',
    borderColor: '#FF6B00',
  },
  genderText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  genderTextSelected: {
    color: '#FF6B00',
  },

  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: SPACING.sm,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    fontWeight: '700',
  },

  // Security Rows
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    gap: 12,
  },
  securityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF5ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityInfo: {
    flex: 1,
  },
  securityLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  securityValue: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  editBadge: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBadgeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '700',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF5ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInputGroup: {
    marginBottom: SPACING.md,
  },
  modalLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: SPACING.md,
    gap: 10,
  },
  modalInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    paddingVertical: SPACING.md,
  },
  modalActionButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  modalActionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    fontWeight: '700',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  modalSecondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  modalHalfPrimary: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: SPACING.md,
  },
  passwordInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    paddingVertical: SPACING.md,
  },
  eyeButton: {
    padding: 4,
  },
});

export default EditProfileScreen;
