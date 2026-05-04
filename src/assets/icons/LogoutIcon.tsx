import React from 'react';
import Svg, { Path, G, Mask, Rect } from 'react-native-svg';

interface LogoutIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const LogoutIcon: React.FC<LogoutIconProps> = ({
  width = 24,
  height = 24,
  color = '#EF4444',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Mask id="mask0_logout" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <Rect width="24" height="24" fill="#D9D9D9"/>
      </Mask>
      <G mask="url(#mask0_logout)">
        <Path
          d="M13 8L17 12M17 12L13 16M17 12H3M8 16V18C8 19.1046 8.89543 20 10 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H10C8.89543 4 8 4.89543 8 6V8"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
};

export default LogoutIcon;













