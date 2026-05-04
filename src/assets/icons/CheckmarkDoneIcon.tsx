import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface CheckmarkDoneIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const CheckmarkDoneIcon: React.FC<CheckmarkDoneIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"
        fill={color}
      />
    </Svg>
  );
};

export default CheckmarkDoneIcon;













