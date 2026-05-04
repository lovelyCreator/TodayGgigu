import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface TicketIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const TicketIcon: React.FC<TicketIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 7C2 5.89543 2.89543 5 4 5H20C21.1046 5 22 5.89543 22 7V9C20.8954 9 20 9.89543 20 11C20 12.1046 20.8954 13 22 13V15C22 16.1046 21.1046 17 20 17H4C2.89543 17 2 16.1046 2 15V13C3.10457 13 4 12.1046 4 11C4 9.89543 3.10457 9 2 9V7Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

export default TicketIcon;













