import React from 'react';
import { ProfileSettingsMenuRowView } from '../ProfileSettingsMenuRowView';
import type { ProfileSettingsMenuRowComponentProps } from '../profileSettingsSectionsTypes';

/** 비용결제 */
const PaymentMenuRow: React.FC<ProfileSettingsMenuRowComponentProps> = ({
  t,
  navigation,
  isFirst,
  isLast,
}) => (
  <ProfileSettingsMenuRowView
    title={t('profile.payment')}
    onPress={() => navigation.navigate('PaymentHistory')}
    isFirst={isFirst}
    isLast={isLast}
  />
);

export default PaymentMenuRow;
