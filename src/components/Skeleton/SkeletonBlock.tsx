import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { COLORS } from '../../constants';

interface SkeletonBlockProps {
  /** Width in px or percentage string (e.g. '60%'). */
  width?: number | string;
  /** Height in px. */
  height?: number;
  /** Corner radius. Defaults to 4 for bars; pass larger values for cards/avatars. */
  borderRadius?: number;
  /** Extra style overrides (margins, alignment). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Single pulsing placeholder block. The opacity oscillates between 0.4 and 1
 * via `useNativeDriver: true` so the animation runs off the JS thread and
 * stays smooth while screen code is still parsing.
 */
const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width = '100%',
  height = 12,
  borderRadius = 4,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.gray[200],
  },
});

export default SkeletonBlock;
