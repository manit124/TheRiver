'use client';

import { useState, useEffect } from 'react';
import { TableState } from '@/types/poker';
import { CommunityCards } from './CommunityCards';
import { ActionBar } from './ActionBar';
import { motion } from 'framer-motion';
import { CardDisplay } from './CardDisplay';
import { evaluateHand, estimateWinProbability } from '@/lib/pokerHands';
import { AnimatedPot } from './AnimatedPot';
import NumberFlow from '@number-flow/react';
import { useTableStore } from '@/store/useTableStore';

interface PokerTableProps {
  tableState: TableState;
  playerId: string;
  onBackClick?: () => void;
}

export function PokerTable({ tableState, playerId, onBackClick }: PokerTableProps) {
  const currentPlayer = tableState.players.find((p) => p.id === playerId);
  const otherPlayers = tableState.players.filter((p) => p.id !== playerId);
  const [shouldEmptyPot, setShouldEmptyPot] = useState(false);
  const [chipsAnimating, setChipsAnimating] = useState<Set<string>>(new Set());
  const winnerInfo = useTableStore((state) => state.winnerInfo);
  
  // Listen for pot:empty event from backend (emitted 4 seconds after winner is decided)
  useEffect(() => {
    const handlePotEmpty = () => {
      console.log('🎰 Triggering pot emptying animation');
      setShouldEmptyPot(true);
      // Reset after animation completes
      setTimeout(() => {
        setShouldEmptyPot(false);
      }, 1500);
    };

    window.addEventListener('potEmpty', handlePotEmpty as EventListener);
    return () => {
      window.removeEventListener('potEmpty', handlePotEmpty as EventListener);
    };
  }, []);

  // Listen for chips moving to pot animation
  useEffect(() => {
    const handleChipsToPot = (event: CustomEvent) => {
      const { playerBets } = event.detail;
      // Mark chips as animating
      const animatingIds = new Set<string>(playerBets.map((b: any) => b.playerId as string));
      setChipsAnimating(animatingIds);
      
      // Clear animation state after animation completes
      setTimeout(() => {
        setChipsAnimating(new Set());
      }, 2000); // Match the 2 second delay from server
    };

    window.addEventListener('chipsToPot', handleChipsToPot as EventListener);
    return () => {
      window.removeEventListener('chipsToPot', handleChipsToPot as EventListener);
    };
  }, []);

  // Debug logging
  console.log('🎮 PokerTable render:', {
    playerId,
    currentPlayer: currentPlayer ? {
      id: currentPlayer.id,
      name: currentPlayer.name,
      hasHoleCards: !!currentPlayer.holeCards,
      holeCardsLength: currentPlayer.holeCards?.length || 0,
      holeCards: currentPlayer.holeCards,
    } : 'NOT FOUND',
    toActPlayerId: tableState.toActPlayerId,
    isMyTurn: tableState.toActPlayerId === playerId,
  });

  // Show empty seats - max 6 seats total
  const maxSeats = 6;
  const allPlayers = [...otherPlayers];
  const emptySeats = Math.max(0, maxSeats - allPlayers.length);

  return (
    <div className="h-full poker-table flex flex-col relative">
      {/* Back Arrow */}
      {onBackClick && (
        <div className="absolute top-4 left-4 z-20">
          <button 
            onClick={onBackClick}
            className="text-white p-2 hover:text-white/80 transition-colors"
            aria-label="Leave table"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* Center - Community Cards with Players Around */}
      <div className="flex-1 flex items-center justify-center px-6 relative">
        {/* Players arranged around the center */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Top row of players with empty seats */}
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex gap-30">
            {/* Show all players */}
            {allPlayers.map((player) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: player.hasFolded ? 0.5 : 1, 
                  scale: 1
                }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                <div className="relative">
                  {/* Avatar */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl overflow-hidden ${
                    player.connected ? 'opacity-100' : 'opacity-40'
                  }`}>
                    {player.avatar && player.avatar.startsWith('/') ? (
                      <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{player.avatar}</span>
                    )}
                  </div>
                  {/* Dealer badge */}
                  {player.isDealer && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center text-xs font-bold text-[#ffd54a] border border-[#ffd54a]/50 shadow-[0_0_12px_rgba(255,213,74,0.4)]">
                      D
                    </div>
                  )}
                </div>
                <div className="mt-1 text-center">
                  <p className={`text-xs truncate max-w-[80px] font-mono ${player.hasFolded ? 'text-gray-500' : 'text-white'}`}>
                    {player.name}
                  </p>
                  <p className={`text-xs font-semibold font-mono ${player.hasFolded ? 'text-gray-500' : 'text-white'}`}>
                    {player.stack}
                  </p>
                </div>
                {/* Player's cards below avatar - show face-up at showdown if not folded */}
                <div className="flex gap-1 mt-2 justify-center">
                  {player.holeCards && player.holeCards.length > 0 ? (
                    player.holeCards.map((card, cardIdx) => {
                      // Show cards face-up if: at showdown AND player hasn't folded
                      // Folded players' cards always stay face-down
                      const shouldReveal = tableState.street === 'showdown' && !player.hasFolded;
                      
                      return (
                        <motion.div
                          key={card.id}
                          initial={{ y: 0, opacity: 1, rotateY: shouldReveal ? 180 : 0 }}
                          animate={player.hasFolded ? { 
                            opacity: 0.3,
                            rotateY: 0, // Keep face-down if folded
                          } : { 
                            y: 0, 
                            opacity: 1,
                            rotateY: shouldReveal ? 0 : 180, // Flip to face-up at showdown
                            scale: 1
                          }}
                          transition={{ 
                            duration: 0.5, 
                            delay: cardIdx * 0.1,
                            ease: "easeOut"
                          }}
                          className="relative"
                        >
                          <CardDisplay 
                            card={card} 
                            faceDown={!shouldReveal || player.hasFolded} 
                            size="sm" 
                          />
                        </motion.div>
                      );
                    })
                  ) : (
                    // Show empty card placeholders when no cards
                    Array.from({ length: 2 }).map((_, i) => (
                      <div
                        key={`empty-card-${i}`}
                        className="w-14 h-20 rounded-2xl bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border-2 border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] flex items-center justify-center relative overflow-hidden"
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                              <div className="w-4 h-4 rounded-full bg-white/10"></div>
                            </div>
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 to-blue-900/10"></div>
                      </div>
                    ))
                  )}
                </div>
                {/* Current Bet Indicator - Small circle beneath cards */}
                {(player.currentBet || 0) > 0 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={chipsAnimating.has(player.id) ? {
                      scale: 0,
                      opacity: 0,
                      x: 0,
                      y: -100,
                    } : {
                      scale: 1,
                      opacity: 1,
                      x: 0,
                      y: 0,
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={chipsAnimating.has(player.id) ? {
                      duration: 1.5,
                      ease: "easeInOut"
                    } : {
                      duration: 0.3
                    }}
                    className="mt-1 w-6 h-6 rounded-full bg-gradient-to-br from-[#ffd54a]/20 via-[#ffd54a]/30 to-[#ffd54a]/20 border border-[#ffd54a]/50 flex items-center justify-center shadow-[0_0_8px_rgba(255,213,74,0.3)]"
                  >
                    <span className="text-[#ffd54a] text-[10px] font-bold font-mono leading-none">
                      {player.currentBet}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            ))}
            {/* Empty seats - show when there are empty slots */}
            {Array.from({ length: emptySeats }).map((_, idx) => (
              <motion.div
                key={`empty-${idx}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.6, scale: 1 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border-2 border-dashed border-white/20 flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.05)]">
                  <span className="text-white/40 text-xl font-bold">+</span>
                </div>
                <div className="mt-1 text-center">
                  <p className="text-xs text-white/40 font-mono">Empty</p>
                </div>
                {/* Empty card placeholders */}
                <div className="flex gap-1 mt-2 justify-center">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div
                      key={`empty-seat-card-${i}`}
                      className="w-14 h-20 rounded-2xl bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border-2 border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] flex items-center justify-center relative overflow-hidden opacity-30"
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                            <div className="w-4 h-4 rounded-full bg-white/10"></div>
                          </div>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 to-blue-900/10"></div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Community Cards in Center - Separated with Pot to the right */}
        <div className="flex items-center justify-center gap-4 relative z-10" style={{ marginTop: '160px' }}>
          <CommunityCards cards={tableState.community} street={tableState.street} />
          {/* Pot Display - To the right of cards with animation */}
          <AnimatedPot 
            value={tableState.pot} 
            emptyPot={shouldEmptyPot} 
          />
        </div>
      </div>

      {/* Action Bar - Centered Below Cards */}
      <div className="w-full px-4 pb-4">
        <ActionBar tableState={tableState} playerId={playerId} />
      </div>

      {/* Bottom Section - User's Cards and Info */}
      <div className="w-full px-4 pb-6 flex items-end justify-end">
        <div className="flex items-end gap-6 mr-20">
           {/* User's Hole Cards - Bottom Right, Face Up (visible to player) */}
           <div className="flex flex-col items-center gap-2 mb-12">
             {/* Current Bet Indicator for current player - above cards */}
             {currentPlayer && (currentPlayer.currentBet || 0) > 0 && (
               <motion.div
                 initial={{ scale: 0, opacity: 0 }}
                 animate={chipsAnimating.has(currentPlayer.id) ? {
                   scale: 0,
                   opacity: 0,
                   x: 0,
                   y: -150,
                 } : {
                   scale: 1,
                   opacity: 1,
                   x: 0,
                   y: 0,
                 }}
                 exit={{ scale: 0, opacity: 0 }}
                 transition={chipsAnimating.has(currentPlayer.id) ? {
                   duration: 1.5,
                   ease: "easeInOut"
                 } : {
                   duration: 0.3
                 }}
                 className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ffd54a]/20 via-[#ffd54a]/30 to-[#ffd54a]/20 border border-[#ffd54a]/50 flex items-center justify-center shadow-[0_0_8px_rgba(255,213,74,0.3)]"
               >
                 <span className="text-[#ffd54a] text-[10px] font-bold font-mono leading-none">
                   {currentPlayer.currentBet}
                 </span>
               </motion.div>
             )}
             <div className="flex gap-4">
               {currentPlayer?.holeCards && currentPlayer.holeCards.length > 0 ? (
                 // Show face-up cards (visible to the player) with fold animation
                 currentPlayer.holeCards.map((card, index) => (
                   <motion.div
                     key={card.id}
                     initial={{ y: 0, opacity: 1, scale: 1 }}
                     animate={currentPlayer.hasFolded ? {
                       y: -150,
                       opacity: 0,
                       rotateY: 180,
                       scale: 0.5
                     } : {
                       y: 0,
                       opacity: 1,
                       rotateY: 0,
                       scale: 1
                     }}
                     transition={{
                       duration: 0.6,
                       delay: index * 0.1,
                       ease: "easeIn"
                     }}
                   >
                     <CardDisplay card={card} faceDown={false} size="lg" />
                   </motion.div>
                 ))
               ) : (
                 // Show 2 face-down placeholder cards when waiting
                 Array.from({ length: 2 }).map((_, i) => (
                   <div key={`hole-${i}`}>
                     <CardDisplay 
                       card={{ rank: 'A', suit: '♠', id: `placeholder-${i}` }} 
                       faceDown={true} 
                       size="lg" 
                     />
                   </div>
                 ))
               )}
             </div>
           </div>

          {/* User's Info Box - Always show stack, hand, and win probability */}
          {currentPlayer && (() => {
            const handResult = currentPlayer.holeCards && currentPlayer.holeCards.length > 0 && tableState.community.length > 0
              ? evaluateHand(currentPlayer.holeCards, tableState.community)
              : null;
            const winProb = handResult 
              ? estimateWinProbability(handResult, tableState.street, tableState.players.filter(p => !p.hasFolded).length)
              : null;
            
            return (
              <div className={`bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border rounded-2xl p-3 shadow-[0_0_30px_rgba(255,255,255,0.05)] font-mono mb-12 w-36 min-h-[180px] ${
                tableState.toActPlayerId === playerId 
                  ? 'border-[#ffd54a]/50 shadow-[0_0_20px_rgba(255,213,74,0.3)]' 
                  : 'border-white/10'
              }`}>
                <div className="flex flex-col gap-2 h-full">
                  {/* Avatar/Emoji */}
                  <div className="flex justify-center mb-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-white/5 border border-white/10">
                      {currentPlayer.avatar && currentPlayer.avatar.startsWith('/') ? (
                        <img src={currentPlayer.avatar} alt={currentPlayer.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span>{currentPlayer.avatar}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Stack - Always shown with NumberFlow animation */}
                  <div>
                    <p className="text-xs text-white/60 mb-0.5 font-mono">Stack</p>
                    <NumberFlow
                      willChange
                      value={currentPlayer.stack}
                      isolate
                      opacityTiming={{ duration: 250, easing: 'ease-out' }}
                      transformTiming={{
                        easing: `linear(0, 0.0033 0.8%, 0.0263 2.39%, 0.0896 4.77%, 0.4676 15.12%, 0.5688, 0.6553, 0.7274, 0.7862, 0.8336 31.04%, 0.8793, 0.9132 38.99%, 0.9421 43.77%, 0.9642 49.34%, 0.9796 55.71%, 0.9893 62.87%, 0.9952 71.62%, 0.9983 82.76%, 0.9996 99.47%)`,
                        duration: 500,
                      }}
                      className="text-sm font-semibold text-white font-mono"
                    />
                  </div>
                  
                  <div className="h-px bg-white/10 my-1" />
                  
                  {/* Hand - Always shown */}
                  <div>
                    <p className="text-xs text-white/60 mb-0.5 font-mono">Hand</p>
                    <p className="text-xs font-semibold text-white font-mono leading-tight">
                      {handResult ? handResult.rank : '—'}
                    </p>
                  </div>
                  
                  <div className="h-px bg-white/10 my-1" />
                  
                  {/* Win Probability - Always shown */}
                  <div>
                    <p className="text-xs text-white/60 mb-0.5 font-mono">Win %</p>
                    <p className="text-sm font-semibold text-[#ffd54a] font-mono">
                      {winProb !== null ? `${winProb}%` : '—'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
