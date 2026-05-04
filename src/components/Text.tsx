import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';
import { FONTS } from '../constants';

interface TextProps extends RNTextProps {
  // Allow override of fontFamily if needed
  fontFamily?: string;
  // Allow fontWeight as a prop for convenience
  fontWeight?: TextStyle['fontWeight'];
}

/**
 * Custom Text component that applies Noto Sans font by default
 * This component automatically applies the correct Noto Sans font variant
 * based on the fontWeight prop or style.
 * 
 * Usage:
 *   import { Text } from '../components';
 *   <Text style={styles.title}>Hello</Text>
 * 
 * Or use React Native's Text directly - it will use the default font from FONTS.defaultTextStyle
 */
const Text: React.FC<TextProps> = ({ style, fontFamily, fontWeight, ...props }) => {
  // Determine font family based on fontWeight if not explicitly provided
  const getFontFamily = (): string => {
    if (fontFamily) {
      return fontFamily;
    }

    // Check fontWeight prop first, then style
    const weight = fontWeight || (StyleSheet.flatten(style) as TextStyle)?.fontWeight;

    // Use FONTS helper function to get appropriate NotoSans variant
    return FONTS.getFontFamily(weight);
  };

  return (
    <RNText
      style={[
        FONTS.defaultTextStyle,
        {
          fontFamily: getFontFamily(),
        },
        style,
      ]}
      {...props}
    />
  );
};

export default Text;
