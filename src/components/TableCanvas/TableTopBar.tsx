'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Volume2, VolumeX, Coins, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTableStore } from '@/store/useTableStore';
import PillMorphTabs, { PillTab } from '@/components/ui/pill-morph-tabs';

interface TableTopBarProps {
  roomCode: string;
}

export function TableTopBar({ roomCode }: TableTopBarProps) {
  const router = useRouter();
  const isConnected = useTableStore((state) => state.isConnected);
  const playerId = useTableStore((state) => state.playerId);
  const tableState = useTableStore((state) => state.state);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const playerCount = tableState?.players.length || 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show "Connected" only when socket is connected AND player has received their ID (fully joined)
  const isFullyConnected = isConnected && playerId && tableState;
  const connectionStatus = isFullyConnected ? 'green' : 'yellow';

  const tabs: PillTab[] = [
    {
      value: 'room',
      label: (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="font-mono font-semibold">{roomCode}</span>
          <div 
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }} 
            className="h-5 w-5 flex items-center justify-center hover:bg-white/10 rounded transition-colors cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                handleCopy();
              }
            }}
          >
            <Copy className="h-3 w-3" />
            <span className="sr-only">Copy room code</span>
          </div>
          {copied && <span className="text-xs text-accent">Copied!</span>}
        </div>
      ),
    },
    {
      value: 'status',
      label: (
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              connectionStatus === 'green' 
                ? 'bg-green-500 border border-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
                : connectionStatus === 'yellow' 
                ? 'bg-[#ffd54a] border border-[#ffd54a] shadow-[0_0_8px_rgba(255,213,74,0.6)] animate-pulse' 
                : 'bg-red-500 border border-red-400'
            }`}
            aria-label={`Connection status: ${connectionStatus}`}
          />
          <span className="text-xs">
            {isFullyConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      ),
    },
    {
      value: 'bankroll',
      label: (
        <div className="flex items-center gap-1">
          <Coins className="h-3 w-3" />
          <span>Bankroll</span>
        </div>
      ),
    },
    {
      value: 'sound',
      label: (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setSoundEnabled(!soundEnabled);
          }}
          className="flex items-center gap-1 cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setSoundEnabled(!soundEnabled);
            }
          }}
          aria-label={soundEnabled ? 'Disable sound' : 'Enable sound'}
        >
          {soundEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
          <span>Sound</span>
        </div>
      ),
    },
  ];

  const handleTabChange = (value: string) => {
    // Handle tab changes if needed
  };

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex-1 flex justify-center">
        <div className="px-10">
          <PillMorphTabs
            items={tabs}
            defaultValue="room"
            onValueChange={handleTabChange}
            className="max-w-fit"
          />
        </div>
      </div>
      {/* Player Count - Top Right */}
      {tableState && (() => {
        const readyPlayers = tableState.players.filter(p => p.stack > 0).length;
        const totalPlayers = tableState.players.length;
        const hasDecidingPlayers = readyPlayers < totalPlayers;
        
        return (
          <div className="absolute top-4 right-4 bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-xs font-mono">Players</span>
              {hasDecidingPlayers ? (
                <span className="text-[#ffd54a] font-mono font-semibold">
                  {readyPlayers}/{totalPlayers}
                </span>
              ) : (
                <span className="text-[#ffd54a] font-mono font-semibold">{totalPlayers}</span>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

