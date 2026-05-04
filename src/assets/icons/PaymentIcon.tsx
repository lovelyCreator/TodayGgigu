import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

interface PaymentIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const PaymentIcon: React.FC<PaymentIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2"
        y="6"
        width="20"
        height="12"
        rx="2"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <Path
        d="M2 10H22"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Circle
        cx="18"
        cy="14"
        r="2"
        fill={color}
      />
    </Svg>
  );
};

export default PaymentIcon;
