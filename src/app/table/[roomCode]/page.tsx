'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTableStore } from '@/store/useTableStore';
import { PokerTable } from '@/components/TableCanvas/PokerTable';
import { TableTopBar } from '@/components/TableCanvas/TableTopBar';
import { TableState } from '@/types/poker';
import { Button } from '@/components/ui/button';
import { Card as UICard, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';
import { HyperText } from '@/components/HyperText';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { ArrowLeft } from 'lucide-react';
import { LeaveTableDialog } from '@/components/LeaveTableDialog';
import { RebuyDialog } from '@/components/RebuyDialog';
import { WinnerDisplay } from '@/components/TableCanvas/WinnerDisplay';
import { CountdownTimer } from '@/components/TableCanvas/CountdownTimer';


export default function TablePage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  const [playerName, setPlayerName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [rebuyDialogOpen, setRebuyDialogOpen] = useState(false);

  const state = useTableStore((state) => state.state);
  const playerId = useTableStore((state) => state.playerId);
  const isConnected = useTableStore((state) => state.isConnected);
  const connect = useTableStore((state) => state.connect);
  const disconnect = useTableStore((state) => state.disconnect);
  const rebuy = useTableStore((state) => state.rebuy);
  const winnerInfo = useTableStore((state) => state.winnerInfo);
  const countdown = useTableStore((state) => state.countdown);

  // Debug countdown changes
  useEffect(() => {
    console.log('⏱️ Countdown value changed in page:', countdown);
  }, [countdown]);

  // Debug logging
  useEffect(() => {
    if (state) {
      console.log('Table state updated:', {
        players: state.players.length,
        street: state.street,
        pot: state.pot,
        toActPlayerId: state.toActPlayerId,
        communityCards: state.community.length,
      });
    }
  }, [state]);

  const handleJoin = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    console.log('🔵 Join button clicked, connecting...', { roomCode, playerName });
    setHasJoined(true);
    connect(roomCode, playerName);
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const currentState = state; // Only use real state from socket, no demo state
  const currentPlayerId = playerId;

  // Listen for custom event to show rebuy dialog after hand ends and pot is distributed
  // Only show rebuy dialog if player still has 0 stack AFTER the winner gets the pot
  useEffect(() => {
    const handleShowRebuy = () => {
      // Double-check that player still has 0 stack before showing dialog
      const currentPlayer = currentState?.players.find((p) => p.id === currentPlayerId);
      const hasZeroStack = currentPlayer && currentPlayer.stack === 0;
      
      // Only show if player has 0 stack and dialog is not already open
      if (hasZeroStack && !rebuyDialogOpen) {
        console.log('💸 Showing rebuy dialog - player has 0 stack after hand ended');
        setRebuyDialogOpen(true);
      }
    };
    
    window.addEventListener('showRebuyDialog', handleShowRebuy);
    return () => {
      window.removeEventListener('showRebuyDialog', handleShowRebuy);
    };
  }, [currentState, currentPlayerId, rebuyDialogOpen]);

  const handleRebuy = () => {
    rebuy();
  };

  // Show join form if not joined yet
  if (!hasJoined || !playerId) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <UICard className="bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] font-mono">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <HyperText
                  text="Join Table"
                  className="text-2xl font-semibold text-white tracking-tight"
                  animateOnLoad={false}
                />
              </div>
              <CardDescription className="text-white/60">Enter your name to join {roomCode}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="playerName" className="text-white/90">Your Name</Label>
                <Input
                  id="playerName"
                  type="text"
                  placeholder="Your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0 focus-visible:outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-0">
                <InteractiveHoverButton
                  onClick={handleJoin}
                  text="Join"
                  className="flex-1 rounded-r-none min-h-12 py-6"
                  disabled={!playerName.trim()}
                />
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/')}
                  className="border-white/20 text-white/70 hover:text-white hover:border-white/30 bg-white/5 min-h-12 py-6 px-6 font-semibold rounded-l-none border-l-0"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </UICard>
        </div>
      </div>
    );
  }

  // Show loading only if joined but state not received yet
  if (!currentState) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-mono mb-2">Loading table...</div>
          <div className="text-sm text-white/60 font-mono">Connecting to server...</div>
        </div>
      </div>
    );
  }


  return (
    <div className="h-screen text-white flex flex-col overflow-hidden">
      <div className="overflow-visible">
        <TableTopBar roomCode={roomCode} />
      </div>
      <div className="flex-1 relative overflow-hidden">
        {/* Show player count and waiting message if needed */}
        {currentState.players.length < 2 && (
          <div className="absolute top-48 left-1/2 transform -translate-x-1/2 bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border border-white/20 rounded-xl px-6 py-3 z-10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <p className="text-white text-sm font-mono">
              Waiting for players... <span className="text-[#ffd54a]">({currentState.players.length}/2 minimum)</span>
            </p>
          </div>
        )}
        <PokerTable 
          tableState={currentState} 
          playerId={currentPlayerId} 
          onBackClick={() => setLeaveDialogOpen(true)}
        />
      </div>
      <LeaveTableDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen} />
      <RebuyDialog 
        open={rebuyDialogOpen} 
        onOpenChange={setRebuyDialogOpen}
        onRebuy={handleRebuy}
        buyInAmount={1000}
      />
      {winnerInfo && (
        <WinnerDisplay 
          winnerName={winnerInfo.winnerName} 
          potAmount={winnerInfo.potAmount}
          isSplit={winnerInfo.isSplit}
          winnerNames={winnerInfo.winnerNames}
        />
      )}
      {countdown !== null && countdown > 0 && (
        <CountdownTimer key={countdown} count={countdown} />
      )}
    </div>
  );
}

