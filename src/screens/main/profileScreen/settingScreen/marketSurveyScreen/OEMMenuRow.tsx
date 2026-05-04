import React from 'react';
import { ProfileSettingsMenuRowView } from '../ProfileSettingsMenuRowView';
import type { ProfileSettingsMenuRowComponentProps } from '../profileSettingsSectionsTypes';

/** OEM */
const OEMMenuRow: React.FC<ProfileSettingsMenuRowComponentProps> = ({
  t,
  showComingSoon,
  isFirst,
  isLast,
}) => (
  <ProfileSettingsMenuRowView
    title={t('profile.OEM')}
    onPress={() => showComingSoon(t('profile.OEM'))}
    isFirst={isFirst}
    isLast={isLast}
  />
);

export default OEMMenuRow;
