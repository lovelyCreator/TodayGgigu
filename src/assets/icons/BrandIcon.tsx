import React from 'react';
import { SvgXml } from 'react-native-svg';

interface BrandIconProps {
  width?: number;
  height?: number;
  color?: string;
  style?: any;
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<mask id="mask0_4009_844" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
<rect width="16" height="16" fill="#D9D9D9"/>
</mask>
<g mask="url(#mask0_4009_844)">
<path d="M11.4251 9.17627V7.37796H14.6145V9.17627H11.4251ZM12.5448 14.0792L9.99998 12.1791L11.1197 10.754L13.6645 12.6541L12.5448 14.0792ZM11.1197 5.8002L9.99998 4.37513L12.5448 2.47503L13.6645 3.9001L11.1197 5.8002ZM1.89062 10.6522V5.90199H4.84257L8.71063 2V14.5542L4.84257 10.6522H1.89062Z" fill="#FFFFFF"/>
</g>
</svg>`;

const BrandIcon: React.FC<BrandIconProps> = ({
  width = 16,
  height = 16,
  color = '#FFFFFF',
  style,
}) => {
  const colored = xml.replace(/#FFFFFF/g, color);
  return <SvgXml xml={colored} width={width} height={height} style={style} />;
};

export default BrandIcon;
