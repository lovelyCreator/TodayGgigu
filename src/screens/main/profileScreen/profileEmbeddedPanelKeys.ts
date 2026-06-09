import type { ProfileSidebarActiveKey } from './ProfileTabletSidebar';

export const PRODUCT_MANAGEMENT_PANEL_KEYS: ProfileSidebarActiveKey[] = [
  'cart',
  'productList',
  'category',
  'wishlist',
  'myActivity',
];

export const PURCHASE_MANAGEMENT_PANEL_KEYS: ProfileSidebarActiveKey[] = [
  'purchase_agency',
  'rocket_3pl',
  'vvic_hipass',
  'shipping_agency',
];

export const MARKET_SURVEY_PANEL_KEYS: ProfileSidebarActiveKey[] = [
  'unitSurvey',
  'oemSurvey',
];

export const ACCOUNT_CENTER_PANEL_KEYS: ProfileSidebarActiveKey[] = [
  'paymentHistory',
  'deposit',
  'personalSecurity',
  'progressNotification',
  'deliveryAddress',
];

export const PROFILE_EMBEDDED_PANEL_KEYS: ProfileSidebarActiveKey[] = [
  ...PRODUCT_MANAGEMENT_PANEL_KEYS,
  ...PURCHASE_MANAGEMENT_PANEL_KEYS,
  ...MARKET_SURVEY_PANEL_KEYS,
  ...ACCOUNT_CENTER_PANEL_KEYS,
];

export const isProfileEmbeddedPanelKey = (
  key: ProfileSidebarActiveKey,
): boolean => PROFILE_EMBEDDED_PANEL_KEYS.includes(key);
