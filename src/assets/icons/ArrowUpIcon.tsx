import React from 'react';
import Svg, { Mask, Rect, G, Path } from 'react-native-svg';

interface ArrowUpIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const ArrowUpIcon: React.FC<ArrowUpIconProps> = ({
  width = 24,
  height = 24,
  color = '#1C1B1F',
}) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    <Mask
      id="arrow-up-mask"
      maskType="alpha"
      x={0}
      y={0}
      width={24}
      height={24}
    >
      <Rect width={24} height={24} fill="#D9D9D9" />
    </Mask>
    <G mask="url(#arrow-up-mask)">
      <Path
        d="M12.0249 8.7C12.2082 8.7 12.3749 8.72917 12.5249 8.7875C12.6749 8.84583 12.8166 8.94167 12.9499 9.075L17.6499 13.775C17.8999 14.025 18.0249 14.3333 18.0249 14.7C18.0249 15.0667 17.8999 15.375 17.6499 15.625C17.3999 15.875 17.0916 16 16.7249 16C16.3582 16 16.0499 15.875 15.7999 15.625L12.0249 11.85L8.2499 15.625C7.9999 15.875 7.69157 16 7.3249 16C6.95824 16 6.6499 15.875 6.3999 15.625C6.1499 15.375 6.0249 15.0667 6.0249 14.7C6.0249 14.3333 6.1499 14.025 6.3999 13.775L11.0999 9.075C11.2332 8.94167 11.3749 8.84583 11.5249 8.7875C11.6749 8.72917 11.8416 8.7 12.0249 8.7Z"
        fill={color}
      />
    </G>
  </Svg>
);

export default ArrowUpIcon;













