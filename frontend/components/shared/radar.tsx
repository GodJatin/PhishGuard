'use client';

import React from 'react';
import { Target, Shield, AlertTriangle, ShieldAlert } from 'lucide-react';

interface RadarNode {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  label: string;
  type: 'safe' | 'suspicious' | 'dangerous';
  delay: string;
}

export default function ThreatIntelligenceRadar({ className = '' }: { className?: string }) {
  const radarNodes: RadarNode[] = [
    { id: 1, x: 75, y: 32, size: 5, color: '#ef4444', label: 'CRED_THEFT_FLG', type: 'dangerous', delay: '0s' },
    { id: 2, x: 28, y: 44, size: 4, color: '#f59e0b', label: 'HOMOGLYPH_WARN', type: 'suspicious', delay: '1.2s' },
    { id: 3, x: 42, y: 72, size: 6, color: '#ef4444', label: 'FIN_FRAUD_VEC', type: 'dangerous', delay: '0.6s' },
    { id: 4, x: 62, y: 68, size: 4.5, color: '#10b981', label: 'SAFE_HOST_VLD', type: 'safe', delay: '2s' },
    { id: 5, x: 34, y: 22, size: 3.5, color: '#06b6d4', label: 'REDIRECT_STAT', type: 'safe', delay: '1.5s' }
  ];

  return (
    <div className={`relative flex flex-col items-center justify-center p-6 border border-white/10 bg-[#111215]/80 rounded-2xl shadow-2xl backdrop-blur-xl max-w-md w-full mx-auto select-none ${className}`}>
      
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-500/40 rounded-tl" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-500/40 rounded-tr" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-500/40 rounded-bl" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-500/40 rounded-br" />

      {/* Header bar */}
      <div className="w-full flex items-center justify-between border-b border-white/5 pb-3 mb-4 font-mono text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
          <Target className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
          Intel Radar (Active Sweep)
        </span>
        <span className="bg-emerald-500/10 px-2 py-0.5 rounded text-[8px] font-bold text-emerald-500 border border-emerald-500/20 uppercase tracking-widest animate-pulse">
          Online
        </span>
      </div>

      {/* Radar SVG Area */}
      <div className="relative w-full aspect-square overflow-hidden bg-black/60 rounded-full border border-white/10 p-2 max-w-[280px] sm:max-w-[320px]">
        {/* Ambient Grid overlay */}
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
        >
          {/* Concentric rings */}
          <circle cx="50" cy="50" r="48" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="1" fill="none" />
          <circle cx="50" cy="50" r="38" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="1" fill="none" />
          <circle cx="50" cy="50" r="28" stroke="rgba(16, 185, 129, 0.18)" strokeWidth="1" fill="none" />
          <circle cx="50" cy="50" r="18" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="0.8" strokeDasharray="2 3" fill="none" />
          <circle cx="50" cy="50" r="8" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="0.8" fill="none" />

          {/* Radar axis lines */}
          <line x1="50" y1="2" x2="50" y2="98" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="0.8" />
          <line x1="2" y1="50" x2="98" y2="50" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="0.8" />
          <line x1="16" y1="16" x2="84" y2="84" stroke="rgba(16, 185, 129, 0.08)" strokeWidth="0.6" strokeDasharray="4 4" />
          <line x1="84" y1="16" x2="16" y2="84" stroke="rgba(16, 185, 129, 0.08)" strokeWidth="0.6" strokeDasharray="4 4" />

          {/* Compass labels */}
          <text x="50" y="7" fill="rgba(16, 185, 129, 0.4)" fontSize="3" textAnchor="middle" fontFamily="monospace">N</text>
          <text x="94" y="51.5" fill="rgba(16, 185, 129, 0.4)" fontSize="3" textAnchor="middle" fontFamily="monospace">E</text>
          <text x="50" y="96.5" fill="rgba(16, 185, 129, 0.4)" fontSize="3" textAnchor="middle" fontFamily="monospace">S</text>
          <text x="6" y="51.5" fill="rgba(16, 185, 129, 0.4)" fontSize="3" textAnchor="middle" fontFamily="monospace">W</text>

          {/* Radar Sweep - CSS Rotated */}
          <g style={{ transformOrigin: '50px 50px', animation: 'radar-sweep 6s linear infinite' }}>
            <line x1="50" y1="50" x2="50" y2="2" stroke="rgba(16, 185, 129, 0.75)" strokeWidth="1.2" strokeLinecap="round" />
            {/* Soft gradient tail */}
            <path d="M50 50 L50 2 A48 48 0 0 1 84 16 Z" fill="rgba(16, 185, 129, 0.08)" />
          </g>

          {/* Threat Target Nodes */}
          {radarNodes.map((node) => (
            <g key={node.id}>
              {/* Outer pulsing ring */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.size * 1.8}
                fill="none"
                stroke={node.color}
                strokeWidth="0.5"
                opacity="0.6"
                className="animate-ping"
                style={{
                  animationDuration: '2.5s',
                  animationDelay: node.delay,
                  transformOrigin: `${node.x}px ${node.y}px`
                }}
              />
              {/* Inner core dot */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.size / 2}
                fill={node.color}
                className="animate-pulse"
                style={{
                  animationDuration: '2s',
                  animationDelay: node.delay
                }}
              />
              {/* Micro text coordinates */}
              <text 
                x={node.x + 3} 
                y={node.y - 1} 
                fill={node.color} 
                fontSize="2" 
                fontFamily="monospace"
                opacity="0.8"
                className="font-bold"
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Threat List Ticker overlay */}
      <div className="w-full mt-4 bg-black/40 border border-white/5 p-3 rounded-lg font-mono text-[9px] space-y-1.5 text-left">
        <div className="flex items-center justify-between text-muted-foreground/60 border-b border-white/5 pb-1">
          <span>VECTOR TARGET</span>
          <span>STATUS</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center text-red-400">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-red-500 shrink-0" />
              FIN_FRAUD_VEC
            </span>
            <span className="font-bold">DANGEROUS (92)</span>
          </div>
          <div className="flex justify-between items-center text-amber-500">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              HOMOGLYPH_WARN
            </span>
            <span className="font-bold">SUSPICIOUS (58)</span>
          </div>
          <div className="flex justify-between items-center text-green-400">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-500 shrink-0" />
              SAFE_HOST_VLD
            </span>
            <span className="font-bold">SAFE (0)</span>
          </div>
        </div>
      </div>
      
      {/* CSS Animation injection to keep globals clean */}
      <style jsx global>{`
        @keyframes radar-sweep {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
