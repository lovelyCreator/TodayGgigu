import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface AirplaneIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const AirplaneIcon: React.FC<AirplaneIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.5 2L18.5 5.5L22 9L14 17L11 14L3 22L2 21L10 13L7 10L15 2L18.5 5.5L21.5 2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

export default AirplaneIcon;













