'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateRoomCode } from '@/lib/utils';
import { connectSocket, emitRoomCreate } from '@/lib/socket';
import { HyperText } from '@/components/HyperText';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';

interface QuickPlayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickPlayDialog({ open, onOpenChange }: QuickPlayDialogProps) {
  const router = useRouter();
  const [game, setGame] = useState<'texas' | 'omaha'>('texas');

  const handleQuickPlay = () => {
    const roomCode = generateRoomCode();
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050';
    const socket = connectSocket(socketUrl);

    const settings = {
      game,
      maxPlayers: 6,
      bigBlind: 10,
      buyIn: 1000,
      isPrivate: false,
    };

    // Store in localStorage for recent rooms
    const recentRooms = JSON.parse(localStorage.getItem('recentRooms') || '[]');
    recentRooms.unshift({ roomCode, createdAt: Date.now() });
    localStorage.setItem('recentRooms', JSON.stringify(recentRooms.slice(0, 5)));

    // Handle connection and emit room:create
    const handleConnection = () => {
      try {
        emitRoomCreate({ ...settings, roomCode });
        console.log('📤 Room create emitted:', roomCode);
        router.push(`/table/${roomCode}`);
        onOpenChange(false);
      } catch (error) {
        console.error('❌ Error creating room:', error);
        alert('Failed to create room. Please make sure the server is running.');
      }
    };

    // If already connected, emit immediately
    if (socket.connected) {
      handleConnection();
    } else {
      // Wait for connection with timeout
      const connectTimeout = setTimeout(() => {
        console.error('❌ Connection timeout');
        alert('Connection timeout. Please make sure the server is running at ' + socketUrl);
      }, 10000); // 10 second timeout

      // Remove listener after first connection
      const onConnect = () => {
        clearTimeout(connectTimeout);
        socket.off('connect', onConnect);
        handleConnection();
      };

      socket.on('connect', onConnect);

      // Also handle connection errors
      const onError = (error: Error) => {
        clearTimeout(connectTimeout);
        socket.off('connect_error', onError);
        console.error('❌ Connection error:', error);
        alert('Failed to connect to server. Please make sure the server is running at ' + socketUrl);
      };

      socket.on('connect_error', onError);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-transparent border-none shadow-none p-0 max-w-2xl [&>button]:text-white/70 [&>button]:hover:text-white">
        <Card className="bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] font-mono">
          <DialogHeader className="p-0">
            <CardHeader className="text-center">
              <DialogTitle asChild>
                <div className="flex justify-center mb-2">
                  <HyperText
                    text="Quick Play"
                    className="text-2xl font-semibold text-white tracking-tight"
                    animateOnLoad={false}
                  />
                </div>
              </DialogTitle>
              <DialogDescription className="text-white/60">Join a game instantly with default settings</DialogDescription>
            </CardHeader>
          </DialogHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-white/90">Game Type</Label>
              <Tabs value={game} onValueChange={(v) => setGame(v as 'texas' | 'omaha')}>
                <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 p-1 gap-1">
                  <TabsTrigger 
                    value="texas"
                    className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70 w-full h-full py-2 rounded-md transition-all"
                  >
                    Texas Hold&apos;em
                  </TabsTrigger>
                  <TabsTrigger 
                    value="omaha"
                    className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70 w-full h-full py-2 rounded-md transition-all"
                  >
                    Omaha
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label className="text-white/90">Default Settings</Label>
              <div className="bg-white/5 border border-white/10 rounded-md p-4 space-y-2 text-white/70 text-sm">
                <div className="flex justify-between">
                  <span>Max Players:</span>
                  <span className="text-white/90">6</span>
                </div>
                <div className="flex justify-between">
                  <span>Big Blind:</span>
                  <span className="text-white/90">10</span>
                </div>
                <div className="flex justify-between">
                  <span>Buy-in:</span>
                  <span className="text-white/90">1000</span>
                </div>
              </div>
            </div>

            <InteractiveHoverButton
              onClick={handleQuickPlay}
              text="Start Game"
              className="w-full"
            />
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

