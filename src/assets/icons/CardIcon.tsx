import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface CardIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const CardIcon: React.FC<CardIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2"
        y="5"
        width="20"
        height="14"
        rx="2"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <Path
        d="M2 10H22"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default CardIcon;

