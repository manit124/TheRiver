'use client';

import { useRouter } from 'next/navigation';
import { JoinByCodeDialog } from '@/components/JoinByCodeDialog';
import { QuickPlayDialog } from '@/components/QuickPlayDialog';
import { PokerModeGrid } from '@/components/PokerModeGrid';
import { AnimatedText } from '@/components/AnimatedText';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [quickPlayDialogOpen, setQuickPlayDialogOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
        {/* Title Section - Centered */}
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <AnimatedText
              text="TheRiver"
              fontSize={80}
              minWeight={0}
              maxWeight={840}
              animationDuration={1.5}
              delayMultiplier={0.25}
            />
          </div>
        </div>

        {/* Poker Mode Grid - Below the fold */}
        <div className="min-h-screen flex flex-col items-center justify-center px-1 py-3 relative">
          <PokerModeGrid />
          
          {/* Action Buttons - Close to carousel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-32 justify-center items-center absolute bottom-20"
          >
            <InteractiveHoverButton
              onClick={() => setQuickPlayDialogOpen(true)}
              text="Quick Play"
            />
            <InteractiveHoverButton
              onClick={() => router.push('/lobby')}
              text="Create Table"
            />
            <InteractiveHoverButton
              onClick={() => setJoinDialogOpen(true)}
              text="Join by Code"
            />
          </motion.div>
        </div>

        <JoinByCodeDialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen} />
        <QuickPlayDialog open={quickPlayDialogOpen} onOpenChange={setQuickPlayDialogOpen} />
    </div>
  );
}
