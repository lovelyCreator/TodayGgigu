import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

interface ImageIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const ImageIcon: React.FC<ImageIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <Circle
        cx="8.5"
        cy="8.5"
        r="1.5"
        fill={color}
      />
      <Path
        d="M21 15L16 10L5 21"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default ImageIcon;













