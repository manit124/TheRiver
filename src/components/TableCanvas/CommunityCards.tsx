'use client';

import { Card } from '@/types/poker';
import { CardDisplay } from './CardDisplay';
import { motion } from 'framer-motion';

interface CommunityCardsProps {
  cards: Card[];
  street: string;
}

export function CommunityCards({ cards, street }: CommunityCardsProps) {
  const cardsToShow = street === 'preflop' ? 0 : street === 'flop' ? 3 : street === 'turn' ? 4 : 5;

  return (
    <div className="flex items-center justify-center gap-4">
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < cardsToShow && cards[i]) {
          // Face-up card
          return (
            <motion.div
              key={cards[i].id}
              initial={{ rotateY: 180, scale: 0.8, opacity: 0 }}
              animate={{ 
                rotateY: 0, 
                scale: 1, 
                opacity: 1,
                y: [0, -8, 0],
              }}
              transition={{
                delay: i * 0.15,
                duration: 0.7,
                ease: [0.25, 0.1, 0.25, 1],
                y: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2,
                },
              }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <CardDisplay card={cards[i]} size="lg" />
            </motion.div>
          );
        } else {
          // Face-down card (not yet revealed)
          return (
            <motion.div
              key={`facedown-${i}`}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: 1,
                y: [0, -8, 0],
              }}
              transition={{
                opacity: { delay: 0.1 },
                y: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2,
                },
              }}
            >
              <CardDisplay 
                card={{ rank: 'A', suit: '♠', id: `placeholder-${i}` }} 
                faceDown={true} 
                size="lg" 
              />
            </motion.div>
          );
        }
      })}
    </div>
  );
}
