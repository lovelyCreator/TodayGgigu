import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface CloseCircleIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const CloseCircleIcon: React.FC<CloseCircleIconProps> = ({
  width = 24,
  height = 24,
  color = '#666666',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <Path
        d="M15 9L9 15M9 9L15 15"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default CloseCircleIcon;













