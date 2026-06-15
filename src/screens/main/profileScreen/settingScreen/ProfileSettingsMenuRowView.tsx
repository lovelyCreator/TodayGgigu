import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '../../../../components/Icon';
import { COLORS } from '../../../../constants';
import { profileSettingsMenuStyles as s } from './profileSettingsMenuStyles';

export type ProfileSettingsMenuRowViewProps = {
  title: string;
  onPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
};

export const ProfileSettingsMenuRowView: React.FC<ProfileSettingsMenuRowViewProps> = ({
  title,
  onPress,
  isFirst,
  isLast,
}) => (
  <TouchableOpacity
    style={[s.menuItem, isFirst && s.firstMenuItem, isLast && s.lastMenuItem]}
    onPress={onPress}
  >
    <View style={s.menuItemLeft}>
      <Text style={s.menuItemText}>{title}</Text>
    </View>
    <Icon name="chevron-forward" size={18} color={COLORS.black} />
  </TouchableOpacity>
);
