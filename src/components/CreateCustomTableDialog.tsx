'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';
import { HyperText } from '@/components/HyperText';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { createClient } from '@/lib/supabase/client';
import { generateRoomCode } from '@/lib/utils';
import { MODES } from '@/data/modes';
import { connectSocket, emitRoomCreate } from '@/lib/socket';

interface CreateCustomTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCustomTableDialog({ open, onOpenChange }: CreateCustomTableDialogProps) {
  const router = useRouter();
  const [gameMode, setGameMode] = useState<string>('texas');
  const [smallBlind, setSmallBlind] = useState<string>('5');
  const [bigBlind, setBigBlind] = useState<string>('10');
  const [minBuyIn, setMinBuyIn] = useState<string>('200');
  const [maxBuyIn, setMaxBuyIn] = useState<string>('1000');
  const [userChips, setUserChips] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user chips when dialog opens
  useEffect(() => {
    if (open) {
      const fetchChips = async () => {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('chips')
              .eq('id', user.id)
              .single();
            if (profile?.chips !== undefined) {
              setUserChips(profile.chips);
            }
          }
        } catch (error) {
          console.error('Error fetching chips:', error);
        }
      };
      fetchChips();
      setError(null);
    }
  }, [open]);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      const smallBlindNum = parseInt(smallBlind);
      const bigBlindNum = parseInt(bigBlind);
      const minBuyInNum = parseInt(minBuyIn);
      const maxBuyInNum = parseInt(maxBuyIn);

      if (isNaN(smallBlindNum) || smallBlindNum <= 0) {
        setError('Small blind must be a positive number');
        setLoading(false);
        return;
      }

      if (isNaN(bigBlindNum) || bigBlindNum <= 0) {
        setError('Big blind must be a positive number');
        setLoading(false);
        return;
      }

      if (bigBlindNum <= smallBlindNum) {
        setError('Big blind must be greater than small blind');
        setLoading(false);
        return;
      }

      if (isNaN(minBuyInNum) || minBuyInNum <= 0) {
        setError('Min buy-in must be a positive number');
        setLoading(false);
        return;
      }

      if (isNaN(maxBuyInNum) || maxBuyInNum <= 0) {
        setError('Max buy-in must be a positive number');
        setLoading(false);
        return;
      }

      if (maxBuyInNum < minBuyInNum) {
        setError('Max buy-in must be greater than or equal to min buy-in');
        setLoading(false);
        return;
      }

      // Check if user has enough chips for minimum buy-in
      if (userChips < minBuyInNum) {
        setError(`You need at least ${minBuyInNum} chips to create this table. You currently have ${userChips} chips.`);
        setLoading(false);
        return;
      }

      // Generate room code
      const roomCode = generateRoomCode();
      const stakes = `${smallBlindNum}/${bigBlindNum}`;

      // Create room on server before navigating
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050';
      const socket = connectSocket(socketUrl);

      const settings = {
        roomCode,
        game: gameMode,
        smallBlind: smallBlindNum,
        bigBlind: bigBlindNum,
        buyIn: maxBuyInNum,
        maxPlayers: 6,
        isPrivate: false,
      };

      // Handle connection and emit room:create
      const handleConnection = () => {
        try {
          emitRoomCreate(settings);
          console.log('📤 Room create emitted:', roomCode);
          // Navigate to table with custom settings (include game mode)
          router.push(`/table/${roomCode}?stakes=${stakes}&bigBlind=${bigBlindNum}&smallBlind=${smallBlindNum}&minBuyIn=${minBuyInNum}&maxBuyIn=${maxBuyInNum}&game=${gameMode}`);
          onOpenChange(false);
        } catch (error) {
          console.error('❌ Error creating room:', error);
          setError('Failed to create room. Please make sure the server is running.');
          setLoading(false);
        }
      };

      // If already connected, emit immediately
      if (socket.connected) {
        handleConnection();
      } else {
        // Wait for connection with timeout
        const connectTimeout = setTimeout(() => {
          console.error('❌ Connection timeout');
          setError('Connection timeout. Please make sure the server is running.');
          setLoading(false);
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
          setError('Failed to connect to server. Please make sure the server is running.');
          setLoading(false);
        };

        socket.on('connect_error', onError);
      }
      
      // Reset form
      setGameMode('texas');
      setSmallBlind('5');
      setBigBlind('10');
      setMinBuyIn('200');
      setMaxBuyIn('1000');
    } catch (err: any) {
      setError(err.message || 'Failed to create table');
    } finally {
      setLoading(false);
    }
  };

  const handleNumberChange = (value: string, setter: (val: string) => void) => {
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setter(value);
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
                    text="Create Custom Table"
                    className="text-2xl font-semibold text-white tracking-tight"
                    animateOnLoad={false}
                  />
                </div>
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Set your own blinds and buy-in limits for your table.
              </DialogDescription>
            </CardHeader>
          </DialogHeader>
          <CardContent className="space-y-6">
            {userChips > 0 && (
              <div className="text-center">
                <p className="text-white/60 font-mono text-sm">
                  Your Chips: <span className="text-white font-semibold">{userChips.toLocaleString()}</span>
                </p>
              </div>
            )}

            {/* Game Mode Selector */}
            <div className="space-y-2">
              <Label className="text-white/90">Game Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                {MODES.map((mode) => {
                  const isAvailable = mode.status === 'available';
                  const isSelected = gameMode === mode.id;
                  
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        if (isAvailable) {
                          setGameMode(mode.id);
                        }
                      }}
                      disabled={!isAvailable}
                      className={`
                        px-4 py-3 rounded-lg border transition-all duration-200 font-mono text-sm
                        ${isSelected && isAvailable
                          ? 'bg-white/10 border-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                          : isAvailable
                          ? 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white cursor-pointer'
                          : 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed opacity-50'
                        }
                      `}
                    >
                      <div className="font-semibold">{mode.name}</div>
                      {mode.subtitle && (
                        <div className="text-xs mt-0.5 opacity-70">{mode.subtitle}</div>
                      )}
                      {!isAvailable && (
                        <div className="text-xs mt-1 text-white/40">Coming Soon</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Small Blind */}
              <div className="space-y-2">
                <Label htmlFor="smallBlind" className="text-white/90">Small Blind</Label>
                <Input
                  id="smallBlind"
                  type="text"
                  inputMode="numeric"
                  placeholder="5"
                  value={smallBlind}
                  onChange={(e) => handleNumberChange(e.target.value, setSmallBlind)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0 focus-visible:outline-none"
                />
              </div>

              {/* Big Blind */}
              <div className="space-y-2">
                <Label htmlFor="bigBlind" className="text-white/90">Big Blind</Label>
                <Input
                  id="bigBlind"
                  type="text"
                  inputMode="numeric"
                  placeholder="10"
                  value={bigBlind}
                  onChange={(e) => handleNumberChange(e.target.value, setBigBlind)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0 focus-visible:outline-none"
                />
              </div>

              {/* Min Buy-in */}
              <div className="space-y-2">
                <Label htmlFor="minBuyIn" className="text-white/90">Min Buy-in</Label>
                <Input
                  id="minBuyIn"
                  type="text"
                  inputMode="numeric"
                  placeholder="200"
                  value={minBuyIn}
                  onChange={(e) => handleNumberChange(e.target.value, setMinBuyIn)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0 focus-visible:outline-none"
                />
              </div>

              {/* Max Buy-in */}
              <div className="space-y-2">
                <Label htmlFor="maxBuyIn" className="text-white/90">Max Buy-in</Label>
                <Input
                  id="maxBuyIn"
                  type="text"
                  inputMode="numeric"
                  placeholder="1000"
                  value={maxBuyIn}
                  onChange={(e) => handleNumberChange(e.target.value, setMaxBuyIn)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0 focus-visible:outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-mono text-center">
                {error}
              </div>
            )}

            <InteractiveHoverButton
              onClick={handleCreate}
              text={loading ? "Creating..." : "Create Table"}
              className="w-full"
              disabled={loading || !smallBlind || !bigBlind || !minBuyIn || !maxBuyIn}
            />
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

