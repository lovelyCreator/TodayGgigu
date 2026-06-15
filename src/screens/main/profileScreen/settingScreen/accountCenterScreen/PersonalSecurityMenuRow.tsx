import React from 'react';
import { ProfileSettingsMenuRowView } from '../ProfileSettingsMenuRowView';
import type { ProfileSettingsMenuRowComponentProps } from '../profileSettingsSectionsTypes';

/** 개인보안 */
const PersonalSecurityMenuRow: React.FC<ProfileSettingsMenuRowComponentProps> = ({
  t,
  navigation,
  isFirst,
  isLast,
}) => (
  <ProfileSettingsMenuRowView
    title={t('profile.personalSecurity')}
    onPress={() => navigation.navigate('PersonalInformation')}
    isFirst={isFirst}
    isLast={isLast}
  />
);

export default PersonalSecurityMenuRow;
