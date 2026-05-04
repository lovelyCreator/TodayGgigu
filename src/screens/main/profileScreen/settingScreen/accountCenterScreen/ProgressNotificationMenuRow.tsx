import React from 'react';
import { ProfileSettingsMenuRowView } from '../ProfileSettingsMenuRowView';
import type { ProfileSettingsMenuRowComponentProps } from '../profileSettingsSectionsTypes';

/** 진행알림 */
const ProgressNotificationMenuRow: React.FC<ProfileSettingsMenuRowComponentProps> = ({
  t,
  showComingSoon,
  isFirst,
  isLast,
}) => (
  <ProfileSettingsMenuRowView
    title={t('profile.progressNotification')}
    onPress={() => showComingSoon(t('profile.progressNotification'))}
    isFirst={isFirst}
    isLast={isLast}
  />
);

export default ProgressNotificationMenuRow;
