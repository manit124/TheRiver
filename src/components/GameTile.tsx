'use client';

import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Dice6 } from 'lucide-react';

interface GameTileProps {
  title: string;
  description: string;
  enabled: boolean;
  onClick: () => void;
  variant?: 'texas' | 'omaha' | 'shortdeck';
}

const gameIcons = {
  texas: Sparkles,
  omaha: Zap,
  shortdeck: Dice6,
};

const gameGradients = {
  texas: 'from-indigo-500 via-purple-500 to-pink-500',
  omaha: 'from-teal-400 via-cyan-500 to-blue-500',
  shortdeck: 'from-amber-400 via-orange-500 to-red-500',
};

export function GameTile({ title, description, enabled, onClick, variant = 'texas' }: GameTileProps) {
  const Icon = gameIcons[variant] || Sparkles;
  const gradient = gameGradients[variant] || 'from-blue-500 to-purple-600';

  return (
    <motion.div
      whileHover={enabled ? { scale: 1.02 } : {}}
      whileTap={enabled ? { scale: 0.98 } : {}}
      className={`flex-shrink-0 w-[220px] h-[160px] rounded-2xl p-5 cursor-pointer transition-all relative overflow-hidden ${
        enabled ? 'hover:shadow-2xl' : 'opacity-50 cursor-not-allowed'
      }`}
      onClick={enabled ? onClick : undefined}
    >
      {/* Gradient Background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} ${
          !enabled ? 'grayscale opacity-30' : ''
        }`}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between">
        {/* Icon */}
        <div className="flex justify-center mb-2">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Title and Description */}
        <div className="text-center">
          <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
          <p className="text-white/85 text-[10px] leading-relaxed">{description}</p>
        </div>

        {/* Soon Badge */}
        {!enabled && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-[10px]">Soon</Badge>
          </div>
        )}

        {/* Subtle overlay for disabled state */}
        {!enabled && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
        )}
      </div>
    </motion.div>
  );
}
