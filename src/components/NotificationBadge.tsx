import React, { ReactElement } from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS } from '../constants';

interface NotificationBadgeProps {
  icon?: string;
  customIcon?: ReactElement;
  iconSize?: number;
  iconColor?: string;
  count: number;
  onPress: () => void;
  badgeColor?: string;
  showCount ?: boolean;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  icon,
  customIcon,
  iconSize = 36,
  iconColor = COLORS.text.primary,
  count,
  onPress,
  badgeColor = '#FF5500', // Default red color for notification dot
  showCount = false,
}) => {
  const renderIcon = () => {
    if (customIcon) {
      return customIcon;
    }
    if (icon) {
      return <Icon name={icon} size={iconSize} color={iconColor} />;
    }
    return null;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {renderIcon()}
      {showCount? <View style={[styles.round, { backgroundColor: badgeColor }]} >
        {
          count<10 ? <Text style={styles.countText}>0{count}</Text> : <Text style={styles.countText}>{count}</Text>
        }
      </View> : 
      count > 0 && (
        <View style={[styles.dot, { backgroundColor: badgeColor }]} />
      )
    }
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 4,
  },
  dot: {
    position: 'absolute',
    top: 1,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 6,
  },
  round: {
    position: 'absolute',
    top: -4,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
  }
});

export default NotificationBadge;
