import React from 'react';
import { ProfileSettingsMenuRowView } from '../ProfileSettingsMenuRowView';
import type { ProfileSettingsMenuRowComponentProps } from '../profileSettingsSectionsTypes';

/** 진행알림 */
const ProgressNotificationMenuRow: React.FC<ProfileSettingsMenuRowComponentProps> = ({
  t,
  navigation,
  isFirst,
  isLast,
}) => (
  <ProfileSettingsMenuRowView
    title={t('profile.progressNotification')}
    onPress={() => navigation.navigate('ProgressNotification')}
    isFirst={isFirst}
    isLast={isLast}
  />
);

export default ProgressNotificationMenuRow;
