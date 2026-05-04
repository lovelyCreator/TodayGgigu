import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ThumbsDownIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const ThumbsDownIcon: React.FC<ThumbsDownIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 2V13M22 11V4C22 2.89543 21.1046 2 20 2H7.57377C6.09299 2 4.83384 2.93972 4.60858 4.39136L3.53169 11.3914C3.25212 13.2077 4.65789 15 6.49677 15H10C10.5523 15 11 15.4477 11 16V19.5342C11 20.896 12.104 22 13.4658 22C13.7907 22 14.085 21.8087 14.2169 21.5119L16.7361 15.4214C16.888 15.0837 17.2388 14.875 17.618 14.875H20C21.1046 14.875 22 13.9796 22 12.875V11C22 10.4477 21.5523 10 21 10H20C19.4477 10 19 9.55228 19 9V3C19 2.44772 19.4477 2 20 2H21C21.5523 2 22 2.44772 22 3V4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

export default ThumbsDownIcon;

