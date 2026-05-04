import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface AddCircleIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const AddCircleIcon: React.FC<AddCircleIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
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
        d="M12 8V16M8 12H16"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default AddCircleIcon;

