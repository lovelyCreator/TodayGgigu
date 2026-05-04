import React from 'react';
import { SvgXml } from 'react-native-svg';

interface UnionIconProps {
  width?: number;
  height?: number;
  color?: string;
  style?: any;
}

const UnionIcon: React.FC<UnionIconProps> = ({
  width = 77,
  height = 13,
  color = '#000000',
  style,
}) => {
  // Build XML dynamically with props from parent component
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 77 13" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M76.5557 0L74.291 0.453125C71.4085 1.02963 69.333 3.56041 69.333 6.5V5.03711C69.313 9.43821 65.7397 12.9998 61.334 13H15.2227C10.8044 13 7.22266 9.41828 7.22266 5V6.5C7.22266 3.56041 5.14715 1.02963 2.26465 0.453125L0 0H76.5557Z" fill="${color}"/>
</svg>`;
  
  return <SvgXml xml={xml} width={width} height={height} style={style} />;
};

export default UnionIcon;
