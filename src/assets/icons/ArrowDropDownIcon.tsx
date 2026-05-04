import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ArrowDropDownIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const ArrowDropDownIcon: React.FC<ArrowDropDownIconProps> = ({ 
  width = 18, 
  height,
  color = '#1C1B1F'
}) => {
  // Maintain 2:1 aspect ratio (original SVG is 10x5)
  // If height not provided, calculate from width
  const iconHeight = height || width / 2;
  
  return (
    <Svg width={width} height={iconHeight} viewBox="0 0 10 5" fill="none">
      <Path 
        d="M5 5L0 0H10L5 5Z" 
        fill={color}
      />
    </Svg>
  );
};

export default ArrowDropDownIcon;

