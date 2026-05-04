import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface MailIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const MailIcon: React.FC<MailIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <Path
        d="M2 6L12 13L22 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

export default MailIcon;

