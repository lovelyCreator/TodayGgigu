import React from 'react';
import { SvgXml } from 'react-native-svg';

interface SvgIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <mask id="mask0_4182_2046" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24" style="mask-type:alpha">
    <rect width="24" height="24" fill="#D9D9D9"/>
  </mask>
  <g mask="url(#mask0_4182_2046)">
    <path
      d="M6.603 14h6.75q.426 0 .713-.287a.97.97 0 0 0 .287-.713.97.97 0 0 0-.287-.713.97.97 0 0 0-.713-.287h-6.75a.97.97 0 0 0-.712.287.97.97 0 0 0-.288.713q0 .424.288.713.287.287.712.287m0-3.375h10.8q.425 0 .713-.287a.97.97 0 0 0 .287-.713.97.97 0 0 0-.287-.713.97.97 0 0 0-.713-.287h-10.8a.97.97 0 0 0-.712.287.97.97 0 0 0-.288.713q0 .424.288.713.287.287.712.287m0-3.375h8.075q.425 0 .713-.287a.97.97 0 0 0 .287-.713.97.97 0 0 0-.287-.713.97.97 0 0 0-.713-.287H6.603a.97.97 0 0 0-.712.287.97.97 0 0 0-.288.713q0 .424.288.713.287.287.712.287m-.75 11.15-2.4 2.4q-.625.625-1.437.28t-.813-1.23V3.55q0-1.093.779-1.871A2.55 2.55 0 0 1 3.853.9h8.65q.651 0 1.038.487t.262 1.113q-.1.45-.462.75-.363.3-.838.3h-8.65v13.1l.9-.9h15.4V9.925q0-.551.388-.937.387-.388.937-.388t.938.388.387.937v5.825q0 1.093-.778 1.872a2.55 2.55 0 0 1-1.872.778zm10.8-12.725a3.2 3.2 0 0 1-.975-2.35q0-1.375.975-2.35A3.2 3.2 0 0 1 19.003 0q1.375 0 2.35.975t.975 2.35-.975 2.35-2.35.975q-1.374 0-2.35-.975"
      fill="#1C1B1F"
    />
  </g>
</svg>`;

const MessageIcon: React.FC<SvgIconProps> = ({
  width = 24,
  height = 24,
  color = '#1C1B1F',
}) => {
  // Replace the color dynamically
  const coloredXml = xml.replace(/#1C1B1F/g, color);
  return <SvgXml xml={coloredXml} width={width} height={height} />;
};

export default MessageIcon;