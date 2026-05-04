import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface FilterIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const FilterIcon: React.FC<FilterIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default FilterIcon;

