'use client';

import { useRouter } from 'next/navigation';
import { JoinByCodeDialog } from '@/components/JoinByCodeDialog';
import { QuickPlayDialog } from '@/components/QuickPlayDialog';
import { PokerModeGrid } from '@/components/PokerModeGrid';
import { AnimatedText } from '@/components/AnimatedText';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { TexasHoldemRulesDialog } from '@/components/TexasHoldemRulesDialog';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Mode } from '@/data/modes';

export default function Home() {
  const router = useRouter();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [quickPlayDialogOpen, setQuickPlayDialogOpen] = useState(false);
  const [texasRulesDialogOpen, setTexasRulesDialogOpen] = useState(false);

  const handleModeClick = (mode: Mode) => {
    if (mode.id === 'texas') {
      // Show rules dialog for Texas Hold'em
      setTexasRulesDialogOpen(true);
    } else if (mode.route) {
      // Navigate normally for other modes
      router.push(mode.route);
    }
  };

  return (
    <div className="relative min-h-screen">
        {/* Title Section - Centered */}
        <div id="home" className="h-screen flex items-center justify-center">
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
        <div id="gamemodes" className="min-h-screen flex flex-col items-center justify-center px-1 py-3 relative">
          <PokerModeGrid onModeClick={handleModeClick} />
          
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
        <TexasHoldemRulesDialog open={texasRulesDialogOpen} onOpenChange={setTexasRulesDialogOpen} />
    </div>
  );
}
