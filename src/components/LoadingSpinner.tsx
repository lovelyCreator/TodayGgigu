import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
} from 'react-native';

import { COLORS, FONTS, SPACING } from '../constants';
import { useTranslation } from '../hooks/useTranslation';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  /** Pre-translated message (legacy). Prefer `messageKey` for i18n. */
  message?: string;
  /** Dotted i18n key under translations root, e.g. `loading.categories`. */
  messageKey?: string;
  style?: object;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = COLORS.red,
  message,
  messageKey,
  style,
}) => {
  const { t } = useTranslation();
  const label = messageKey ? t(messageKey) : message;

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {label ? (
        <Text style={styles.message}>{label}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
});

export default LoadingSpinner;
