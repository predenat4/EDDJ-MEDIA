import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export const ChristianCross: React.FC<IconProps> = ({ size = 24, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 2v20M5 8h14" />
  </svg>
);
