import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ThumbsUpIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const ThumbsUpIcon: React.FC<ThumbsUpIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 22V11M2 13V20C2 21.1046 2.89543 22 4 22H16.4262C17.907 22 19.1662 21.0603 19.3914 19.6086L20.4683 12.6086C20.7479 10.7923 19.3421 9 17.5032 9H14C13.4477 9 13 8.55228 13 8V4.46584C13 3.10399 11.896 2 10.5342 2C10.2093 2 9.91498 2.1913 9.78306 2.48812L7.26394 8.57863C7.11196 8.91631 6.76123 9.125 6.38197 9.125H4C2.89543 9.125 2 10.0204 2 11.125V13C2 13.5523 2.44772 14 3 14H4C4.55228 14 5 14.4477 5 15V21C5 21.5523 4.55228 22 4 22H3C2.44772 22 2 21.5523 2 21V20"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

export default ThumbsUpIcon;

