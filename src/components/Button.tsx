import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from './Icon';
import LinearGradient from 'react-native-linear-gradient';

import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BORDER_RADIUS.lg,
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.paddingVertical = SPACING.xs;
        baseStyle.paddingHorizontal = SPACING.sm;
        break;
      case 'large':
        baseStyle.paddingVertical = SPACING.lg;
        baseStyle.paddingHorizontal = SPACING.xl;
        break;
      default: // medium
        baseStyle.paddingVertical = SPACING.md;
        baseStyle.paddingHorizontal = SPACING.lg;
    }

    // Variant styles
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = disabled ? COLORS.gray[300] : COLORS.primary;
        break;
      case 'secondary':
        baseStyle.backgroundColor = disabled ? COLORS.gray[300] : COLORS.secondary;
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = disabled ? COLORS.gray[300] : COLORS.primary;
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        break;
      case 'danger':
        baseStyle.backgroundColor = disabled ? COLORS.gray[300] : COLORS.error;
        break;
    }

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.fontSize = FONTS.sizes.sm;
        break;
      case 'large':
        baseStyle.fontSize = FONTS.sizes.lg;
        break;
      default: // medium
        baseStyle.fontSize = FONTS.sizes.base;
    }

    // Variant styles
    switch (variant) {
      case 'primary':
        baseStyle.color = disabled ? COLORS.gray[500] : COLORS.white;
        break;
      case 'secondary':
        baseStyle.color = disabled ? COLORS.gray[500] : COLORS.white;
        break;
      case 'outline':
        baseStyle.color = disabled ? COLORS.gray[500] : COLORS.primary;
        break;
      case 'ghost':
        baseStyle.color = disabled ? COLORS.gray[500] : COLORS.primary;
        break;
      case 'danger':
        baseStyle.color = disabled ? COLORS.gray[500] : COLORS.white;
        break;
    }

    return baseStyle;
  };

  const getIconSize = (): number => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 24;
      default: // medium
        return 20;
    }
  };

  const getIconColor = (): string => {
    if (disabled) return COLORS.gray[500];
    
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return COLORS.white;
      case 'outline':
      case 'ghost':
        return COLORS.primary;
      default:
        return COLORS.white;
    }
  };

  const renderIcon = () => {
    if (!icon) return null;

    return (
      <Icon
        name={icon}
        size={getIconSize()}
        color={getIconColor()}
        style={iconPosition === 'left' ? styles.iconLeft : styles.iconRight}
      />
    );
  };

  const renderButtonContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={getIconColor()}
          style={styles.loader}
        />
      );
    }

    return (
      <>
        {icon && iconPosition === 'left' && renderIcon()}
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        {icon && iconPosition === 'right' && renderIcon()}
      </>
    );
  };

  // For primary and secondary variants, use LinearGradient
  if ((variant === 'primary' || variant === 'secondary') && !disabled) {
    const gradientColors = variant === 'primary' 
      ? [COLORS.gradients.primary[0], COLORS.gradients.primary[1]] as [string, string]
      : [COLORS.gradients.secondary[0], COLORS.gradients.secondary[1]] as [string, string];

    return (
      <TouchableOpacity
        style={[getButtonStyle(), style]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.gradientButton}
        >
          {renderButtonContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {renderButtonContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconLeft: {
    marginRight: SPACING.xs,
  },
  iconRight: {
    marginLeft: SPACING.xs,
  },
  loader: {
    marginRight: SPACING.xs,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
});

export default Button;
