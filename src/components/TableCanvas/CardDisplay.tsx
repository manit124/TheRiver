'use client';

import { Card } from '@/types/poker';
import { SuitIcon } from '@/components/icons/suits';
import { motion } from 'framer-motion';

interface CardDisplayProps {
  card: Card;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CardDisplay({ card, faceDown = false, size = 'md' }: CardDisplayProps) {
  const sizeClasses = {
    sm: 'w-14 h-20 text-xs',
    md: 'w-16 h-24 text-base',
    lg: 'w-[72px] h-[100px] text-lg',
  };

  if (faceDown) {
    return (
      <motion.div
        className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border-2 border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] flex items-center justify-center relative overflow-hidden`}
        initial={{ rotateY: 0 }}
        animate={{ rotateY: 0 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Face-down card pattern */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <div className="w-4 h-4 rounded-full bg-white/10"></div>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 to-blue-900/10"></div>
      </motion.div>
    );
  }

  const isRed = card.suit === '♥' || card.suit === '♦';
  const suitColor = isRed ? 'text-red-400' : 'text-white';
  const rankColor = isRed ? 'text-red-400' : 'text-white';

  return (
    <motion.div
      className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.4),0_0_20px_rgba(255,255,255,0.1)] flex flex-col justify-between relative overflow-hidden`}
      initial={{ rotateY: 180, scale: 0.8, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Top left corner */}
      <div className={`font-bold ${rankColor} text-left leading-tight absolute top-0 left-0 p-2.5`}>
        <div className="text-lg font-black">{card.rank}</div>
        <div className="text-xs -mt-0.5">
          <SuitIcon suit={card.suit} />
        </div>
      </div>
      
      {/* Center suit */}
      <div className={`${suitColor} text-center flex-1 flex items-center justify-center`}>
        <div className={`${size === 'lg' ? 'text-5xl' : size === 'md' ? 'text-4xl' : 'text-3xl'}`}>
          <SuitIcon suit={card.suit} />
        </div>
      </div>
      
      {/* Bottom right corner (inverted) */}
      <div className={`font-bold ${rankColor} text-right leading-tight transform rotate-180 absolute bottom-0 right-0 p-2.5`}>
        <div className="text-lg font-black">{card.rank}</div>
        <div className="text-xs -mt-0.5">
          <SuitIcon suit={card.suit} />
        </div>
      </div>
    </motion.div>
  );
}
