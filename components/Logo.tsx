import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  light?: boolean;
  onAdminTrigger?: () => void;
}

export default function Logo({ className = "", iconOnly = false, light = false, onAdminTrigger }: LogoProps) {
  const [tapCount, setTapCount] = React.useState(0);

  const handleTap = () => {
    if (!onAdminTrigger) return;
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount === 4) {
      onAdminTrigger();
      setTapCount(0);
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div 
        className="w-8 h-8 relative cursor-pointer select-none"
        onClick={handleTap}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Top Piece of C */}
          <path
            d="M 75,25 A 35,35 0 0,0 30,18"
            fill="none"
            stroke="#6B21A8"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Left Piece of C */}
          <path
            d="M 22,30 A 35,35 0 0,0 22,70"
            fill="none"
            stroke="#1E3A8A"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Bottom Piece of C */}
          <path
            d="M 30,82 A 35,35 0 0,0 75,75"
            fill="none"
            stroke="#059669"
            strokeWidth="14"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {!iconOnly && (
        <span className={`text-2xl font-sans font-semibold tracking-tight -ml-1.5 ${light ? 'text-white' : 'text-ink'}`}>
          odeInsight
        </span>
      )}
    </div>
  );
}
