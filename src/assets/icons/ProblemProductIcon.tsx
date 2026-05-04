import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface ProblemProductIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const ProblemProductIcon: React.FC<ProblemProductIconProps> = ({ 
  width = 24, 
  height = 24,
  color = '#1C1B1F'
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path 
        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" 
        fill={color}
      />
    </Svg>
  );
};

export default ProblemProductIcon;

