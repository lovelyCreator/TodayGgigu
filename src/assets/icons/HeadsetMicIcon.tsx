import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface HeadsetMicIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const HeadsetMicIcon: React.FC<HeadsetMicIconProps> = ({ 
  width = 18, 
  height = 21,
  color = '#1C1B1F'
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 18 21" fill="none">
      <Path 
        d="M9 21V19H16V18H12V10H16V9C16 7.06667 15.3167 5.41667 13.95 4.05C12.5833 2.68333 10.9333 2 9 2C7.06667 2 5.41667 2.68333 4.05 4.05C2.68333 5.41667 2 7.06667 2 9V10H6V18H2C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V9C0 7.76667 0.2375 6.60417 0.7125 5.5125C1.1875 4.42083 1.83333 3.46667 2.65 2.65C3.46667 1.83333 4.42083 1.1875 5.5125 0.7125C6.60417 0.2375 7.76667 0 9 0C10.2333 0 11.3958 0.2375 12.4875 0.7125C13.5792 1.1875 14.5333 1.83333 15.35 2.65C16.1667 3.46667 16.8125 4.42083 17.2875 5.5125C17.7625 6.60417 18 7.76667 18 9V19C18 19.55 17.8042 20.0208 17.4125 20.4125C17.0208 20.8042 16.55 21 16 21H9Z" 
        fill={color}
      />
    </Svg>
  );
};

export default HeadsetMicIcon;

