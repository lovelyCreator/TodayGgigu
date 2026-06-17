import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from '../../../../components/Icon';
import { LinearGradient } from 'react-native-linear-gradient';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { BORDER_RADIUS, COLORS, FONTS, SPACING } from '../../../../constants';
import { RootStackParamList } from '../../../../types';
import { useAuth } from '../../../../context/AuthContext';
import { DeleteAccountModal } from '../../../../components';
import { InviteCodeBindingModal } from '../../../../components';
import { useAppSelector } from '../../../../store/hooks';
import { translations } from '../../../../i18n/translations';
import LogoutIcon from '../../../../assets/icons/LogoutIcon';
import { profileSettingsMenuStyles } from '../settingScreen/profileSettingsMenuStyles';
import { ProfileSettingsSectionShell } from '../settingScreen/ProfileSettingsSectionShell';
import ProductListMenuRow from '../settingScreen/productManagementScreen/ProductListMenuRow';
import CategoryMenuRow from '../settingScreen/productManagementScreen/CategoryMenuRow';
import UnitPriceSurveyMenuRow from '../settingScreen/marketSurveyScreen/UnitPriceSurveyMenuRow';
import OEMMenuRow from '../settingScreen/marketSurveyScreen/OEMMenuRow';
import PaymentMenuRow from '../settingScreen/accountCenterScreen/PaymentMenuRow';
import DepositMenuRow from '../settingScreen/accountCenterScreen/DepositMenuRow';
import PersonalSecurityMenuRow from '../settingScreen/accountCenterScreen/PersonalSecurityMenuRow';
import ProgressNotificationMenuRow from '../settingScreen/accountCenterScreen/ProgressNotificationMenuRow';
import DeliveryAddressMenuRow from '../settingScreen/accountCenterScreen/DeliveryAddressMenuRow';

type ProfileSettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ProfileSettings'>;

type ProfileSettingsScreenProps = {
  embedded?: boolean;
  onEmbeddedBack?: () => void;
};

const ProfileSettingsScreen: React.FC<ProfileSettingsScreenProps> = ({
  embedded = false,
  onEmbeddedBack,
}) => {
  const navigation = useNavigation<ProfileSettingsScreenNavigationProp>();

  const handleBack = () => {
    if (embedded && onEmbeddedBack) {
      onEmbeddedBack();
      return;
    }
    navigation.goBack();
  };
  const { user, logout, isAuthenticated, updateUser } = useAuth();
  const locale = useAppSelector((state) => state.i18n.locale) as string;
  const normalizedLocale: 'en' | 'ko' | 'zh' =
    locale === 'kr' ? 'ko' : (locale === 'en' || locale === 'ko' || locale === 'zh' ? locale : 'ko');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false);
  
  // Translation function
  const t = (key: string, params?: { [key: string]: string }) => {
    const keys = key.split('.');
    const resolve = (localeKey: 'en' | 'ko' | 'zh') => {
      let current: any = translations[localeKey];
      for (const k of keys) {
        current = current?.[k];
      }
      return current;
    };

    // 1) current locale, 2) Korean fallback, 3) English fallback
    let value: any = resolve(normalizedLocale);
    if (value == null) value = resolve('ko');
    if (value == null) value = resolve('en');

    if (params && typeof value === 'string') {
      Object.keys(params).forEach(paramKey => {
        value = value.replace(`{${paramKey}}`, params[paramKey]);
      });
    }
    return value || key;
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Reset navigation stack and navigate to Home tab
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'Main',
              state: {
                routes: [{ name: 'Home' }],
                index: 0,
              },
            },
          ],
        })
      );
    } catch (error) {
      // console.error('Logout error:', error);
    }
  };

  const showComingSoon = (feature: string) => {
    // console.log(`${feature} feature coming soon`);
  };

  const handleDeleteAccount = async (password: string) => {
    try {
      // TODO: Implement actual API call to delete account with password verification
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        t('profile.accountDeleted'),
        t('profile.accountDeletedMessage'),
        [
          {
            text: t('profile.ok'),
            onPress: async () => {
              await logout();
              navigation.navigate('Auth');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.failedToDeleteAccount'));
      throw error;
    }
  };

  const handleBindInviteCode = async (inviteCode: string) => {
    try {
      // TODO: Implement actual API call to bind invite code
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        t('shareApp.success'),
        t('profile.inviteCodeBound', { inviteCode }),
        [{ text: t('profile.ok') }]
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.failedToBindCode'));
      throw error;
    }
  };

  const renderHeader = () => (
    // <LinearGradient
    //   colors={['#FFE4E6', '#FFF0F1', '#FFFFFF']}
    <View
      style={styles.header}
    >
      <TouchableOpacity 
        style={styles.backButton}
        onPress={handleBack}
      >
        <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('profile.settings')}</Text>
      <View style={styles.placeholder} />
    {/* </LinearGradient> */}
    </View>
  );

  const renderUserSection = () => (
    <View style={styles.userSection}>
      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          <Image
            source={
              user?.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== ''
                ? { uri: user.avatar } 
                : require('../../../../assets/images/avatar.png')
            }
            style={styles.avatar}
          />
          <View style={styles.avatarBorder} />
        </View>
        {isAuthenticated && user?.name && (
          <Text style={styles.userName}>{user.name}</Text>
        )}
      </View>
    </View>
  );

  const renderMenuItems = () => {
    const sectionProps = { t, navigation, showComingSoon };
    return (
      <View style={profileSettingsMenuStyles.menuContainer}>
        <ProfileSettingsSectionShell title={t('profile.productManagement')}>
          <ProductListMenuRow {...sectionProps} isFirst />
          <CategoryMenuRow {...sectionProps} isLast />
        </ProfileSettingsSectionShell>
        <ProfileSettingsSectionShell title={t('profile.marketSurvey')}>
          <UnitPriceSurveyMenuRow {...sectionProps} isFirst />
          <OEMMenuRow {...sectionProps} isLast />
        </ProfileSettingsSectionShell>
        <ProfileSettingsSectionShell title={t('profile.accountCenter')}>
          <PaymentMenuRow {...sectionProps} isFirst />
          <DepositMenuRow {...sectionProps} />
          <PersonalSecurityMenuRow {...sectionProps} />
          <ProgressNotificationMenuRow {...sectionProps} />
          <DeliveryAddressMenuRow {...sectionProps} isLast />
        </ProfileSettingsSectionShell>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* {renderUserSection()} */}
        {renderMenuItems()}
        
        {isAuthenticated && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            {/* <View style={styles.logoutIconContainer}>
              <LogoutIcon width={20} height={20} color={COLORS.error} />
            </View> */}
            <Text style={styles.logoutText}>{t('profile.logOut')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
      />

      <InviteCodeBindingModal
        visible={showInviteCodeModal}
        onClose={() => setShowInviteCodeModal(false)}
        onSubmit={handleBindInviteCode}
      />
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
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 24,
    borderRadius: 20,
    // backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'flex-start',
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
    backgroundColor: COLORS.background,
  },
  userSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    marginTop: -20,
  },
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.md,
    padding: SPACING.xl,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.gray[200],
  },
  avatarBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 3,
    borderColor: '#FF9A9E',
  },
  userName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.sm,
    marginBottom: 100,
    paddingVertical: SPACING.smmd,
    borderRadius: BORDER_RADIUS.md,
    // shadowColor: COLORS.shadow,
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 8,
    // elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutIconContainer: {
    marginRight: SPACING.md,
  },
  logoutText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
});

export default ProfileSettingsScreen;
