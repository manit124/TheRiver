import { create } from 'zustand';
import { TableState, ClientAction, HandHistoryItem } from '@/types/poker';
import { connectSocket, disconnectSocket, emitRoomJoin, emitPlayerAction, emitRebuy, getSocket } from '@/lib/socket';

interface TableStore {
  state: TableState | null;
  playerId: string | null;
  playerName: string | null;
  handHistory: HandHistoryItem[];
  isConnected: boolean;
  winnerInfo: { winnerName: string; potAmount: number; isSplit?: boolean; winnerNames?: string[] } | null;
  countdown: number | null;
  connect: (roomCode: string, playerName: string, buyInAmount?: number, smallBlind?: number, bigBlind?: number, profilePic?: string | null) => void;
  disconnect: () => void;
  sendAction: (action: ClientAction) => void;
  rebuy: (buyIn?: number) => void;
  updateState: (state: TableState) => void;
  patchState: (patch: Partial<TableState>) => void;
  addHandHistory: (item: HandHistoryItem) => void;
  setWinnerInfo: (info: { winnerName: string; potAmount: number } | null) => void;
  setCountdown: (count: number | null) => void;
}

export const useTableStore = create<TableStore>((set, get) => {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050';
  let socket: ReturnType<typeof getSocket>;

  return {
    state: null,
    playerId: null,
    playerName: null,
    handHistory: [],
    isConnected: false,
    winnerInfo: null,
    countdown: null,

    connect: (roomCode: string, playerName: string, buyInAmount?: number, smallBlind?: number, bigBlind?: number, profilePic?: string | null) => {
      console.log('🔌 Starting connection process...', { roomCode, playerName, buyInAmount, smallBlind, bigBlind, profilePic, socketUrl });
      
      // Get or create socket
      socket = connectSocket(socketUrl);
      console.log('🔌 Socket instance:', socket?.id, 'Connected:', socket?.connected);

      // Remove old listeners to prevent duplicates
      socket.removeAllListeners('connect');
      socket.removeAllListeners('player:id');
      socket.removeAllListeners('table:state');
      socket.removeAllListeners('disconnect');
      socket.removeAllListeners('error');
      socket.removeAllListeners('connect_error');
      socket.removeAllListeners('player:left');
      socket.removeAllListeners('hand:started');
      socket.removeAllListeners('hand:street');
      socket.removeAllListeners('hand:ended');
      socket.removeAllListeners('player:joined');
      socket.removeAllListeners('table:patch');
      socket.removeAllListeners('countdown');

      // Handle connection errors
      socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        set({ isConnected: false });
      });

      // Handle general socket errors
      socket.on('error', (error: any) => {
        console.error('❌ Socket error:', error);
        // If error message indicates room doesn't exist, reset hasJoined
        if (error?.message && error.message.includes('does not exist')) {
          set({ isConnected: false });
          alert(error.message);
        }
        // Don't disconnect on error, let reconnection handle it
      });

      // Set up connection handler
      const handleConnect = () => {
        console.log('✅ Socket connected, socket ID:', socket?.id);
        set({ isConnected: true });
        // Join room after connection - normalize room code to uppercase
        if (socket?.connected) {
          const normalizedRoomCode = roomCode.toUpperCase();
          console.log('📤 Emitting room:join', { roomCode, normalizedRoomCode, playerName, buyIn: buyInAmount, smallBlind, bigBlind, profilePic });
          socket.emit('room:join', { roomCode: normalizedRoomCode, name: playerName, buyIn: buyInAmount, smallBlind, bigBlind, profilePic });
        } else {
          console.error('❌ Socket not connected when trying to join');
        }
      };

      // Set up all listeners first
      socket.on('disconnect', () => {
        set({ isConnected: false });
      });

      // Server will tell us our player ID
      socket.on('player:id', ({ playerId }: { playerId: string }) => {
        console.log('🎯 Received player ID from server:', playerId);
        set({ playerId, playerName });
      });

      socket.on('table:state', (newState: TableState) => {
        const oldState = get().state;
        const potChanged = oldState ? newState.pot !== oldState.pot : false;
        const currentPlayerId = get().playerId;
        
        // Log player stack information for debugging
        if (currentPlayerId) {
          const currentPlayer = newState.players.find(p => p.id === currentPlayerId);
          if (currentPlayer) {
            console.log(`🎯 Current player stack: ${currentPlayer.stack} (playerId: ${currentPlayerId})`);
          }
        }
        
        console.log('📥 Received table:state', {
          players: newState.players.length,
          street: newState.street,
          pot: newState.pot,
          potChanged: potChanged,
          oldPot: oldState?.pot,
          communityCards: newState.community.length,
          toActPlayerId: newState.toActPlayerId,
          playerStacks: newState.players.map(p => ({ 
            id: p.id,
            name: p.name,
            stack: p.stack,
            currentBet: p.currentBet || 0
          }))
        });
        
        // Clear winner info if there's only one player or no pot (new hand starting)
        // Only clear if we're not in the middle of showing a winner (pot > 0 means a hand was played)
        if (newState.players.length < 2 || (newState.pot === 0 && newState.street === 'preflop' && !newState.toActPlayerId)) {
          const currentWinnerInfo = get().winnerInfo;
          if (currentWinnerInfo) {
            console.log('🧹 Clearing winner info - only one player or new hand starting');
            set({ winnerInfo: null });
          }
        }
        
        // Log if pot changed significantly
        if (potChanged && oldState) {
          console.log(`💰💰💰 POT CHANGED: ${oldState.pot} → ${newState.pot} (difference: ${newState.pot - oldState.pot})`);
        }
        
        set({ state: newState });
      });

      socket.on('table:patch', (patch: Partial<TableState>) => {
        const currentState = get().state;
        if (currentState) {
          set({ state: { ...currentState, ...patch } });
        }
      });

      socket.on('player:joined', (data: { player: any }) => {
        // Handle player joined
      });

      socket.on('player:left', (data: { playerId: string }) => {
        console.log('👋 Player left:', data.playerId);
        const currentState = get().state;
        if (currentState) {
          const filteredPlayers = currentState.players.filter((p) => p.id !== data.playerId);
          // Only update if player was actually removed (to avoid unnecessary updates)
          if (filteredPlayers.length !== currentState.players.length) {
            // Clear winner info if only one player remains
            const shouldClearWinner = filteredPlayers.length < 2;
            set({
              state: {
                ...currentState,
                players: filteredPlayers,
              },
              winnerInfo: shouldClearWinner ? null : get().winnerInfo,
            });
            if (shouldClearWinner) {
              console.log('🧹 Clearing winner info - only one player remaining');
            }
            console.log(`✅ Removed player ${data.playerId}. Remaining: ${filteredPlayers.length}`);
          }
        }
      });

      socket.on('hand:started', () => {
        // Clear winner info and countdown when new hand starts
        console.log('🎮 New hand started - clearing winner info and countdown');
        set({ winnerInfo: null, countdown: null });
      });

      socket.on('hand:street', (data: { street: string }) => {
        const currentState = get().state;
        if (currentState) {
          set({
            state: {
              ...currentState,
              street: data.street as any,
            },
          });
        }
      });

      socket.on('betting:round:complete', (data?: { totalAmount?: number; playerBets?: Array<{ playerId: string; amount: number }> }) => {
        // Trigger chip animation to pot
        // Use data from server if available, otherwise calculate from state
        const currentState = get().state;
        if (currentState) {
          let totalBets = 0;
          let playerBetsData: Array<{ playerId: string; amount: number }> = [];
          
          if (data && data.totalAmount && data.playerBets) {
            // Use data from server (preferred - accurate)
            totalBets = data.totalAmount;
            playerBetsData = data.playerBets;
            console.log('🎬 Animating chips to pot from server data:', { totalBets, playerBetsData });
          } else {
            // Fallback: calculate from current state (may be 0 if already reset)
            totalBets = currentState.players.reduce((sum, p) => sum + (p.currentBet || 0), 0);
            playerBetsData = currentState.players
              .filter(p => (p.currentBet || 0) > 0)
              .map(p => ({ playerId: p.id, amount: p.currentBet || 0 }));
            console.log('🎬 Animating chips to pot from state (fallback):', { totalBets, playerBetsData });
          }
          
          if (totalBets > 0 && playerBetsData.length > 0) {
            // Dispatch event for chip animations
            window.dispatchEvent(new CustomEvent('chipsToPot', { 
              detail: { 
                totalAmount: totalBets,
                playerBets: playerBetsData
              } 
            }));
          }
        }
      });

      socket.on('hand:ended', (data?: { history?: HandHistoryItem }) => {
        // Handle cases where data or history might be undefined
        if (!data || !data.history) {
          console.warn('⚠️ hand:ended event received without history data');
          return;
        }
        
        const history = data.history; // Store in const after type guard
        const currentState = get().state;
        
        // Only set winner info if there are at least 2 players and a pot was won
        if (!currentState || currentState.players.length < 2 || history.pot === 0) {
          console.log('⚠️ Not setting winner info - insufficient players or no pot');
          set((state) => ({
            handHistory: [...state.handHistory, history],
            winnerInfo: null, // Clear any existing winner info
          }));
          return;
        }
        
        const winnerIds = history.winningPlayerIds;
        const isSplit = winnerIds.length > 1;
        
        const winnerNames = winnerIds.length > 0
          ? winnerIds.map(id => currentState?.players.find(p => p.id === id)?.name || 'Unknown')
          : ['Unknown'];
        
        const winnerName = isSplit 
          ? winnerNames.join(' & ')
          : (winnerNames[0] || 'Unknown');
        
        const potAmount = history.pot;
        
        set((state) => ({
          handHistory: [...state.handHistory, history],
          winnerInfo: { 
            winnerName, 
            potAmount, 
            isSplit,
            winnerNames: isSplit ? winnerNames : undefined
          },
          // Don't clear countdown here - it will be set by the countdown event
        }));
        
        // Check if current player has 0 stack AFTER winner gets money
        // Wait for pot:to:winner event to ensure stacks are updated
        // This will be handled in pot:to:winner handler
      });

      // Listen for pot:empty event (emitted 4 seconds after winner is decided)
      socket.on('pot:empty', () => {
        console.log('🎰 Pot emptying event received');
        window.dispatchEvent(new CustomEvent('potEmpty'));
      });

      // Listen for pot:to:winner event (emitted after pot empties and money is added to winner)
      socket.on('pot:to:winner', (data: { winnerIds: string[]; amount: number }) => {
        console.log('💰 Pot to winner event received:', data);
        window.dispatchEvent(new CustomEvent('potToWinner', { detail: data }));
        
        // After winner gets money, check if current player still has 0 stack
        // Only show rebuy dialog if they lost (still have 0 stack after winner gets money)
        setTimeout(() => {
          const currentState = get().state;
          const currentPlayerId = get().playerId;
          if (currentState && currentPlayerId) {
            const currentPlayer = currentState.players.find(p => p.id === currentPlayerId);
            // Only show rebuy if player has exactly 0 stack (they lost)
            if (currentPlayer && currentPlayer.stack === 0) {
              console.log('💸 Player has 0 stack after hand ended - showing rebuy dialog');
              window.dispatchEvent(new CustomEvent('showRebuyDialog'));
            }
          }
        }, 500); // Small delay to ensure state is updated
      });

      socket.on('countdown', (count: number | null) => {
        console.log('⏱️ Countdown event received:', count);
        console.log('⏱️ Setting countdown state to:', count);
        set({ countdown: count });
        console.log('⏱️ Countdown state after set:', get().countdown);
      });

      // If already connected, join immediately
      if (socket.connected) {
        handleConnect();
      } else {
        socket.once('connect', handleConnect);
      }
    },

    disconnect: () => {
      disconnectSocket();
      set({ state: null, playerId: null, playerName: null, isConnected: false });
    },

    sendAction: (action: ClientAction) => {
      emitPlayerAction(action);
    },

    rebuy: (buyIn?: number) => {
      emitRebuy(buyIn);
    },

    updateState: (state: TableState) => {
      set({ state });
    },

    patchState: (patch: Partial<TableState>) => {
      const currentState = get().state;
      if (currentState) {
        set({ state: { ...currentState, ...patch } });
      }
    },

    addHandHistory: (item: HandHistoryItem) => {
      set((state) => ({
        handHistory: [...state.handHistory, item],
      }));
    },

    setWinnerInfo: (info: { winnerName: string; potAmount: number; isSplit?: boolean; winnerNames?: string[] } | null) => {
      set({ winnerInfo: info });
    },

    setCountdown: (count: number | null) => {
      set({ countdown: count });
    },
  };
});

