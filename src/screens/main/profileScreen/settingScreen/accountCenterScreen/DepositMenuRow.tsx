import React from 'react';
import { ProfileSettingsMenuRowView } from '../ProfileSettingsMenuRowView';
import type { ProfileSettingsMenuRowComponentProps } from '../profileSettingsSectionsTypes';

/** 예치금 */
const DepositMenuRow: React.FC<ProfileSettingsMenuRowComponentProps> = ({
  t,
  navigation,
  isFirst,
  isLast,
}) => (
  <ProfileSettingsMenuRowView
    title={t('profile.deposit')}
    onPress={() => navigation.navigate('Deposit')}
    isFirst={isFirst}
    isLast={isLast}
  />
);

export default DepositMenuRow;
