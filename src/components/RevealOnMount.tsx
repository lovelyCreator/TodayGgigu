import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp, Easing } from 'react-native';

interface RevealOnMountProps {
  /** Duration of the reveal animation in ms. Default: 280. */
  duration?: number;
  /** Pixels the content travels up from its final position. Default: 16. */
  translateY?: number;
  /** Optional extra delay before the animation begins. Default: 0. */
  delay?: number;
  /** Style passed straight through to the wrapping Animated.View. */
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Fades and slightly lifts its children the moment they mount, so a section
 * appearing for the first time slides into place instead of popping in.
 *
 * Uses the native driver so the animation never blocks the JS thread — even
 * if heavy work (description images decoding, related products grid) runs
 * simultaneously, the reveal stays smooth.
 */
const RevealOnMount: React.FC<RevealOnMountProps> = ({
  duration = 280,
  translateY = 16,
  delay = 0,
  style,
  children,
}) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, duration, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [translateY, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default RevealOnMount;
