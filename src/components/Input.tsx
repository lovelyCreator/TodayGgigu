import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from './Icon';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  error?: string;
  disabled?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  required?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  error,
  disabled = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  required = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      marginBottom: SPACING.md,
    };

    if (error) {
      baseStyle.borderColor = COLORS.error;
    } else if (isFocused) {
      baseStyle.borderColor = COLORS.primary;
    } else {
      baseStyle.borderColor = COLORS.border;
    }

    if (disabled) {
      baseStyle.backgroundColor = COLORS.gray[100];
      baseStyle.borderColor = COLORS.gray[300];
    }

    return baseStyle;
  };

  const getInputStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: FONTS.sizes.base,
      color: COLORS.text.primary,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
    };

    if (disabled) {
      baseStyle.color = COLORS.gray[500];
    }

    if (multiline) {
      baseStyle.textAlignVertical = 'top';
    }

    return baseStyle;
  };

  const renderLeftIcon = () => {
    if (!leftIcon) return null;

    return (
      <View style={styles.leftIconContainer}>
        <Icon
          name={leftIcon}
          size={20}
          color={disabled ? COLORS.gray[500] : COLORS.text.secondary}
        />
      </View>
    );
  };

  const renderRightIcon = () => {
    if (!rightIcon && !secureTextEntry) return null;

    const iconName = secureTextEntry
      ? (showPassword ? 'eye-off' : 'eye')
      : rightIcon!;

    const iconColor = disabled ? COLORS.gray[500] : COLORS.text.secondary;

    return (
      <TouchableOpacity
        style={styles.rightIconContainer}
        onPress={secureTextEntry ? togglePasswordVisibility : onRightIconPress}
        disabled={disabled}
      >
        <Icon name={iconName} size={20} color={iconColor} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View style={[styles.inputContainer, getContainerStyle()]}>
        {renderLeftIcon()}
        
        <TextInput
          style={[styles.input, getInputStyle(), inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.text.secondary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={!disabled}
          // onFocus={handleFocus}
          // onBlur={handleBlur}
        />
        
        {renderRightIcon()}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  required: {
    color: COLORS.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  input: {
    flex: 1,
    fontSize: FONTS.sizes.base,
    color: COLORS.text.primary,
  },
  leftIconContainer: {
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
  },
  rightIconContainer: {
    paddingRight: SPACING.md,
    paddingLeft: SPACING.sm,
  },
  errorText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
});

export default Input;
