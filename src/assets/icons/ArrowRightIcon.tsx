import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ArrowRightIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const ArrowRightIcon: React.FC<ArrowRightIconProps> = ({ 
  width = 4, 
  height = 7,
  color = '#1C1B1F'
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 4 7" fill="none">
      <Path 
        d="M0.4425 6.53333C0.325278 6.53333 0.222222 6.49361 0.133333 6.41417C0.0444444 6.33472 0 6.23 0 6.1V0.433333C0 0.303333 0.0450001 0.198612 0.135 0.119167C0.225 0.0397226 0.33 0 0.45 0C0.494444 0 0.594444 0.0444444 0.75 0.133333L3.4 2.8C3.46667 2.86667 3.51667 2.93789 3.55 3.01367C3.58333 3.08944 3.6 3.17278 3.6 3.26367C3.6 3.35456 3.58333 3.43889 3.55 3.51667C3.51667 3.59444 3.46667 3.66667 3.4 3.73333L0.75 6.4C0.706111 6.44444 0.6585 6.47778 0.607167 6.5C0.555944 6.52222 0.501055 6.53333 0.4425 6.53333Z" 
        fill={color}
      />
    </Svg>
  );
};

export default ArrowRightIcon;

