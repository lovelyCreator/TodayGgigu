import React from 'react';
import Svg, { Path, G, Mask, Rect } from 'react-native-svg';

interface LoginIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const LoginIcon: React.FC<LoginIconProps> = ({
  width = 24,
  height = 24,
  color = '#FFFFFF',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Mask id="mask0_login" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <Rect width="24" height="24" fill="#D9D9D9"/>
      </Mask>
      <G mask="url(#mask0_login)">
        <Path
          d="M11 16L7 12M7 12L11 8M7 12H21M16 16V18C16 19.1046 15.1046 20 14 20H6C4.89543 20 4 19.1046 4 18V6C4 4.89543 4.89543 4 6 4H14C15.1046 4 16 4.89543 16 6V8"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
};

export default LoginIcon;













