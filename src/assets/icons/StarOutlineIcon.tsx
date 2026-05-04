import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface StarOutlineIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const StarOutlineIcon: React.FC<StarOutlineIconProps> = ({
  width = 24,
  height = 24,
  color = '#FFD700',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

export default StarOutlineIcon;













