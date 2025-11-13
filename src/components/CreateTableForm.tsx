'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TableSettings } from '@/types/poker';
import { generateRoomCode } from '@/lib/utils';
import { connectSocket, emitRoomCreate } from '@/lib/socket';
import { HyperText } from '@/components/HyperText';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';

export function CreateTableForm() {
  const router = useRouter();
  const [settings, setSettings] = useState<TableSettings>({
    game: 'texas',
    maxPlayers: 6, // Fixed at 6, not user-configurable
    bigBlind: 10,
    buyIn: 1000, // Default starting chips
    isPrivate: false,
  });

  const handleCreate = () => {
    const roomCode = generateRoomCode();
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050';
    const socket = connectSocket(socketUrl);

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
    <Card className="bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] font-mono">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <HyperText
            text="Create Table"
            className="text-2xl font-semibold text-white tracking-tight"
            animateOnLoad={false}
          />
        </div>
        <CardDescription className="text-white/60">Configure your poker table settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-white/90">Game Type</Label>
          <Tabs value={settings.game} onValueChange={(v) => setSettings({ ...settings, game: v as 'texas' | 'omaha' })}>
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
          <Label htmlFor="bigBlind" className="text-white/90">Big Blind</Label>
          <Input
            id="bigBlind"
            type="number"
            min="1"
            value={settings.bigBlind}
            onChange={(e) => setSettings({ ...settings, bigBlind: parseInt(e.target.value) || 10 })}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="buyIn" className="text-white/90">Buy-in</Label>
          <Input
            id="buyIn"
            type="number"
            min="1"
            value={settings.buyIn}
            onChange={(e) => setSettings({ ...settings, buyIn: parseInt(e.target.value) || 1000 })}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isPrivate"
            checked={settings.isPrivate}
            onChange={(e) => setSettings({ ...settings, isPrivate: e.target.checked })}
            className="h-4 w-4 rounded border-white/20 bg-white/5 accent-white/20 cursor-pointer"
          />
          <Label htmlFor="isPrivate" className="cursor-pointer text-white/90">
            Private Table
          </Label>
        </div>

        <InteractiveHoverButton
          onClick={handleCreate}
          text="Create Table"
          className="w-full"
        />
      </CardContent>
    </Card>
  );
}

