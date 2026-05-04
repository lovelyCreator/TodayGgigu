import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

import { COLORS } from '../../constants';

interface CheckIconProps {
  size?: number;
  color?: string;
  stroke?: number;
  isSelected?: boolean; // New prop for selection state
  circleColor?: string; // Custom color for the circle when selected
}

const CheckIcon: React.FC<CheckIconProps> = ({ 
  size = 16, 
  color = COLORS.white, 
  stroke = 2.5,
  isSelected = false,
  circleColor
}) => {
  if (isSelected) {
    // Selected state: filled circle with white checkmark
    const fillColor = circleColor || COLORS.red;
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {/* Circle with custom or default color background */}
        <Circle
          cx="12"
          cy="12"
          r="10"
          fill={fillColor}
        />
        {/* White checkmark */}
        <Path
          d="M8 12l3 3l6 -6"
          fill="none"
          stroke={COLORS.white}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  } else {
    // Unselected state: bordered circle without checkmark
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {/* Circle with gray border and white background */}
        <Circle
          cx="12"
          cy="12"
          r="9"
          fill={COLORS.white}
          stroke={COLORS.gray[300]}
          strokeWidth="2"
        />
      </Svg>
    );
  }
};

export default CheckIcon;