import React from 'react';
import Svg, { Mask, Rect, G, Path } from 'react-native-svg';

interface ArrowDownIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const ArrowDownIcon: React.FC<ArrowDownIconProps> = ({
  width = 24,
  height = 24,
  color = '#1C1B1F',
}) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    <Mask
      id="arrow-down-mask"
      maskType="alpha"
      x={0}
      y={0}
      width={24}
      height={24}
    >
      <Rect width={24} height={24} fill="#D9D9D9" />
    </Mask>
    <G mask="url(#arrow-down-mask)">
      <Path
        d="M12.0249 15.3C11.8416 15.3 11.6749 15.2708 11.5249 15.2125C11.3749 15.1542 11.2332 15.0583 11.0999 14.925L6.3999 10.225C6.1499 9.975 6.0249 9.66667 6.0249 9.3C6.0249 8.93333 6.1499 8.625 6.3999 8.375C6.6499 8.125 6.95824 8 7.3249 8C7.69157 8 7.9999 8.125 8.2499 8.375L12.0249 12.15L15.7999 8.375C16.0499 8.125 16.3582 8 16.7249 8C17.0916 8 17.3999 8.125 17.6499 8.375C17.8999 8.625 18.0249 8.93333 18.0249 9.3C18.0249 9.66667 17.8999 9.975 17.6499 10.225L12.9499 14.925C12.8166 15.0583 12.6749 15.1542 12.5249 15.2125C12.3749 15.2708 12.2082 15.3 12.0249 15.3Z"
        fill={color}
      />
    </G>
  </Svg>
);

export default ArrowDownIcon;


