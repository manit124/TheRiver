'use client';

import { Card } from '@/types/poker';
import { CardDisplay } from './CardDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface DeckProps {
  board: Card[];
  boardXoffset?: number;
  boardYoffset?: number;
  size?: number;
  onCardDealt?: (card: Card) => void;
}

export function Deck({ 
  board, 
  boardXoffset = -300,
  boardYoffset = -250,
  size = 72,
  onCardDealt
}: DeckProps) {
  const [prevBoard, setPrevBoard] = useState<Card[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);

  // Detect when new cards are added
  useEffect(() => {
    if (board.length > prevBoard.length) {
      const newCards = board.slice(prevBoard.length);
      // Call onCardDealt for each new card
      newCards.forEach((card, index) => {
        setTimeout(() => {
          onCardDealt?.(card);
        }, index * 150);
      });
    }
    setPrevBoard([...board]);
  }, [board, prevBoard, onCardDealt]);

  // Calculate board positions (centered, with spacing - separated cards)
  const getBoardPosition = (index: number) => {
    const cardWidth = 72; // w-[72px]
    const cardSpacing = 50; // Large spacing - cards are clearly separated
    const totalWidth = board.length * cardWidth + (board.length - 1) * cardSpacing;
    const startX = -totalWidth / 2 + cardWidth / 2;
    
    return {
      x: startX + index * (cardWidth + cardSpacing),
      y: 0,
    };
  };

  // Store random rotations for each card to maintain consistency
  const cardRotations = useRef<Map<string, number>>(new Map());
  
  const getCardRotation = (cardId: string) => {
    if (!cardRotations.current.has(cardId)) {
      cardRotations.current.set(cardId, Math.random() * 20 - 10);
    }
    return cardRotations.current.get(cardId)!;
  };

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      {/* Visible Deck - Stacked face-down cards */}
      <div
        ref={deckRef}
        className="absolute pointer-events-none"
        style={{
          left: `calc(50% + ${boardXoffset}px)`,
          top: `calc(50% + ${boardYoffset}px)`,
          width: `${size}px`,
          height: `${size * 1.4}px`,
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
        }}
      >
        {/* Stacked deck visualization */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`deck-${i}`}
            className="absolute rounded-lg bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] flex items-center justify-center relative overflow-hidden"
            style={{
              width: `${size}px`,
              height: `${size * 1.4}px`,
              left: `${i * 2}px`,
              top: `${i * 2}px`,
              zIndex: 3 - i,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-60">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Animated cards with floating effect */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="popLayout">
          {board.map((card, index) => {
            const boardPos = getBoardPosition(index);
            const isNewCard = index >= prevBoard.length;
            const cardKey = `${card.id}-${index}`;
            
            // Calculate offset from deck center to board position
            const offsetX = boardXoffset - boardPos.x;
            const offsetY = boardYoffset - boardPos.y;

            return (
              <motion.div
                key={cardKey}
                initial={isNewCard ? {
                  x: offsetX,
                  y: offsetY,
                  rotate: getCardRotation(card.id),
                  scale: 0.3,
                  opacity: 0,
                } : false}
                animate={{
                  x: boardPos.x,
                  y: boardPos.y,
                  rotate: 0,
                  scale: 1,
                  opacity: 1,
                }}
                exit={{
                  x: offsetX,
                  y: offsetY,
                  rotate: getCardRotation(card.id),
                  scale: 0.3,
                  opacity: 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                  duration: 0.7,
                  delay: isNewCard ? (index - prevBoard.length) * 0.15 : 0,
                }}
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  zIndex: board.length - index,
                }}
              >
                {/* Floating animation */}
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.2,
                  }}
                >
                  <CardDisplay card={card} size="lg" />
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

