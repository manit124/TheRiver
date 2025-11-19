'use client';

import { useRouter } from 'next/navigation';
import { JoinByCodeDialog } from '@/components/JoinByCodeDialog';
import { PokerModeGrid } from '@/components/PokerModeGrid';
import { AnimatedText } from '@/components/AnimatedText';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { TexasHoldemRulesDialog } from '@/components/TexasHoldemRulesDialog';
import { AuthDialog } from '@/components/AuthDialog';
import { TableSelectorDialog } from '@/components/TableSelectorDialog';
import { CreateCustomTableDialog } from '@/components/CreateCustomTableDialog';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Mode } from '@/data/modes';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [texasRulesDialogOpen, setTexasRulesDialogOpen] = useState(false);
  
  // Button position movers - adjust horizontal position of buttons independently
  // Positive values move right, negative values move left
  // Options: 'translateX(0px)', 'translateX(50px)', 'translateX(-50px)', 'translateX(100px)', 'translateX(-100px)', etc.
  const createTableButtonMover = 'translateX(0px)';
  const joinByCodeButtonMover = 'translateX(0px)';
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [tableSelectorOpen, setTableSelectorOpen] = useState(false);
  const [createCustomTableOpen, setCreateCustomTableOpen] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState<string>('texas');
  const [userChips, setUserChips] = useState<number>(0);
  const [user, setUser] = useState<any>(null);
  const pendingModeRef = useRef<Mode | null>(null);

  // Check auth and fetch chips
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUser(authUser);
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
      }
    };
    checkAuth();
  }, []);

  // Listen for auth state changes to navigate after login
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user && pendingModeRef.current) {
        // User just logged in and we have a pending mode to navigate to
        const mode = pendingModeRef.current;
        pendingModeRef.current = null;
        setAuthDialogOpen(false);
        setUser(session.user);
        
        // Check chips and show recovery dialog if needed
        const { data: profile } = await supabase
          .from('profiles')
          .select('chips')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.chips) {
          setUserChips(profile.chips);
        }
        
        // Open table selector instead of navigating
        setSelectedGameType(mode.id);
        setTableSelectorOpen(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleModeClick = async (mode: Mode) => {
    // Check if user is logged in before showing table selector
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        // Store the mode to open after login
        pendingModeRef.current = mode;
        // Show auth dialog if not logged in
        setAuthDialogOpen(true);
        return;
      }
      
      // Open table selector dialog if logged in
      setSelectedGameType(mode.id);
      setTableSelectorOpen(true);
    } catch (error) {
      console.error('Error checking auth:', error);
      // Store the mode to open after login
      pendingModeRef.current = mode;
      // Show auth dialog on error as well
      setAuthDialogOpen(true);
    }
  };

  const handleJoinTable = async (table: any) => {
    // Generate a unique room code for this table
    const { generateRoomCode } = await import('@/lib/utils');
    const roomCode = generateRoomCode();
    
    // Create room on server with the table's settings
    const { connectSocket, emitRoomCreate } = await import('@/lib/socket');
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050';
    const socket = connectSocket(socketUrl);

    const settings = {
      roomCode,
      game: selectedGameType || 'texas',
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
        alert('Connection timeout. Please make sure the server is running.');
      }, 10000);

      const onConnect = () => {
        clearTimeout(connectTimeout);
        socket.off('connect', onConnect);
        handleConnection();
      };

      socket.on('connect', onConnect);

      const onError = (error: Error) => {
        clearTimeout(connectTimeout);
        socket.off('connect_error', onError);
        console.error('❌ Connection error:', error);
        alert('Failed to connect to server. Please make sure the server is running.');
      };

      socket.on('connect_error', onError);
    }
  };

  return (
    <div className="relative min-h-screen">
        {/* Title Section - Centered */}
        <div id="home" className="h-screen flex items-center justify-center relative z-10">
          <div className="text-center">
            <AnimatedText
              text="TheRiver"
              fontSize={80}
              minWeight={0}
              maxWeight={840}
              animationDuration={1.5}
              delayMultiplier={0.25}
            />
          </div>
        </div>

        {/* Poker Mode Grid - Below the fold */}
        <div id="gamemodes" className="min-h-screen flex flex-col items-center justify-center px-1 py-3 relative z-10">
          <PokerModeGrid onModeClick={handleModeClick} />
          
          {/* Action Buttons - Close to carousel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-32 justify-center items-center absolute bottom-20"
          >
            <div style={{ transform: createTableButtonMover }}>
              <InteractiveHoverButton
                onClick={() => setCreateCustomTableOpen(true)}
                text="Create Table"
              />
            </div>
            <div style={{ transform: joinByCodeButtonMover }}>
              <InteractiveHoverButton
                onClick={() => setJoinDialogOpen(true)}
                text="Join by Code"
              />
            </div>
          </motion.div>
        </div>

        <JoinByCodeDialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen} />
        <CreateCustomTableDialog open={createCustomTableOpen} onOpenChange={setCreateCustomTableOpen} />
        <TexasHoldemRulesDialog open={texasRulesDialogOpen} onOpenChange={setTexasRulesDialogOpen} />
        <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
        <TableSelectorDialog 
          open={tableSelectorOpen} 
          onOpenChange={setTableSelectorOpen}
          gameType={selectedGameType}
          userChips={userChips}
          onJoinTable={handleJoinTable}
        />
    </div>
  );
}
