'use client';

import { motion, AnimatePresence } from 'framer-motion';
import NumberFlow from '@number-flow/react';

interface CountdownTimerProps {
  count: number | null;
}

export function CountdownTimer({ count }: CountdownTimerProps) {
  console.log('⏱️ CountdownTimer render with count:', count);
  
  if (count === null || count <= 0) {
    return null;
  }
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={count}
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed right-6 z-[60] pointer-events-none"
      style={{ top: 'calc(50% - 120px)' }}
    >
      <div className="bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border border-white/10 rounded-xl px-6 py-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-sm font-mono">
        <div className="space-y-1">
          <p className="text-white/50 text-xs mb-1">Next round starting in</p>
          <NumberFlow
            willChange
            value={count}
            isolate
            continuous
            opacityTiming={{
              duration: 250,
              easing: 'ease-out',
            }}
            transformTiming={{
              easing: `linear(0, 0.0033 0.8%, 0.0263 2.39%, 0.0896 4.77%, 0.4676 15.12%, 0.5688, 0.6553, 0.7274, 0.7862, 0.8336 31.04%, 0.8793, 0.9132 38.99%, 0.9421 43.77%, 0.9642 49.34%, 0.9796 55.71%, 0.9893 62.87%, 0.9952 71.62%, 0.9983 82.76%, 0.9996 99.47%)`,
              duration: 500,
            }}
            className="text-5xl font-bold text-white font-mono tracking-tight"
          />
        </div>
      </div>
    </motion.div>
    </AnimatePresence>
  );
}

