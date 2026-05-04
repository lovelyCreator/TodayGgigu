import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ArrowBackIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const ArrowBackIcon: React.FC<ArrowBackIconProps> = ({
  width = 12,
  height = 20,
  color = '#1C1B1F',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 12 20" fill="none">
      <Path
        d="M3.3 9.975L10.625 17.3C10.925 17.6 11.075 17.9667 11.075 18.4C11.075 18.8333 10.925 19.2 10.625 19.5C10.325 19.8 9.95833 19.95 9.525 19.95C9.09167 19.95 8.725 19.8 8.425 19.5L0.775 11.85C0.508333 11.5833 0.3125 11.2875 0.1875 10.9625C0.0625 10.6375 0 10.3083 0 9.975C0 9.64167 0.0625 9.3125 0.1875 8.9875C0.3125 8.6625 0.508333 8.36667 0.775 8.1L8.425 0.45C8.725 0.15 9.09167 0 9.525 0C9.95833 0 10.325 0.15 10.625 0.45C10.925 0.75 11.075 1.11667 11.075 1.55C11.075 1.98333 10.925 2.35 10.625 2.65L3.3 9.975Z"
        fill={color}
      />
    </Svg>
  );
};

export default ArrowBackIcon;


