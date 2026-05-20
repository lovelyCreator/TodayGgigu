import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from '../../../../components/Icon';
import { COLORS, FONTS, SPACING } from '../../../../constants';
import { RootStackParamList } from '../../../../types';
import { useTranslation } from '../../../../hooks/useTranslation';
import { useAuth } from '../../../../context/AuthContext';

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

/** 개인 정보 - Personal Information (Account Data tab). */
const PersonalInformationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'account' | 'company'>('account');

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

  const avatarSource =
    user?.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== ''
      ? { uri: user.avatar }
      : require('../../../../assets/images/avatar.png');

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
      value: dash(user?.level) || 'general',
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

        {/* Avatar */}
        <View style={styles.avatarBox}>
          <View style={styles.avatarRing}>
            <Image source={avatarSource} style={styles.avatar} />
          </View>
          <View style={styles.verifiedPill}>
            <Icon name="checkmark" size={12} color={COLORS.white} />
            <Text style={styles.verifiedPillText}>
              {t('profile.personalInfoScreen.verified')}
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
            t('profile.personalInfoScreen.verified') + '됨',
            <View style={styles.statusPillGreen}>
              <Text style={styles.statusPillGreenText}>
                {t('profile.personalInfoScreen.verified')}됨
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
                    {t('profile.personalInfoScreen.verified')}
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
                  {(dash(user?.level) || 'REGULAR').toUpperCase()}
                </Text>
              </View>,
              { isLast: true },
            )}
          </View>
        </View>

        {/* ===== 추가 정보 ===== */}
        <View style={styles.card}>
          <View style={styles.sectionHeadingRow}>
            {renderSectionHeading(
              t('profile.personalInfoScreen.companyAdditionalInfo'),
              t('profile.personalInfoScreen.companyAdditionalInfoDesc'),
            )}
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
