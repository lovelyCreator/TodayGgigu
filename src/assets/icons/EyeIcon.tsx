import React from 'react';
import Svg, { Path, G, Circle } from 'react-native-svg';

interface EyeIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const EyeIcon: React.FC<EyeIconProps> = ({
  width = 24,
  height = 24,
  color = '#666666',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx="12"
        cy="12"
        r="3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default EyeIcon;













