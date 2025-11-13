"use client";

import { cn } from "@/lib/utils";

interface CasinoBackgroundProps {
  className?: string;
}

export function CasinoBackground({ className }: CasinoBackgroundProps) {
  // 12 chips with specific colors and suits
  const chips = [
    { color: "yellow", suit: "diamond", symbol: "♦" },
    { color: "blue", suit: "club", symbol: "♣" },
    { color: "green", suit: "heart", symbol: "♥" },
    { color: "purple", suit: "diamond", symbol: "♦" },
    { color: "yellow", suit: "spade", symbol: "♠" },
    { color: "blue", suit: "club", symbol: "♣" },
    { color: "green", suit: "heart", symbol: "♥" },
    { color: "purple", suit: "diamond", symbol: "♦" },
    { color: "yellow", suit: "heart", symbol: "♥" },
    { color: "red", suit: "club", symbol: "♣" },
    { color: "green", suit: "spade", symbol: "♠" },
    { color: "red", suit: "heart", symbol: "♥" },
  ];

  const colorMap = {
    yellow: {
      bg: "bg-gradient-to-br from-amber-500/20 via-yellow-500/15 to-amber-600/20",
      border: "border-amber-400/40",
      symbol: "text-amber-300/90",
      glow: "shadow-[0_0_20px_rgba(251,191,36,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]",
    },
    blue: {
      bg: "bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-cyan-600/20",
      border: "border-cyan-400/40",
      symbol: "text-cyan-300/90",
      glow: "shadow-[0_0_20px_rgba(34,211,238,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]",
    },
    green: {
      bg: "bg-gradient-to-br from-emerald-500/20 via-green-500/15 to-emerald-600/20",
      border: "border-emerald-400/40",
      symbol: "text-emerald-300/90",
      glow: "shadow-[0_0_20px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]",
    },
    purple: {
      bg: "bg-gradient-to-br from-violet-500/20 via-purple-500/15 to-violet-600/20",
      border: "border-violet-400/40",
      symbol: "text-violet-300/90",
      glow: "shadow-[0_0_20px_rgba(167,139,250,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]",
    },
    red: {
      bg: "bg-gradient-to-br from-rose-500/20 via-red-500/15 to-rose-600/20",
      border: "border-rose-400/40",
      symbol: "text-rose-300/90",
      glow: "shadow-[0_0_20px_rgba(244,63,94,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]",
    },
  };

  return (
    <div
      className={cn(
        "relative w-full h-full overflow-hidden bg-gradient-to-br from-black via-gray-950 to-black",
        className
      )}
    >
      {/* Subtle atmospheric background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-gray-900/10 via-gray-950/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-radial from-amber-950/5 via-transparent to-transparent rounded-full blur-2xl" />
      </div>

      {/* Central Ace of Spades - Premium minimal design */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="relative w-28 h-36">
          {/* Premium card with subtle metallic finish */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl border border-amber-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(251,191,36,0.1),inset_0_1px_0_rgba(255,255,255,0.05)]" />
          
          {/* Subtle inner highlight */}
          <div className="absolute inset-[1px] bg-gradient-to-br from-transparent via-white/5 to-transparent rounded-xl" />
          
          {/* Top-left A - Elegant typography */}
          <div className="absolute top-4 left-4 text-amber-400/80 text-xl font-light tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            A
          </div>
          
          {/* Bottom-right A */}
          <div className="absolute bottom-4 right-4 text-amber-400/80 text-xl font-light tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] rotate-180">
            A
          </div>
          
          {/* Large spade symbol - Refined and elegant */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-400/70 text-6xl font-light drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
            ♠
          </div>
        </div>
      </div>

      {/* 12 Poker Chips - Premium minimal design */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        {chips.map((chip, i) => {
          const angle = (i * 360) / 12;
          const radius = 110;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;
          const colors = colorMap[chip.color as keyof typeof colorMap];

          return (
            <div
              key={i}
              className="absolute w-16 h-16"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Premium chip with subtle depth */}
              <div
                className={cn(
                  "w-full h-full rounded-full border border-white/10 flex items-center justify-center relative backdrop-blur-sm",
                  colors.bg,
                  colors.glow
                )}
              >
                {/* Inner metallic ring */}
                <div className="absolute inset-2 rounded-full border border-white/20 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                
                {/* Outer subtle border */}
                <div className={cn(
                  "absolute -inset-[1px] rounded-full border opacity-30",
                  colors.border
                )} />
                
                {/* Suit symbol - Elegant and refined */}
                <span className={cn(
                  "relative z-10 text-2xl font-light tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]",
                  colors.symbol
                )}>
                  {chip.symbol}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
