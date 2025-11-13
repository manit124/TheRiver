'use client';

import { Card } from '@/types/poker';
import { CardDisplay } from './CardDisplay';
import { motion } from 'framer-motion';

interface PlayerHoleCardsProps {
  cards?: Card[];
  isRevealed?: boolean;
}

export function PlayerHoleCards({ cards, isRevealed = false }: PlayerHoleCardsProps) {
  if (!cards || cards.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-1">
      {cards.map((card, i) => (
        <motion.div
          key={card.id}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <CardDisplay card={card} faceDown={!isRevealed} size="sm" />
        </motion.div>
      ))}
    </div>
  );
}

