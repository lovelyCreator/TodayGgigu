import React from 'react';
import Svg, { Path, G, Mask, Rect } from 'react-native-svg';

interface ArrowForwardIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const ArrowForwardIcon: React.FC<ArrowForwardIconProps> = ({
  width = 24,
  height = 24,
  color = '#FFFFFF',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Mask id="mask0_arrowforward" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <Rect width="24" height="24" fill="#D9D9D9"/>
      </Mask>
      <G mask="url(#mask0_arrowforward)">
        <Path
          d="M16.232 19.6785L14.5196 17.9048L18.8619 13.5624H4V11.116H18.8619L14.5196 6.77365L16.232 5L23.5713 12.3392L16.232 19.6785Z"
          fill={color}
        />
      </G>
    </Svg>
  );
};

export default ArrowForwardIcon;













