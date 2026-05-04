import React from 'react';
import Svg, { Path, G, Mask, Rect } from 'react-native-svg';

interface LiveIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const LiveIcon: React.FC<LiveIconProps> = ({
  width = 24,
  height = 24,
  color = '#1C1B1F',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Mask id="mask0_3863_2887" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <Rect width="24" height="24" fill="#D9D9D9"/>
      </Mask>
      <G mask="url(#mask0_3863_2887)">
        <Path
          d="M3.5499 20.75C2.82124 20.75 2.1974 20.4905 1.6784 19.9715C1.1594 19.4527 0.899902 18.8288 0.899902 18.1V5.9C0.899902 5.17133 1.1594 4.5475 1.6784 4.0285C2.1974 3.5095 2.82124 3.25 3.5499 3.25H15.7499C16.4786 3.25 17.1024 3.5095 17.6214 4.0285C18.1404 4.5475 18.3999 5.17133 18.3999 5.9V10.05L21.9749 6.475C22.1916 6.25833 22.4332 6.20833 22.6999 6.325C22.9666 6.44167 23.0999 6.65 23.0999 6.95V17.05C23.0999 17.35 22.9666 17.5583 22.6999 17.675C22.4332 17.7917 22.1916 17.7417 21.9749 17.525L18.3999 13.95V18.1C18.3999 18.8288 18.1404 19.4527 17.6214 19.9715C17.1024 20.4905 16.4786 20.75 15.7499 20.75H3.5499ZM3.5499 18.1H15.7499V5.9H3.5499V18.1Z"
          fill={color}
        />
      </G>
    </Svg>
  );
};

export default LiveIcon;


