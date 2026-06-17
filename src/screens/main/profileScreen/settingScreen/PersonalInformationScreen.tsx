import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  Image,
  Modal,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  MediaType,
  ImagePickerResponse,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from '../../../../components/Icon';
import { DeleteAccountModal } from '../../../../components';
import { COLORS, FONTS, SPACING } from '../../../../constants';
import { RootStackParamList } from '../../../../types';
import { useTranslation } from '../../../../hooks/useTranslation';
import { useAuth } from '../../../../context/AuthContext';
import {
  requestCameraPermission,
  requestPhotoLibraryPermission,
} from '../../../../utils/permissions';

type Nav = StackNavigationProp<RootStackParamList, 'PersonalInformation'>;

const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const GREEN = '#1FC16B';

/** Animated pill toggle matching the app's switch style. */
const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({
  value,
  onChange,
}) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.gray[300], COLORS.red],
  });
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => onChange(!value)}>
      <Animated.View style={[styles.toggleTrack, { backgroundColor }]}>
        <Animated.View style={[styles.toggleThumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </TouchableOpacity>
  );
};

type PersonalInformationScreenProps = {
  embedded?: boolean;
};

/** 개인 정보 - Personal Information (Account Data tab). */
const PersonalInformationScreen: React.FC<PersonalInformationScreenProps> = ({
  embedded = false,
}) => {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { user, logout, updateUser } = useAuth();
  // 아바타 업로드 상태. user.avatar 가 이미 있으면 그것을 초기값으로,
  // 사용자가 새로 선택하면 그 즉시 갱신해 화면에 미리보기로 반영한다.
  // 백엔드 업로드 endpoint 가 도입되면 setAvatarLocalUri 호출 직후
  // 그쪽으로 파일을 POST 하는 한 줄을 추가하면 된다.
  const [avatarLocalUri, setAvatarLocalUri] = useState<string | null>(
    typeof user?.avatar === 'string' && user.avatar.trim() !== '' ? user.avatar : null,
  );
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'account' | 'company'>('account');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Notification toggles (UI-only local state)
  const [updateNotice, setUpdateNotice] = useState(false);
  const [messageAlert, setMessageAlert] = useState(false);
  const [kakaoAlert, setKakaoAlert] = useState(false);
  const [shippingImport, setShippingImport] = useState(false);

  // Auto-deduction terms toggle
  const [autoDeduction, setAutoDeduction] = useState(true);

  const formatDate = (value?: string | Date): string => {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const dash = (value?: string | null): string =>
    value && String(value).trim() ? String(value) : '-';

  const formatMemberLevel = (level?: string | null): string => {
    const raw = level?.trim();
    if (!raw) return t('profile.personalInfoScreen.memberLevelGeneral');
    const normalized = raw.toLowerCase();
    if (normalized === 'general') return t('profile.personalInfoScreen.memberLevelGeneral');
    if (normalized === 'regular') return t('profile.personalInfoScreen.memberLevelRegular');
    return raw;
  };

  const handleDeleteAccount = async (_password: string) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      Alert.alert(
        t('profile.accountDeleted'),
        t('profile.accountDeletedMessage'),
        [
          {
            text: t('profile.ok'),
            onPress: async () => {
              await logout();
              navigation.navigate('Auth');
            },
          },
        ],
      );
    } catch {
      Alert.alert(t('common.error'), t('profile.failedToDeleteAccount'));
      throw new Error('delete_account_failed');
    }
  };

  // 아바타는 사용자 이름의 첫 글자를 붉은색 원형 배경 위에 흰색으로 표시.
  // 이름이 비어 있으면 이메일의 첫 글자, 그것도 없으면 '?' 로 fallback.
  // avatarLocalUri 가 채워지면(이미지 선택 직후 또는 user.avatar 가 이미 존재)
  // 첫 글자 대신 그 이미지를 보여준다.
  const avatarInitial = ((): string => {
    const raw = (user?.name || user?.email || '').trim();
    if (!raw) return '?';
    return raw.charAt(0).toUpperCase();
  })();

  // ─── 아바타 업로드 핸들러 ────────────────────────────────────────
  // EditProfileScreen 과 동일한 패턴 — 카메라 / 갤러리 두 옵션을 모달로
  // 보여주고 사용자가 선택하면 URI 를 state 에 반영. updateUser 로
  // AuthContext 의 user.avatar 도 즉시 갱신해 다른 화면도 새 이미지를 본다.
  const applyAvatar = async (uri: string) => {
    setAvatarLocalUri(uri);
    setAvatarPickerOpen(false);
    try {
      await updateUser({ avatar: uri } as any);
    } catch {
      // updateUser 가 실패해도 로컬 미리보기는 유지 — 백엔드 upload endpoint
      // 도입 전엔 어차피 서버 동기화가 의미 없음. 추후 endpoint 가 생기면
      // 여기 catch 에 toast 한 줄만 추가.
    }
  };

  // 아바타 삭제 — picker 모달의 [삭제] 단추에서 호출. 로컬 미리보기를
  // null 로 비우고 AuthContext 의 user.avatar 도 빈 문자열로 동기화한다.
  // 사용자 실수 방지를 위해 Alert 확인 한 단계를 거친다.
  const handleRemoveAvatar = () => {
    setAvatarPickerOpen(false);
    Alert.alert(
      t('profile.personalInfoScreen.removeAvatarConfirm') || '아바타를 삭제하시겠습니까?',
      undefined,
      [
        { text: t('profile.personalInfoScreen.cancel') || '취소', style: 'cancel' },
        {
          text: t('profile.personalInfoScreen.removeAvatar') || '삭제',
          style: 'destructive',
          onPress: async () => {
            setAvatarLocalUri(null);
            try {
              await updateUser({ avatar: '' } as any);
            } catch {
              // 백엔드 동기화 실패해도 로컬 상태는 이미 비워졌으므로 무시.
            }
          },
        },
      ],
    );
  };

  const handleTakePhoto = async () => {
    const granted = await requestCameraPermission();
    if (!granted) {
      setAvatarPickerOpen(false);
      Alert.alert(t('common.error'), t('profile.cameraPermissionRequired'));
      return;
    }
    const options: CameraOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.5,
      saveToPhotos: false,
    };
    launchCamera(options, async (response: ImagePickerResponse) => {
      if (response.didCancel) return setAvatarPickerOpen(false);
      if (response.errorCode) {
        setAvatarPickerOpen(false);
        Alert.alert(t('common.error'), response.errorMessage || t('profile.failedToTakePhoto'));
        return;
      }
      const uri = response.assets?.[0]?.uri;
      if (uri) await applyAvatar(uri);
      else setAvatarPickerOpen(false);
    });
  };

  const handleChooseFromGallery = async () => {
    const granted = await requestPhotoLibraryPermission();
    if (!granted) {
      setAvatarPickerOpen(false);
      Alert.alert(t('common.error'), t('profile.photoLibraryPermissionRequired'));
      return;
    }
    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.5,
      selectionLimit: 1,
    };
    launchImageLibrary(options, async (response: ImagePickerResponse) => {
      if (response.didCancel) return setAvatarPickerOpen(false);
      if (response.errorCode) {
        setAvatarPickerOpen(false);
        Alert.alert(t('common.error'), response.errorMessage || t('profile.failedToPickImage'));
        return;
      }
      const uri = response.assets?.[0]?.uri;
      if (uri) await applyAvatar(uri);
      else setAvatarPickerOpen(false);
    });
  };

  const basicRows: { label: string; value: string; strong?: boolean }[] = [
    { label: t('profile.personalInfoScreen.nickname'), value: dash(user?.name) },
    { label: t('profile.personalInfoScreen.loginAccount'), value: dash(user?.email) },
    { label: t('profile.personalInfoScreen.memberId'), value: dash(user?.memberId) },
    {
      label: t('profile.personalInfoScreen.uniqueId'),
      value: dash(user?.userUniqueNo || user?.userUniqueId),
    },
    { label: t('profile.personalInfoScreen.joinDate'), value: formatDate(user?.createdAt) },
    { label: t('profile.personalInfoScreen.userCode'), value: dash(user?.referralCode) },
    {
      label: t('profile.personalInfoScreen.businessAccount'),
      value: user?.isBusiness
        ? t('profile.personalInfoScreen.yes')
        : t('profile.personalInfoScreen.no'),
      strong: true,
    },
    {
      label: t('profile.personalInfoScreen.emailVerification'),
      value: user?.isEmailVerified
        ? t('profile.personalInfoScreen.yes')
        : t('profile.personalInfoScreen.no'),
      strong: true,
    },
    {
      label: t('profile.personalInfoScreen.memberLevel'),
      value: formatMemberLevel(user?.level),
    },
    { label: t('profile.personalInfoScreen.lastLogin'), value: formatDate(user?.lastLogin) },
  ];

  const renderSectionHeading = (title: string, desc: string) => (
    <View style={styles.sectionHeading}>
      <View style={styles.headingBar} />
      <View style={styles.headingTextWrap}>
        <Text style={styles.headingTitle}>{title}</Text>
        <Text style={styles.headingDesc}>{desc}</Text>
      </View>
    </View>
  );

  const renderCheckIcon = () => (
    <View style={styles.checkBadge}>
      <Icon name="checkmark" size={14} color={GREEN} />
    </View>
  );

  // A security row: green check, title + subtitle, and a trailing slot.
  const renderSecurityRow = (
    title: string,
    subtitle: React.ReactNode,
    trailing: React.ReactNode,
    isLast?: boolean,
  ) => (
    <View style={[styles.securityRow, !isLast && styles.securityRowBorder]}>
      {renderCheckIcon()}
      <View style={styles.securityInfo}>
        <Text style={styles.securityTitle}>{title}</Text>
        {typeof subtitle === 'string' ? (
          <Text style={styles.securitySubtitle}>{subtitle}</Text>
        ) : (
          subtitle
        )}
      </View>
      <View style={styles.securityTrailing}>{trailing}</View>
    </View>
  );

  const renderEditButton = (label: string) => (
    <TouchableOpacity style={styles.editButton} activeOpacity={0.7}>
      <Text style={styles.editButtonText}>{label}</Text>
    </TouchableOpacity>
  );

  const renderNotificationCard = (
    title: string,
    desc: string,
    value: boolean,
    onChange: (v: boolean) => void,
  ) => (
    <View style={styles.notificationCard}>
      <View style={styles.notificationTopRow}>
        <Text style={styles.notificationTitle}>{title}</Text>
        <Toggle value={value} onChange={onChange} />
      </View>
      <Text style={styles.notificationDesc}>{desc}</Text>
    </View>
  );

  const renderAccountTab = () => (
    <>
      {/* ===== 기본정보 ===== */}
      <View style={styles.card}>
        {renderSectionHeading(
          t('profile.personalInfoScreen.basicInfo'),
          t('profile.personalInfoScreen.basicInfoDesc'),
        )}

        {/* Avatar — 탭하면 카메라/갤러리 모달이 열려 이미지 업로드 가능.
            avatarLocalUri 가 있으면 그 이미지를, 없으면 이름 첫 글자(붉은 바탕 + 흰 글씨)를 표시. */}
        <View style={styles.avatarBox}>
          <TouchableOpacity
            style={styles.avatarRing}
            activeOpacity={0.85}
            onPress={() => setAvatarPickerOpen(true)}
          >
            {avatarLocalUri ? (
              <Image source={{ uri: avatarLocalUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarInitialBg]}>
                <Text style={styles.avatarInitialText}>{avatarInitial}</Text>
              </View>
            )}
            {/* 작은 카메라 배지 — 탭 가능함을 시각 단서로 */}
            <View style={styles.avatarCameraBadge}>
              <Icon name="camera-outline" size={14} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <View style={styles.verifiedPill}>
            <Icon name="checkmark" size={12} color={COLORS.white} />
            <Text style={styles.verifiedPillText}>
              {t('profile.personalInfoScreen.verifiedComplete')}
            </Text>
          </View>
        </View>

        {/* Info rows */}
        <View style={styles.infoList}>
          {basicRows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.infoRow,
                index < basicRows.length - 1 && styles.infoRowBorder,
              ]}
            >
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text
                style={[styles.infoValue, row.strong && styles.infoValueStrong]}
                numberOfLines={1}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ===== 계정보안 ===== */}
      <View style={styles.card}>
        {renderSectionHeading(
          t('profile.personalInfoScreen.accountSecurity'),
          t('profile.personalInfoScreen.accountSecurityDesc'),
        )}

        <View style={styles.securityList}>
          {renderSecurityRow(
            t('profile.personalInfoScreen.identityVerification'),
            t('profile.personalInfoScreen.verifiedComplete'),
            <View style={styles.statusPillGreen}>
              <Text style={styles.statusPillGreenText}>
                {t('profile.personalInfoScreen.verifiedComplete')}
              </Text>
            </View>,
          )}
          {renderSecurityRow(
            t('profile.personalInfoScreen.loginPassword'),
            '********',
            <View style={styles.securityTrailingRow}>
              <View style={styles.statusPillYellow}>
                <Text style={styles.statusPillYellowText}>
                  {t('profile.personalInfoScreen.passwordStrengthMedium')}
                </Text>
              </View>
              {renderEditButton(t('profile.personalInfoScreen.editPassword'))}
            </View>,
          )}
          {renderSecurityRow(
            t('profile.personalInfoScreen.phoneNumber'),
            dash(user?.phone),
            renderEditButton(t('profile.personalInfoScreen.edit')),
          )}
          {renderSecurityRow(
            t('profile.personalInfoScreen.emailAddress'),
            dash(user?.email),
            renderEditButton(t('profile.personalInfoScreen.edit')),
          )}
          {renderSecurityRow(
            t('profile.personalInfoScreen.paymentPassword'),
            '********',
            renderEditButton(t('profile.personalInfoScreen.editPassword')),
          )}
          {renderSecurityRow(
            t('profile.personalInfoScreen.withdrawalPassword'),
            '********',
            renderEditButton(t('profile.personalInfoScreen.editPassword')),
          )}
          {renderSecurityRow(
            t('profile.personalInfoScreen.autoDeduction'),
            <View style={styles.subtitleCheckRow}>
              <Icon name="checkmark" size={12} color={GREEN} />
              <Text style={styles.securitySubtitle}>
                {t('profile.personalInfoScreen.agreedAfterReading')}
              </Text>
            </View>,
            <View style={styles.securityTrailingRow}>
              <Text style={styles.serviceTermsText}>
                {t('profile.personalInfoScreen.serviceTerms')}
              </Text>
              <Toggle value={autoDeduction} onChange={setAutoDeduction} />
            </View>,
          )}
          {renderSecurityRow(
            t('profile.personalInfoScreen.kakaoPhone'),
            dash(user?.phone),
            renderEditButton(t('profile.personalInfoScreen.edit')),
            true,
          )}
        </View>
      </View>

      {/* ===== 알림 설정 ===== */}
      <View style={styles.card}>
        {renderSectionHeading(
          t('profile.personalInfoScreen.notificationSettings'),
          t('profile.personalInfoScreen.notificationSettingsDesc'),
        )}

        <View style={styles.notificationGrid}>
          {renderNotificationCard(
            t('profile.personalInfoScreen.updateNotice'),
            t('profile.personalInfoScreen.updateNoticeDesc'),
            updateNotice,
            setUpdateNotice,
          )}
          {renderNotificationCard(
            t('profile.personalInfoScreen.messageAlert'),
            t('profile.personalInfoScreen.messageAlertDesc'),
            messageAlert,
            setMessageAlert,
          )}
          {renderNotificationCard(
            t('profile.personalInfoScreen.kakaoAlert'),
            t('profile.personalInfoScreen.kakaoAlertDesc'),
            kakaoAlert,
            setKakaoAlert,
          )}
          {renderNotificationCard(
            t('profile.personalInfoScreen.shippingImport'),
            t('profile.personalInfoScreen.shippingImportDesc'),
            shippingImport,
            setShippingImport,
          )}
        </View>
      </View>

      {/* ===== Account Deletion ===== */}
      <View style={styles.card}>
        {renderSectionHeading(
          t('profile.personalInfoScreen.accountDeletion.title'),
          t('profile.personalInfoScreen.accountDeletion.sectionDescription'),
        )}
        <View style={styles.deletionWarningList}>
          <View style={styles.deletionWarningItem}>
            <Icon name="close-circle" size={16} color={COLORS.red} />
            <Text style={styles.deletionWarningText}>
              {t('profile.personalInfoScreen.accountDeletion.allDataLost')}
            </Text>
          </View>
          <View style={styles.deletionWarningItem}>
            <Icon name="close-circle" size={16} color={COLORS.red} />
            <Text style={styles.deletionWarningText}>
              {t('profile.personalInfoScreen.accountDeletion.orderHistoryDeleted')}
            </Text>
          </View>
          <View style={styles.deletionWarningItem}>
            <Icon name="close-circle" size={16} color={COLORS.red} />
            <Text style={styles.deletionWarningText}>
              {t('profile.personalInfoScreen.accountDeletion.cannotRecoverAccount')}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deletionButton}
          activeOpacity={0.8}
          onPress={() => setShowDeleteModal(true)}
        >
          <Text style={styles.deletionButtonText}>
            {t('profile.personalInfoScreen.accountDeletion.startButton')}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // A company info row: optional red required mark, label, and a value slot.
  const renderCompanyRow = (
    label: string,
    value: React.ReactNode,
    options?: { required?: boolean; isLast?: boolean },
  ) => (
    <View
      style={[styles.companyRow, !options?.isLast && styles.companyRowBorder]}
    >
      <Text style={styles.companyLabel}>
        {options?.required && <Text style={styles.requiredMark}>* </Text>}
        {label}
      </Text>
      <View style={styles.companyValueWrap}>
        {typeof value === 'string' ? (
          <Text style={styles.companyValue} numberOfLines={2}>
            {value || '--'}
          </Text>
        ) : (
          value
        )}
      </View>
    </View>
  );

  const renderValueWithLink = (value: string) => (
    <View style={styles.valueLinkRow}>
      <Text style={styles.companyValue} numberOfLines={1}>
        {value || '--'}
      </Text>
      <TouchableOpacity activeOpacity={0.7}>
        <Text style={styles.linkText}>
          {t('profile.personalInfoScreen.viewDetails')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCompanyTab = () => {
    const companyName = dash(user?.name);
    return (
      <>
        {/* ===== 기본정보 ===== */}
        <View style={styles.card}>
          {renderSectionHeading(
            t('profile.personalInfoScreen.companyBasicInfo'),
            t('profile.personalInfoScreen.companyBasicInfoDesc'),
          )}

          <View style={styles.infoList}>
            {renderCompanyRow(
              t('profile.personalInfoScreen.companyName'),
              <View style={styles.valueLinkRow}>
                <Text style={[styles.companyValue, styles.infoValueStrong]}>
                  {companyName}
                </Text>
                <View style={styles.statusPillGreen}>
                  <Icon name="checkmark" size={11} color={GREEN} />
                  <Text style={styles.statusPillGreenText}>
                    {t('profile.personalInfoScreen.verifiedComplete')}
                  </Text>
                </View>
              </View>,
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.businessType'),
              '--',
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.businessNumber'),
              '--',
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.representative'),
              '--',
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.representativePhone'),
              dash(user?.phone),
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.memberLevel'),
              <View style={styles.levelBadge}>
                <View style={styles.levelBadgeIcon}>
                  <Text style={styles.levelBadgeIconText}>R</Text>
                </View>
                <Text style={styles.levelBadgeText}>
                  {formatMemberLevel(user?.level)}
                </Text>
              </View>,
              { isLast: true },
            )}
          </View>
        </View>

        {/* ===== 추가 정보 ===== */}
        <View style={styles.card}>
          <View style={styles.sectionHeadingRow}>
            <View style={styles.sectionHeadingFlex}>
              {renderSectionHeading(
                t('profile.personalInfoScreen.companyAdditionalInfo'),
                t('profile.personalInfoScreen.companyAdditionalInfoDesc'),
              )}
            </View>
            <TouchableOpacity style={styles.editButton} activeOpacity={0.7}>
              <Icon name="create-outline" size={14} color={COLORS.gray[700]} />
              <Text style={styles.editButtonText}> {t('profile.personalInfoScreen.edit')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoList}>
            {renderCompanyRow(
              t('profile.personalInfoScreen.companyEmail'),
              dash(user?.email),
              { required: true },
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.importer'),
              renderValueWithLink(companyName),
              { required: true },
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.businessCategory'),
              '--',
              { required: true },
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.businessItem'),
              '--',
              { required: true },
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.companyAddress'),
              '--',
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.inquiryPhone'),
              renderValueWithLink('--'),
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.companyNameEn'),
              '--',
              { required: true },
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.companyAddressEn'),
              '--',
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.plusMembership'),
              <View style={styles.statusPillGray}>
                <Text style={styles.statusPillGrayText}>
                  {t('profile.personalInfoScreen.expired')}
                </Text>
              </View>,
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.customsNumber'),
              '--',
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.businessLicense'),
              '--',
            )}
            {renderCompanyRow(
              t('profile.personalInfoScreen.powerOfAttorney'),
              '--',
              { isLast: true },
            )}
          </View>
        </View>
      </>
    );
  };

  const body = (
    <View style={[styles.container, embedded && styles.embeddedContainer]}>
      {!embedded && (
        <View style={styles.header}>
          <TouchableOpacity
            hitSlop={BACK_HIT_SLOP}
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('profile.personalInfoScreen.title')}
          </Text>
          <View style={styles.backButton} />
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['account', 'company'] as const).map((tab) => {
          const active = activeTab === tab;
          const label =
            tab === 'account'
              ? t('profile.personalInfoScreen.tabAccount')
              : t('profile.personalInfoScreen.tabCompany');
          return (
            <TouchableOpacity
              key={tab}
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {label}
              </Text>
              {active && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'account' ? renderAccountTab() : renderCompanyTab()}
      </ScrollView>

      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
      />

      {/* 아바타 업로드 선택 모달 — 카메라 / 갤러리 / 삭제 / 취소 4개 옵션.
          삭제 단추는 사용자가 이미 아바타를 설정한 경우에만 노출된다. */}
      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
        visible={avatarPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.avatarPickerOverlay}
          activeOpacity={1}
          onPress={() => setAvatarPickerOpen(false)}
        >
          <View
            style={styles.avatarPickerSheet}
            onStartShouldSetResponder={() => true}
          >
            <TouchableOpacity
              style={styles.avatarPickerItem}
              activeOpacity={0.7}
              onPress={handleTakePhoto}
            >
              <Icon name="camera-outline" size={18} color={COLORS.text.primary} />
              <Text style={styles.avatarPickerItemText}>
                {t('profile.personalInfoScreen.takePhoto')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.avatarPickerItem, styles.avatarPickerItemBorder]}
              activeOpacity={0.7}
              onPress={handleChooseFromGallery}
            >
              <Icon name="image-outline" size={18} color={COLORS.text.primary} />
              <Text style={styles.avatarPickerItemText}>
                {t('profile.personalInfoScreen.chooseFromGallery')}
              </Text>
            </TouchableOpacity>
            {/* 취소 + 삭제 — 한 행에 나란히 배치. 삭제 단추는 아바타가
                실제로 설정돼 있을 때만 노출. */}
            <View
              style={[
                styles.avatarPickerFooterRow,
                styles.avatarPickerItemBorder,
              ]}
            >
              <TouchableOpacity
                style={[styles.avatarPickerFooterBtn, styles.avatarPickerCancel]}
                activeOpacity={0.7}
                onPress={() => setAvatarPickerOpen(false)}
              >
                <Text style={[styles.avatarPickerItemText, styles.avatarPickerCancelText]}>
                  {t('profile.personalInfoScreen.cancel')}
                </Text>
              </TouchableOpacity>
              {!!avatarLocalUri && (
                <TouchableOpacity
                  style={[
                    styles.avatarPickerFooterBtn,
                    styles.avatarPickerCancel,
                    styles.avatarPickerFooterDivider,
                  ]}
                  activeOpacity={0.7}
                  onPress={handleRemoveAvatar}
                >
                  <Text style={[styles.avatarPickerItemText, styles.avatarPickerRemoveText]}>
                    {t('profile.personalInfoScreen.removeAvatar')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );

  if (embedded) {
    return body;
  }

  return (
    <SafeAreaView style={styles.safeTop} edges={['top']}>
      {body}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // SafeAreaView 외곽 — 상단 인셋(status-bar 위 영역)을 흰색으로 칠한다.
  // 헤더와 같은 색이라 헤더 위쪽이 깔끔하게 이어진다.
  safeTop: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  // 본문 컨테이너 — 인셋 아래 부분은 기존처럼 회색 배경 유지.
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  embeddedContainer: {
    backgroundColor: COLORS.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.smmd,
  },
  tabText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.gray[500],
  },
  tabTextActive: {
    color: COLORS.red,
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: 48,
    borderRadius: 2,
    backgroundColor: COLORS.red,
  },
  // Scroll
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    padding: SPACING.md,
  },
  // Section heading
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  headingBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
    backgroundColor: COLORS.red,
    marginRight: SPACING.sm,
  },
  headingTextWrap: {
    flex: 1,
  },
  headingTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  headingDesc: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
    marginTop: 2,
  },
  // Avatar
  avatarBox: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.lightRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  // 아바타 자리에 이름의 첫 글자를 표시할 때 — 붉은색 원형 바탕.
  avatarInitialBg: {
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 흰색 굵은 첫 글자. 원 크기(92) 대비 약 40% 정도의 큰 글자.
  avatarInitialText: {
    color: COLORS.white,
    fontSize: 44,
    fontWeight: '700',
    lineHeight: 50,
  },
  // 아바타 우하단에 떠 있는 카메라 배지 — 탭 가능한 단서.
  avatarCameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.red,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 아바타 업로드 picker — 화면 하단에 떠오르는 시트.
  avatarPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  avatarPickerSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: SPACING.md,
  },
  avatarPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  avatarPickerItemBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  avatarPickerItemText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
  },
  avatarPickerCancel: {
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  avatarPickerCancelText: {
    color: COLORS.red,
    fontWeight: '600',
  },
  // 푸터 행 — 취소 / 삭제 단추 두 개를 가로로 나란히 배치.
  avatarPickerFooterRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  avatarPickerFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  // 취소·삭제 사이 vertical hairline 구분선.
  avatarPickerFooterDivider: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.gray[100],
  },
  // 삭제 단추 텍스트 — 같은 붉은 톤이지만 의미 분리를 위해 별도 키 사용.
  avatarPickerRemoveText: {
    color: COLORS.red,
    fontWeight: '700',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: -12,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: GREEN,
  },
  verifiedPillText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Info list
  infoList: {
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.smmd,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  infoLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    marginLeft: SPACING.md,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  infoValueStrong: {
    fontWeight: '700',
  },
  // Security list
  securityList: {},
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.smmd,
  },
  securityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#E6F9F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  securityInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  securityTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  securitySubtitle: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  subtitleCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  securityTrailing: {
    alignItems: 'flex-end',
  },
  securityTrailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  // Pills
  statusPillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GREEN,
    backgroundColor: '#E6F9F0',
  },
  statusPillGreenText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: GREEN,
  },
  statusPillYellow: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0B400',
    backgroundColor: '#FFF8E0',
  },
  statusPillYellowText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: '#B58900',
  },
  // Edit button
  editButton: {
    paddingHorizontal: SPACING.sm,
    height: 32,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[700],
    fontWeight: '600',
  },
  serviceTermsText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.red,
  },
  // Notification cards
  notificationGrid: {
    gap: SPACING.sm,
  },
  notificationCard: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 10,
    padding: SPACING.smmd,
  },
  notificationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  notificationDesc: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
    marginTop: SPACING.xs,
  },
  deletionWarningList: {
    backgroundColor: '#FFF0F1',
    borderRadius: 10,
    padding: SPACING.smmd,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    gap: SPACING.sm,
  },
  deletionWarningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  deletionWarningText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
  },
  deletionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.smmd,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.red,
    backgroundColor: COLORS.white,
  },
  deletionButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.red,
  },
  // Toggle
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  // Company tab
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  sectionHeadingFlex: {
    flex: 1,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: SPACING.smmd,
  },
  companyRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  companyLabel: {
    width: 110,
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
  },
  requiredMark: {
    color: COLORS.error,
  },
  companyValueWrap: {
    flex: 1,
    marginLeft: SPACING.md,
    alignItems: 'flex-end',
  },
  companyValue: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    textAlign: 'right',
  },
  valueLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexShrink: 1,
  },
  linkText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.red,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.text.primary,
  },
  levelBadgeIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeIconText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
  },
  levelBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.white,
  },
  statusPillGray: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.gray[100],
  },
  statusPillGrayText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
});

export default PersonalInformationScreen;
