import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from '../../../components/Icon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../constants';
import { RootStackParamList } from '../../../types';
import { useResponsive } from '../../../hooks/useResponsive';

export type ProfileSidebarActiveKey =
  | 'main'
  | 'cart'
  | 'productList'
  | 'category'
  | 'wishlist'
  | 'myActivity'
  | 'myOrders'
  | 'purchase_agency'
  | 'rocket_3pl'
  | 'vvic_hipass'
  | 'shipping_agency'
  | 'unitSurvey'
  | 'oemSurvey'
  | 'paymentHistory'
  | 'deposit'
  | 'personalSecurity'
  | 'progressNotification'
  | 'deliveryAddress';

type Nav = StackNavigationProp<RootStackParamList>;

type SidebarItem = {
  key: ProfileSidebarActiveKey;
  labelKey: string;
  onPress: () => void;
};

type AccordionSection = {
  key: string;
  titleKey: string;
  items: SidebarItem[];
};

type ProfileTabletSidebarProps = {
  activeKey: ProfileSidebarActiveKey;
  onActiveKeyChange?: (key: ProfileSidebarActiveKey) => void;
  t: (key: string) => string;
};

export const ProfileTabletSidebar: React.FC<ProfileTabletSidebarProps> = ({
  activeKey,
  onActiveKeyChange,
  t,
}) => {
  const navigation = useNavigation<Nav>();
  const responsive = useResponsive();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    productManagement: false,
    purchaseManagement: false,
    marketSurvey: false,
    accountCenter: false,
  });

  const sidebarWidth = Math.min(
    280,
    Math.max(200, Math.round(responsive.width * 0.22)),
  );

  const accordionSections: AccordionSection[] = useMemo(
    () => [
      {
        key: 'productManagement',
        titleKey: 'profile.productManagement',
        items: [
          {
            key: 'cart',
            labelKey: 'buyList.cart',
            onPress: () => {
              onActiveKeyChange?.('cart');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
          {
            key: 'productList',
            labelKey: 'profile.productList',
            onPress: () => {
              onActiveKeyChange?.('productList');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
          {
            key: 'category',
            labelKey: 'profile.category',
            onPress: () => {
              onActiveKeyChange?.('category');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
          {
            key: 'wishlist',
            labelKey: 'profile.wishlist',
            onPress: () => {
              onActiveKeyChange?.('wishlist');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
          {
            key: 'myActivity',
            labelKey: 'profile.myActivity',
            onPress: () => {
              onActiveKeyChange?.('myActivity');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
        ],
      },
      {
        key: 'purchaseManagement',
        titleKey: 'buyList.purchaseManagement',
        items: [
          {
            key: 'myOrders',
            labelKey: 'home.guestQuickOrders',
            onPress: () => {
              onActiveKeyChange?.('myOrders');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
          {
            key: 'purchase_agency',
            labelKey: 'profile.tabPurchaseAgency',
            onPress: () => {
              onActiveKeyChange?.('purchase_agency');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
          {
            key: 'rocket_3pl',
            labelKey: 'profile.tabRocket3pl',
            onPress: () => {
              onActiveKeyChange?.('rocket_3pl');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
          {
            key: 'vvic_hipass',
            labelKey: 'profile.tabVvicHipass',
            onPress: () => {
              onActiveKeyChange?.('vvic_hipass');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
          {
            key: 'shipping_agency',
            labelKey: 'profile.tabShippingAgency',
            onPress: () => {
              onActiveKeyChange?.('shipping_agency');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
        ],
      },
      {
        key: 'marketSurvey',
        titleKey: 'profile.marketSurvey',
        items: [
          {
            key: 'unitSurvey',
            labelKey: 'profile.unitPriceSurvey',
            onPress: () => {
              onActiveKeyChange?.('unitSurvey');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
          {
            key: 'oemSurvey',
            labelKey: 'profile.OEM',
            onPress: () => {
              onActiveKeyChange?.('oemSurvey');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
        ],
      },
      {
        key: 'accountCenter',
        titleKey: 'profile.accountCenter',
        items: [
          {
            key: 'paymentHistory',
            labelKey: 'profile.payment',
            onPress: () => {
              onActiveKeyChange?.('paymentHistory');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
          {
            key: 'deposit',
            labelKey: 'profile.deposit',
            onPress: () => {
              onActiveKeyChange?.('deposit');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
          {
            key: 'personalSecurity',
            labelKey: 'profile.personalSecurity',
            onPress: () => {
              onActiveKeyChange?.('personalSecurity');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
          {
            key: 'progressNotification',
            labelKey: 'profile.progressNotification',
            onPress: () => {
              onActiveKeyChange?.('progressNotification');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
          {
            key: 'deliveryAddress',
            labelKey: 'profile.deliveryAddress',
            onPress: () => {
              onActiveKeyChange?.('deliveryAddress');
              navigation.navigate('Main', { screen: 'Profile' } as never);
            },
          },
        ],
      },
    ],
    [navigation, onActiveKeyChange],
  );

  const toggleSection = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isSectionActive = (section: AccordionSection) =>
    section.items.some((item) => item.key === activeKey);

  const isMainActive = activeKey === 'main';

  return (
    <View style={[styles.sidebarColumn, { width: sidebarWidth }]}>
      <ScrollView
        style={styles.sidebarScroll}
        contentContainerStyle={styles.sidebarScrollContent}
        showsVerticalScrollIndicator
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.menuCard}>
        {/* 메인 — 상단 회색 배경 + 주황 텍스트 */}
        <TouchableOpacity
          style={[styles.mainRow, isMainActive && styles.mainRowActive]}
          activeOpacity={0.7}
          onPress={() => {
            onActiveKeyChange?.('main');
            navigation.navigate('Main', { screen: 'Profile' } as never);
          }}
        >
          <Text style={[styles.mainRowText, isMainActive && styles.mainRowTextActive]}>
            {t('buyList.main')}
          </Text>
        </TouchableOpacity>

        {accordionSections.map((section, sectionIdx) => {
          const isOpen = expanded[section.key];
          const sectionActive = isSectionActive(section);

          return (
            <View key={section.key}>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.accordionRow}
                activeOpacity={0.7}
                onPress={() => toggleSection(section.key)}
              >
                <Text
                  style={[
                    styles.accordionTitle,
                    sectionActive && styles.accordionTitleActive,
                  ]}
                >
                  {t(section.titleKey)}
                </Text>
                <Icon
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={COLORS.text.primary}
                />
              </TouchableOpacity>
              {isOpen &&
                section.items.map((item, itemIdx) => {
                  const isActive = item.key === activeKey;
                  const isLastSub =
                    itemIdx === section.items.length - 1;
                  return (
                    <View key={item.key}>
                      <TouchableOpacity
                        style={[
                          styles.subItem,
                          isActive && styles.subItemActive,
                        ]}
                        activeOpacity={0.7}
                        onPress={item.onPress}
                      >
                        <Text
                          style={[
                            styles.subItemText,
                            isActive && styles.subItemTextActive,
                          ]}
                        >
                          {t(item.labelKey)}
                        </Text>
                      </TouchableOpacity>
                      {!isLastSub && <View style={styles.subDivider} />}
                    </View>
                  );
                })}
            </View>
          );
        })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebarColumn: {
    flexShrink: 0,
    alignSelf: 'stretch',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarScrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.sm,
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    overflow: 'hidden',
  },
  mainRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.gray[100],
  },
  mainRowActive: {
    backgroundColor: COLORS.gray[100],
  },
  mainRowText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  mainRowTextActive: {
    color: COLORS.red,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray[200],
  },
  accordionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  accordionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  accordionTitleActive: {
    color: COLORS.red,
  },
  subItem: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.smmd,
    backgroundColor: COLORS.white,
  },
  subItemActive: {
    backgroundColor: 'rgba(255, 85, 0, 0.05)',
  },
  subItemText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  subItemTextActive: {
    color: COLORS.red,
    fontWeight: '700',
  },
  subDivider: {
    height: 1,
    backgroundColor: COLORS.gray[100],
    marginLeft: SPACING.lg,
  },
});

export default ProfileTabletSidebar;
