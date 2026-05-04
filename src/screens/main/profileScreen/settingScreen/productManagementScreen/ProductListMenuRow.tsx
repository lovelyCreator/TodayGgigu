import React from 'react';
import { ProfileSettingsMenuRowView } from '../ProfileSettingsMenuRowView';
import type { ProfileSettingsMenuRowComponentProps } from '../profileSettingsSectionsTypes';

/** 상품리스트 */
const ProductListMenuRow: React.FC<ProfileSettingsMenuRowComponentProps> = ({
  t,
  navigation,
  isFirst,
  isLast,
}) => (
  <ProfileSettingsMenuRowView
    title={t('profile.productList')}
    onPress={() => navigation.navigate('BuyList', { initialTab: 'all' })}
    isFirst={isFirst}
    isLast={isLast}
  />
);

export default ProductListMenuRow;
