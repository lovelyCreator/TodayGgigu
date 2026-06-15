import React from 'react';
import { View, Text } from 'react-native';
import { profileSettingsMenuStyles as s } from './profileSettingsMenuStyles';

export type ProfileSettingsSectionShellProps = {
  title: string;
  children: React.ReactNode;
};

export const ProfileSettingsSectionShell: React.FC<ProfileSettingsSectionShellProps> = ({
  title,
  children,
}) => (
  <View style={s.sectionCard}>
    <View style={s.sectionHeader}>
      <Text style={s.sectionHeaderText}>{title}</Text>
    </View>
    {children}
  </View>
);
