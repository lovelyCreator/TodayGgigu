import React from 'react';
import { ProfileSettingsMenuRowView } from '../ProfileSettingsMenuRowView';
import type { ProfileSettingsMenuRowComponentProps } from '../profileSettingsSectionsTypes';

/** 카테고리 */
const CategoryMenuRow: React.FC<ProfileSettingsMenuRowComponentProps> = ({
  t,
  navigation,
  isFirst,
  isLast,
}) => (
  <ProfileSettingsMenuRowView
    title={t('profile.category')}
    onPress={() => navigation.navigate('Category')}
    isFirst={isFirst}
    isLast={isLast}
  />
);

export default CategoryMenuRow;
