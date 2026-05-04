import React from 'react';
import Svg, { Path, Mask, G, Rect } from 'react-native-svg';

interface AddressIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const AddressIcon: React.FC<AddressIconProps> = ({
  width = 16,
  height = 16,
  color = '#E0B9A6',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 16 16" fill="none">
      <Mask
        id="mask0"
        x="0"
        y="0"
        width="16"
        height="16"
      >
        <Rect width="16" height="16" fill="#ffffff" />
      </Mask>

      <G mask="url(#mask0)">
        <Path
          d="M7.997 14.663Q5.314 12.38 3.99 10.421 2.664 8.463 2.664 6.796q0-2.5 1.608-3.983T7.997 1.33q.45 0 .892.075.442.076.858.208l-1.083 1.1a2 2 0 0 0-.325-.042 7 7 0 0 0-.342-.008q-1.683 0-2.841 1.158Q3.998 4.98 3.997 6.796q0 1.184.984 2.709.982 1.524 3.016 3.391 2.034-1.867 3.017-3.391t.983-2.709a5 5 0 0 0-.066-.783l1.1-1.1q.15.433.225.9t.075.983q0 1.667-1.325 3.625-1.326 1.959-4.009 4.242m3.467-12.867L7.331 5.93v1.4h1.4l4.133-4.134zm1.867.934.466-.467a.63.63 0 0 0 .184-.467.63.63 0 0 0-.184-.466l-.466-.467a.63.63 0 0 0-.467-.183.63.63 0 0 0-.467.183l-.466.467z"
          fill={color}
        />
      </G>
    </Svg>
  );
};

export default AddressIcon;