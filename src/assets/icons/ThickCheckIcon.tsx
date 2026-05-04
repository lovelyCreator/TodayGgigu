import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ThickCheckIconProps {
  size?: number;
  color?: string;
}

const ThickCheckIcon: React.FC<ThickCheckIconProps> = ({ 
  size = 12, 
  color = '#FFFFFF'
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path
        d="M2 6L5 9L10 2"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

export default ThickCheckIcon;


