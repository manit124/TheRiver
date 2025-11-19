'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuthDialog } from '@/components/AuthDialog';

interface FixedTable {
  id: string;
  stakes: string; // e.g., "1/2"
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  players: number; // Current players (mock for now)
  maxPlayers: number;
}

const FIXED_TABLES: FixedTable[] = [
  {
    id: 'table-1',
    stakes: '1/2',
    smallBlind: 1,
    bigBlind: 2,
    minBuyIn: 40,
    maxBuyIn: 200,
    players: 0,
    maxPlayers: 6,
  },
  {
    id: 'table-2',
    stakes: '5/10',
    smallBlind: 5,
    bigBlind: 10,
    minBuyIn: 200,
    maxBuyIn: 1000,
    players: 0,
    maxPlayers: 6,
  },
  {
    id: 'table-3',
    stakes: '50/100',
    smallBlind: 50,
    bigBlind: 100,
    minBuyIn: 2000,
    maxBuyIn: 10000,
    players: 0,
    maxPlayers: 6,
  },
];

function LobbyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameType = searchParams.get('game') || 'texas';
  const [user, setUser] = useState<any>(null);
  const [userChips, setUserChips] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        setUser(authUser);
        // Fetch user chips
        const { data: profile } = await supabase
          .from('profiles')
          .select('chips')
          .eq('id', authUser.id)
          .single();
        
        if (profile?.chips) {
          setUserChips(profile.chips);
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTable = async (table: FixedTable) => {
    // User should already be logged in (checked at game mode selection)
    // But double-check just in case
    if (!user) {
      setAuthDialogOpen(true);
      return;
    }

    // Check if user has enough chips (they need at least min buy-in in their account)
    if (userChips < table.minBuyIn) {
      alert(`You need at least ${table.minBuyIn} chips to join this table. You currently have ${userChips} chips.`);
      return;
    }

    // Generate a unique room code for this table
    const { generateRoomCode } = await import('@/lib/utils');
    const roomCode = generateRoomCode();
    
    // Create room on server with the table's fixed settings
    const { connectSocket, emitRoomCreate } = await import('@/lib/socket');
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050';
    const socket = connectSocket(socketUrl);

    const settings = {
      roomCode,
      game: 'texas',
      smallBlind: table.smallBlind,
      bigBlind: table.bigBlind,
      buyIn: table.maxBuyIn,
      maxPlayers: 6,
      isPrivate: false,
    };

    // Handle connection and emit room:create
    const handleConnection = () => {
      try {
        emitRoomCreate(settings);
        console.log('📤 Room create emitted:', roomCode);
        // Navigate to table with the table's settings
        router.push(`/table/${roomCode}?stakes=${table.stakes}&bigBlind=${table.bigBlind}&smallBlind=${table.smallBlind}&minBuyIn=${table.minBuyIn}&maxBuyIn=${table.maxBuyIn}`);
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

  const canJoinTable = (table: FixedTable) => {
    if (!user) return false;
    return userChips >= table.minBuyIn;
  };

  return (
    <div className="min-h-screen text-white relative">
      {/* Back Button */}
      <div className="absolute top-8 left-8 z-30">
        <button 
          onClick={() => router.push('/')}
          className="group flex items-center gap-2 text-white/60 hover:text-white px-4 py-2 rounded-lg bg-black/20 backdrop-blur-md border border-white/5 hover:border-white/10 transition-all duration-200 font-mono text-sm"
          aria-label="Back to home"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        {/* Header - Centered */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white font-mono mb-3">
            {gameType === 'texas' ? 'TEXAS HOLD\'EM' : gameType.toUpperCase()} TABLES
          </h1>
          <div className="w-20 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mb-6" />
          {user && (
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <div>
                <div className="text-white/50 text-xs font-mono">Balance</div>
                <div className="text-white font-semibold font-mono text-lg">{userChips.toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>

        {/* Tables - Centered Layout */}
        <div className="space-y-6 max-w-4xl mx-auto">
          {FIXED_TABLES.map((table) => (
            <div
              key={table.id}
              className="group relative bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border border-white/10 rounded-2xl p-8 hover:border-white/15 transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-8">
                {/* Table Info - Centered */}
                <div className="flex-1 flex items-center justify-center gap-12">
                  {/* Stakes */}
                  <div className="text-center">
                    <div className="text-white/50 text-xs font-mono mb-2 uppercase tracking-wider">Stakes</div>
                    <div className="text-3xl font-bold text-green-400 font-mono">{table.stakes}</div>
                  </div>

                  {/* Buy-in */}
                  <div className="text-center">
                    <div className="text-white/50 text-xs font-mono mb-2 uppercase tracking-wider">Buy-in</div>
                    <div className="text-3xl font-bold text-white font-mono">
                      {table.minBuyIn} / {table.maxBuyIn}
                    </div>
                  </div>
                </div>

                {/* Join Button - Centered */}
                <div className="flex justify-center">
                  <button
                    onClick={() => handleJoinTable(table)}
                    disabled={!canJoinTable(table) && !!user}
                    className={`px-10 py-4 rounded-lg font-mono font-semibold text-base transition-all duration-200 ${
                      !user
                        ? 'bg-white/10 hover:bg-white/15 border border-white/20 text-white'
                        : canJoinTable(table)
                        ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-green-400 hover:text-green-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(74,222,128,0.3)]'
                        : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    {!user ? 'Login to Join' : canJoinTable(table) ? 'Join Table →' : 'Insufficient Chips'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-white/60 font-mono">Loading...</div>
      </div>
    }>
      <LobbyPageContent />
    </Suspense>
  );
}
