import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

/** Transparent PNG brand wordmark — source lives under `assets/images` */
const wordmarkSource = require('../images/todayGgiguWordmark.png');

export interface TodayGgiguWordmarkIconProps {
  width?: number;
  height?: number;
  /** Present for parity with vector icons; ignored for raster wordmark */
  color?: string;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

const TodayGgiguWordmarkIcon: React.FC<TodayGgiguWordmarkIconProps> = ({
  width,
  height,
  style,
  accessibilityLabel,
}) => (
  <Image
    source={wordmarkSource}
    resizeMode="contain"
    accessibilityLabel={accessibilityLabel}
    style={[width != null ? { width } : null, height != null ? { height } : null, style]}
  />
);

export default TodayGgiguWordmarkIcon;
