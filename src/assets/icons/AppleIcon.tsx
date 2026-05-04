import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface AppleIconProps {
  width?: number;
  height?: number;
}

const AppleIcon: React.FC<AppleIconProps> = ({
  width = 24,
  height = 24,
}) => (
  <Svg width={width} height={height} viewBox="0 0 48 48" fill="none">
    <Circle cx={24} cy={24} r={24} fill="#000000" />
    {/* Simple white apple glyph approximation */}
    <Path
      d="M30.5 17.2c-0.9 0.7-1.5 1-2.4 1-0.9 0-1.6-0.3-2.5-0.3-0.9 0-1.7 0.3-2.4 0.8-1.5 1.1-2.4 3.1-2.4 4.9 0 1.5 0.4 2.7 1.1 3.8 0.7 1.1 1.7 1.9 2.8 1.9 1.1 0 1.8-0.7 3-0.7 1.2 0 1.8 0.7 3 0.7 1.2 0 2.1-0.9 2.8-1.9 0.9-1.3 1.3-2.6 1.3-2.7-0.1 0-2.5-1-2.5-3.7 0-2.3 1.9-3.3 2-3.4-1.1-1.7-2.8-1.9-3.3-1.9-1.5-0.1-2.7 0.8-3.5 0.8z"
      fill="#FFFFFF"
    />
  </Svg>
);

export default AppleIcon;


