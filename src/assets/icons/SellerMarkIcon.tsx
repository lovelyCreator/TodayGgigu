import * as React from "react";
import Svg, { Path, Defs, LinearGradient, Stop, SvgProps } from "react-native-svg";

const SellerMarkIcon: React.FC<SvgProps> = (props) => {
  return (
    <Svg
      width={props.width ?? 77}
      height={props.height ?? 72}
      viewBox="0 0 77 72"
      fill="none"
      {...props}
    >
      <Path
        d="M8 0H69V48.0554C69 50.7798 67.6136 53.3169 65.3207 54.7883L42.8207 69.2273C40.188 70.9168 36.812 70.9168 34.1793 69.2273L11.6793 54.7883C9.38645 53.3169 8 50.7798 8 48.0554V0Z"
        fill="url(#paint0_linear)"
      />
      <Path d="M4 4L8 0V8H0L4 4Z" fill="#900000" />
      <Path d="M73 4L69 0V8H77L73 4Z" fill="#900000" />

      <Defs>
        <LinearGradient
          id="paint0_linear"
          x1="38.5"
          y1="0"
          x2="38.5"
          y2="72"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#FF0000" />
          <Stop offset="1" stopColor="#FF5500" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
};

export default SellerMarkIcon;