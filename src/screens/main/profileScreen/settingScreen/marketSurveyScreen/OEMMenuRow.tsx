import React from 'react';
import { ProfileSettingsMenuRowView } from '../ProfileSettingsMenuRowView';
import type { ProfileSettingsMenuRowComponentProps } from '../profileSettingsSectionsTypes';

/** OEM */
const OEMMenuRow: React.FC<ProfileSettingsMenuRowComponentProps> = ({
  t,
  navigation,
  isFirst,
  isLast,
}) => (
  <ProfileSettingsMenuRowView
    title={t('profile.OEM')}
    onPress={() => navigation.navigate('OEMSurvey')}
    isFirst={isFirst}
    isLast={isLast}
  />
);

export default OEMMenuRow;
