import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface FlashIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const FlashIcon: React.FC<FlashIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

export default FlashIcon;

