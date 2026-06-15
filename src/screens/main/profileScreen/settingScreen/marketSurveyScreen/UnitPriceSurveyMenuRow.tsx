import React from 'react';
import { ProfileSettingsMenuRowView } from '../ProfileSettingsMenuRowView';
import type { ProfileSettingsMenuRowComponentProps } from '../profileSettingsSectionsTypes';

/** 단가조사 */
const UnitPriceSurveyMenuRow: React.FC<ProfileSettingsMenuRowComponentProps> = ({
  t,
  navigation,
  isFirst,
  isLast,
}) => (
  <ProfileSettingsMenuRowView
    title={t('profile.unitPriceSurvey')}
    onPress={() => navigation.navigate('UnitSurvey')}
    isFirst={isFirst}
    isLast={isLast}
  />
);

export default UnitPriceSurveyMenuRow;
