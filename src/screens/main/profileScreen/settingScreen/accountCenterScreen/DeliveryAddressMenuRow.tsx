import React from 'react';
import { ProfileSettingsMenuRowView } from '../ProfileSettingsMenuRowView';
import type { ProfileSettingsMenuRowComponentProps } from '../profileSettingsSectionsTypes';

/** 수령주소 */
const DeliveryAddressMenuRow: React.FC<ProfileSettingsMenuRowComponentProps> = ({
  t,
  navigation,
  isFirst,
  isLast,
}) => (
  <ProfileSettingsMenuRowView
    title={t('profile.deliveryAddress')}
    onPress={() => navigation.navigate('AddressBook', { fromShippingSettings: true })}
    isFirst={isFirst}
    isLast={isLast}
  />
);

export default DeliveryAddressMenuRow;
