import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface RocketIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const RocketIcon: React.FC<RocketIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 16.5C4.5 16.5 2 14.5 2 12C2 9.5 4.5 7.5 4.5 7.5C4.5 7.5 7 9.5 9.5 7.5C12 5.5 14 3 16.5 3C19 3 21 5 19.5 7.5C18 10 15.5 12 13.5 14.5C11.5 17 9.5 19.5 7.5 19.5C5.5 19.5 4.5 16.5 4.5 16.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M9.5 14.5L8 16L10 18L11.5 16.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle
        cx="6.5"
        cy="9.5"
        r="1"
        fill={color}
      />
    </Svg>
  );
};

export default RocketIcon;

