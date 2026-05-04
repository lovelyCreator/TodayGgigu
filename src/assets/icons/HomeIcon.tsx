import React from 'react';
import Svg, { Path, G, Mask, Rect } from 'react-native-svg';

interface HomeIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const HomeIcon: React.FC<HomeIconProps> = ({
  width = 24,
  height = 24,
  color = '#1C1B1F',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Mask id="mask0_4366_33945" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <Rect width="24" height="24" fill="#D9D9D9"/>
      </Mask>
      <G mask="url(#mask0_4366_33945)">
        <Path
          d="M5.62495 21.8002C4.67495 21.8002 3.86662 21.4669 3.19995 20.8002C2.53328 20.1335 2.19995 19.3252 2.19995 18.3752V12.0002C2.19995 11.5502 2.28328 11.1169 2.44995 10.7002C2.61662 10.2835 2.86662 9.90853 3.19995 9.5752L9.57495 3.2252C9.90828 2.89186 10.2833 2.6377 10.7 2.4627C11.1166 2.2877 11.55 2.2002 12 2.2002C12.4333 2.2002 12.8625 2.28353 13.2875 2.4502C13.7125 2.61686 14.0916 2.86686 14.425 3.2002L15.05 3.8252L6.44995 12.4252V17.5502H17.55V12.4252L13.85 8.7252L16.9 5.6752L20.8 9.5752C21.1166 9.90853 21.3625 10.2835 21.5375 10.7002C21.7125 11.1169 21.8 11.5502 21.8 12.0002V18.3752C21.8 19.3252 21.4625 20.1335 20.7875 20.8002C20.1125 21.4669 19.3 21.8002 18.35 21.8002H5.62495Z"
          fill={color}
        />
      </G>
    </Svg>
  );
};

export default HomeIcon;


