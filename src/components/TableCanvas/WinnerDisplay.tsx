'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { HyperText } from '@/components/HyperText';

interface WinnerDisplayProps {
  winnerName: string;
  potAmount: number;
  isSplit?: boolean;
  winnerNames?: string[];
}

export function WinnerDisplay({ winnerName, potAmount, isSplit, winnerNames }: WinnerDisplayProps) {
  const perPlayerAmount = isSplit && winnerNames ? Math.floor(potAmount / winnerNames.length) : potAmount;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="fixed right-6 z-50 pointer-events-none"
        style={{ top: 'calc(50% + 80px)' }}
      >
        <div className="bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border border-white/10 rounded-xl px-6 py-5 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-sm font-mono">
          <div className="space-y-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
              className="text-3xl mb-1"
            >
              🏆
            </motion.div>
            <HyperText
              text={isSplit ? `${winnerName} Split!` : `${winnerName} Wins!`}
              className="text-xl font-semibold text-white tracking-tight"
              animateOnLoad={false}
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-white/60"
            >
              {isSplit ? (
                <>
                  Pot: <span className="text-white/90 font-semibold">{potAmount.toLocaleString()}</span>
                  <br />
                  <span className="text-xs text-white/50">({perPlayerAmount.toLocaleString()} each)</span>
                </>
              ) : (
                <>
                  Pot: <span className="text-white/90 font-semibold">{potAmount.toLocaleString()}</span>
                </>
              )}
            </motion.p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

