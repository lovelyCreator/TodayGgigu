import React from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps as RNTextInputProps,
  TouchableOpacity,
} from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING } from '../constants';

type RoundedVariant = 'all' | 'top' | 'bottom' | 'none';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  wrapperStyle?: ViewStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  showError?: boolean;
  secureTextEntry?: boolean;
  onToggleSecure?: () => void;
  showSecureToggle?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  roundedVariant?: RoundedVariant;
}

const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  containerStyle,
  inputStyle,
  wrapperStyle,
  labelStyle,
  errorStyle,
  showError = true,
  secureTextEntry = false,
  onToggleSecure,
  showSecureToggle = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  roundedVariant = 'all',
  ...props
}) => {
  const hasError = error && error !== 'login_error' && error !== 'signup_error';
  const hasErrorBorder = !!error;

  let radiusStyle: ViewStyle = {};
  switch (roundedVariant) {
    case 'top':
      radiusStyle = {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      };
      break;
    case 'bottom':
      radiusStyle = {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
      };
      break;
    case 'none':
      radiusStyle = {
        borderRadius: 0,
      };
      break;
    case 'all':
    default:
      radiusStyle = {};
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>{label}</Text>
      )}
      
      <View
        style={[
          styles.inputWrapper,
          radiusStyle,
          hasErrorBorder && styles.inputError,
          wrapperStyle,
        ]}
      >
        {leftIcon && (
          <Icon 
            name={leftIcon} 
            size={20} 
            color={COLORS.gray[400]} 
            style={styles.leftIcon}
          />
        )}
        
        <RNTextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor={COLORS.gray[400]}
          secureTextEntry={secureTextEntry}
          {...props}
        />
        
        {showSecureToggle && onToggleSecure && (
          <TouchableOpacity
            onPress={onToggleSecure}
            style={styles.eyeIcon}
          >
            <Icon
              name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'}
              size={24}
              color={COLORS.gray[600]}
            />
          </TouchableOpacity>
        )}
        
        {rightIcon && !showSecureToggle && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
          >
            <Icon
              name={rightIcon}
              size={20}
              color={COLORS.gray[400]}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {showError && hasError && (
        <View style={styles.errorMessageContainer}>
          <View style={styles.alarmMark}>
            <Text style={styles.alarmText}>!</Text>
          </View>
          <Text style={[styles.errorText, errorStyle]}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // marginBottom: SPACING.lg,
    // backgroundColor: 'white',
  },
  label: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: '#FF6B9D',
  },
  input: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    paddingVertical: SPACING.sm,
  },
  leftIcon: {
    marginRight: SPACING.sm,
  },
  rightIcon: {
    padding: SPACING.sm,
  },
  eyeIcon: {
    padding: SPACING.sm,
  },
  errorMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  errorText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  alarmMark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  alarmText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
    color: COLORS.error,
  },
});

export default TextInput;
