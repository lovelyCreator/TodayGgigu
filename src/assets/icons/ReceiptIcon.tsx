import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ReceiptIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const ReceiptIcon: React.FC<ReceiptIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 2V22L7 20L10 22L13 20L16 22L19 20L22 22V2H4Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M8 8H16"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M8 12H16"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M8 16H12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default ReceiptIcon;

