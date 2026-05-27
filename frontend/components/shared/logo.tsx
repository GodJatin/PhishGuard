'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  theme?: 'dark' | 'light';
}

export default function Logo({ className = '', iconOnly = false, size = 'md', theme = 'dark' }: LogoProps) {
  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'w-6 h-6';
      case 'lg': return 'w-10 h-10';
      default: return 'w-8 h-8';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm': return 'text-base';
      case 'lg': return 'text-xl';
      default: return 'text-lg';
    }
  };

  const getSubtextSize = () => {
    switch (size) {
      case 'sm': return 'text-[8px]';
      case 'lg': return 'text-[11px]';
      default: return 'text-[9px]';
    }
  };

  const textColor = theme === 'dark' ? 'text-white' : 'text-[#0f172a]';
  const subtextColor = theme === 'dark' ? 'text-emerald-500/70' : 'text-[#10b981]';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* SVG Brand Icon */}
      <div className={`${getIconSize()} relative flex items-center justify-center shrink-0`}>
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
        >
          {/* Hexagonal Shield Background */}
          <path 
            d="M50 5L90 25V60C90 78.5 73.5 92.5 50 95C26.5 92.5 10 78.5 10 60V25L50 5Z" 
            fill={theme === 'dark' ? '#0c0d0f' : '#f8fafc'}
            stroke="#10b981" 
            strokeWidth="6"
            strokeLinejoin="round"
          />
          {/* Inner Radar Sweep rings */}
          <circle cx="50" cy="50" r="28" stroke="#10b981" strokeWidth="2" strokeDasharray="4 6" opacity="0.4" />
          <circle cx="50" cy="50" r="18" stroke="#10b981" strokeWidth="1.5" opacity="0.6" />
          
          {/* Core Shield Node */}
          <path 
            d="M50 35L62 42V52C62 59.4 56.4 64.7 50 66C43.6 64.7 38 59.4 38 52V42L50 35Z" 
            fill="#10b981" 
            opacity="0.85"
          />
          {/* Lock Core Shackle */}
          <path d="M46 44V42C46 39.8 47.8 38 50 38C52.2 38 54 39.8 54 42V44" stroke="#08090b" strokeWidth="2" strokeLinecap="round" />
          <circle cx="50" cy="49" r="2" fill="#08090b" />
        </svg>
        {/* Glowing sweep dot - CSS animation */}
        <span className="absolute inset-0 rounded-full border border-emerald-500/0 animate-ping opacity-75 pointer-events-none" style={{ animationDuration: '3s' }} />
      </div>

      {!iconOnly && (
        <div className="flex flex-col text-left leading-none">
          <span className={`font-extrabold tracking-tight ${getTextSize()} ${textColor} font-sans`}>
            Phish<span className="text-emerald-500">Guard</span>
          </span>
          <span className={`font-mono font-bold tracking-widest uppercase mt-0.5 ${getSubtextSize()} ${subtextColor}`}>
            Threat Intel
          </span>
        </div>
      )}
    </div>
  );
}
