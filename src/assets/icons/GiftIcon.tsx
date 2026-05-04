import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface GiftIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const GiftIcon: React.FC<GiftIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 12V22H4V12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 7H2V12H22V7Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 22V7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 7H7.5C6.57174 7 5.6815 6.63125 5.02513 5.97487C4.36875 5.3185 4 4.42826 4 3.5C4 2.57174 4.36875 1.6815 5.02513 1.02513C5.6815 0.368749 6.57174 0 7.5 0C10 0 12 3.5 12 3.5C12 3.5 14 0 16.5 0C17.4283 0 18.3185 0.368749 18.9749 1.02513C19.6312 1.6815 20 2.57174 20 3.5C20 4.42826 19.6312 5.3185 18.9749 5.97487C18.3185 6.63125 17.4283 7 16.5 7H12Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default GiftIcon;













