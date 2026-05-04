import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ChevronBackIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const ChevronBackIcon: React.FC<ChevronBackIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18L9 12L15 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

export default ChevronBackIcon;

