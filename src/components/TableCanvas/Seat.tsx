'use client';

import { Player } from '@/types/poker';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PlayerHoleCards } from './PlayerHoleCards';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SeatProps {
  player: Player | null;
  seatNumber: number;
  isActive: boolean;
  isCurrentPlayer: boolean;
}

export function Seat({ player, seatNumber, isActive, isCurrentPlayer }: SeatProps) {
  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-gray-900/30 border-2 border-dashed border-gray-700">
        <div className="text-2xl text-gray-600 mb-2">+</div>
        <div className="text-xs text-gray-500">Seat {seatNumber}</div>
      </div>
    );
  }

  return (
    <motion.div
      className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
        isCurrentPlayer ? 'bg-accent/20 border-2 border-accent' : 'bg-gray-900/50 border-2 border-gray-800'
      } ${isActive ? 'ring-2 ring-accent' : ''}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-accent/20 text-accent font-bold">{player.avatar}</AvatarFallback>
        </Avatar>
        {player.connected && (
          <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-gray-900" />
        )}
        {player.isDealer && (
          <Badge className="absolute -top-2 -right-2 bg-accent text-gray-900 font-bold h-6 w-6 rounded-full flex items-center justify-center p-0">
            D
          </Badge>
        )}
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold">{player.name}</div>
        <div className="text-xs font-mono text-gray-400">{formatCurrency(player.stack)}</div>
      </div>
      {player.holeCards && player.holeCards.length > 0 && (
        <PlayerHoleCards cards={player.holeCards} isRevealed={false} />
      )}
      {player.hasFolded && (
        <Badge variant="destructive" className="text-xs">
          Folded
        </Badge>
      )}
    </motion.div>
  );
}

