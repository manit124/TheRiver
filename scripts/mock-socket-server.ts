import { Server } from 'socket.io';
import { createServer } from 'http';
import type { Card, Rank, Suit, TableState, Player, ClientAction, HandHistoryItem } from '../src/types/poker';
import { evaluateHand } from '../src/lib/pokerHands';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { 
    origin: process.env.CORS_ORIGIN?.split(',') || '*', 
    methods: ['GET', 'POST'] 
  },
});

const rooms = new Map<string, TableState>();
const playerRooms = new Map<string, string>();
const handDecks = new Map<string, Card[]>();

const ranks: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
const suits: Suit[] = ['♠', '♥', '♦', '♣'];

// ==================== UTILITY FUNCTIONS ====================

function createCard(rank: Rank, suit: Suit): Card {
  return { rank, suit, id: `${rank}${suit}_${Date.now()}_${Math.random()}` };
}

function shuffleDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(createCard(rank, suit));
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function createInitialState(roomCode: string, settings: any): TableState {
  return {
    roomCode,
    game: settings.game || 'texas',
    bigBlind: 10,
    pot: 0,
    street: 'preflop',
    players: [],
    community: [],
    minBet: 0,
    maxBet: settings.buyIn || 1000,
  };
}

// ==================== GAME LOGIC ====================

function getPlayersInHand(state: TableState): Player[] {
  return state.players.filter(p => p.holeCards && p.holeCards.length > 0 && !p.hasFolded);
}

// Get bet data before collecting (for animations)
function getBetData(state: TableState): { totalAmount: number; playerBets: Array<{ playerId: string; amount: number }> } {
  let totalAmount = 0;
  const playerBets: Array<{ playerId: string; amount: number }> = [];
  
  state.players.forEach(p => {
    const bet = p.currentBet || 0;
    if (bet > 0) {
      playerBets.push({ playerId: p.id, amount: bet });
      totalAmount += bet;
    }
  });
  
  return { totalAmount, playerBets };
}

// Collect all currentBets to pot when betting round completes
function collectBetsToPot(state: TableState): void {
  const potBefore = state.pot;
  state.players.forEach(p => {
    const bet = p.currentBet || 0;
    if (bet > 0) {
      state.pot += bet;
      console.log(`💰 Adding ${bet} from ${p.name} to pot. Pot: ${state.pot - bet} → ${state.pot}`);
      p.currentBet = 0; // Reset after adding to pot
    }
    p.hasActedThisRound = false; // Reset for next round
  });
  console.log(`💰💰💰 POT UPDATE: ${potBefore} → ${state.pot} (added ${state.pot - potBefore})`);
}

function isRoundComplete(state: TableState): boolean {
  const playersInHand = getPlayersInHand(state);
  if (playersInHand.length <= 1) return true;
  
  // Everyone must have acted
  const allActed = playersInHand.every(p => p.hasActedThisRound === true);
  if (!allActed) return false;
  
  // Everyone must have matched the bet (or be all-in)
  const allMatched = playersInHand.every(p => {
    const bet = p.currentBet || 0;
    return bet === state.minBet || p.stack === 0;
  });
  
  return allMatched;
}

function getNextPlayer(state: TableState): Player | null {
  if (!state.toActPlayerId) return null;
  
  const currentIndex = state.players.findIndex(p => p.id === state.toActPlayerId);
  if (currentIndex === -1) return null;
  
  // Find next player who needs to act
  for (let i = 1; i <= state.players.length; i++) {
    const nextIndex = (currentIndex + i) % state.players.length;
    const player = state.players[nextIndex];
    
    if (!player.holeCards || player.holeCards.length === 0) continue;
    if (player.hasFolded) continue;
    
    const hasActed = player.hasActedThisRound === true;
    const hasMatched = (player.currentBet || 0) === state.minBet;
    const isAllIn = player.stack === 0;
    
    if (!hasActed || (!hasMatched && !isAllIn && player.stack > 0)) {
      return player;
    }
  }
  
  return null;
}

function handleAction(state: TableState, player: Player, action: ClientAction, roomCode: string): boolean {
  if (action.type === 'FOLD') {
    player.hasFolded = true;
    player.hasActedThisRound = true;
    io.to(roomCode).emit('table:state', state);
    return true;
  }
  
  if (action.type === 'CHECK') {
    // Can only check if currentBet matches minBet
    if ((player.currentBet || 0) < state.minBet) {
      return false;
    }
    player.hasActedThisRound = true;
    io.to(roomCode).emit('table:state', state);
    return true;
  }
  
  if (action.type === 'CALL') {
    const toCall = state.minBet - (player.currentBet || 0);
    if (toCall <= 0) return false;
    
    const callAmount = Math.min(toCall, player.stack);
    // Deduct from stack immediately (yellow ball appears)
    player.stack -= callAmount;
    player.currentBet = (player.currentBet || 0) + callAmount;
    
    // Handle all-in
    if (callAmount < toCall && player.stack === 0) {
      state.minBet = player.currentBet;
      state.players.forEach(p => {
        if (p.id !== player.id && (p.currentBet || 0) > state.minBet) {
          const excess = (p.currentBet || 0) - state.minBet;
          p.currentBet = state.minBet;
          p.stack += excess;
        }
      });
    }
    
    player.hasActedThisRound = true;
    io.to(roomCode).emit('table:state', state);
    return true;
  }
  
  if (action.type === 'BET' || action.type === 'RAISE') {
    const betAmount = action.amount || state.bigBlind;
    
    // Calculate max bet
    const others = state.players.filter(p => 
      p.id !== player.id && !p.hasFolded && p.holeCards && p.holeCards.length > 0
    );
    const maxBet = others.length > 0
      ? Math.min(...others.map(p => (p.currentBet || 0) + p.stack))
      : betAmount;
    
    const totalBet = Math.min(betAmount, maxBet);
    const toAdd = totalBet - (player.currentBet || 0);
    const actualAdd = Math.min(toAdd, player.stack);
    
    // Deduct from stack immediately (yellow ball appears)
    player.stack -= actualAdd;
    player.currentBet = (player.currentBet || 0) + actualAdd;
    state.minBet = totalBet;
    
    // Refund excess if needed
    state.players.forEach(p => {
      if (p.id !== player.id && (p.currentBet || 0) > state.minBet) {
        const excess = (p.currentBet || 0) - state.minBet;
        p.currentBet = state.minBet;
        p.stack += excess;
      }
    });
    
    // Reset acted flags for other players (they need to act again)
    state.players.forEach(p => {
      if (p.id !== player.id && !p.hasFolded && p.holeCards && p.holeCards.length > 0) {
        if ((p.currentBet || 0) < state.minBet && p.stack > 0) {
          p.hasActedThisRound = false;
        }
      }
    });
    
    player.hasActedThisRound = true;
    io.to(roomCode).emit('table:state', state);
    return true;
  }
  
  return false;
}

function moveToNextPlayer(state: TableState, roomCode: string) {
  const playersInHand = getPlayersInHand(state);
  
  if (playersInHand.length <= 1) {
    state.street = 'showdown';
    endHand(state, roomCode);
    return;
  }
  
  if (isRoundComplete(state)) {
    // Round complete - get bet data BEFORE collecting (so frontend can see currentBet values)
    const { totalAmount, playerBets } = getBetData(state);
    
    // Emit state FIRST with currentBet values still visible (for animation)
    io.to(roomCode).emit('table:state', state);
    
    // Emit event for chip animations (frontend will animate currentBet -> pot)
    if (totalAmount > 0 && playerBets.length > 0) {
      io.to(roomCode).emit('betting:round:complete', { 
        totalAmount: totalAmount,
        playerBets: playerBets 
      });
    }
    
    // Wait a moment, then collect bets to pot and update state
    setTimeout(() => {
      console.log(`🎯 Collecting bets to pot. Pot before: ${state.pot}`);
      collectBetsToPot(state);
      console.log(`🎯 Pot after collection: ${state.pot}`);
      // Emit state again with updated pot and currentBet = 0
      console.log(`📤 Emitting table:state with pot=${state.pot}`);
      io.to(roomCode).emit('table:state', state);
    }, 50); // Small delay to ensure frontend received the first state
    
    // Wait 200ms for animations, then move to next street
    setTimeout(() => {
      const allAllIn = playersInHand.every(p => p.stack === 0);
      if (allAllIn && state.community.length < 5) {
        revealAllCards(state, roomCode);
        return;
      }
      
      nextStreet(state, roomCode);
      io.to(roomCode).emit('table:state', state);
    }, 200);
    return;
  }
  
  // Find next player
  const next = getNextPlayer(state);
  
  if (!next) {
    // Double check if round is complete
    if (isRoundComplete(state)) {
      const { totalAmount, playerBets } = getBetData(state);
      
      // Emit state FIRST with currentBet values still visible
      io.to(roomCode).emit('table:state', state);
      
      if (totalAmount > 0 && playerBets.length > 0) {
        io.to(roomCode).emit('betting:round:complete', { 
          totalAmount: totalAmount,
          playerBets: playerBets 
        });
      }
      
      setTimeout(() => {
        collectBetsToPot(state);
        io.to(roomCode).emit('table:state', state);
      }, 50);
      
      setTimeout(() => {
        const allAllIn = playersInHand.every(p => p.stack === 0);
        if (allAllIn && state.community.length < 5) {
          revealAllCards(state, roomCode);
          return;
        }
        nextStreet(state, roomCode);
        io.to(roomCode).emit('table:state', state);
      }, 200);
    }
    return;
  }
  
  // Set next player's turn
  state.players.forEach(p => p.isTurn = false);
  state.toActPlayerId = next.id;
  next.isTurn = true;
  
  io.to(roomCode).emit('table:state', state);
}

function startHand(state: TableState, roomCode: string) {
  const activePlayers = state.players.filter(p => p.stack > 0);
  if (activePlayers.length < 2) {
    state.toActPlayerId = undefined;
    io.to(roomCode).emit('table:state', state);
    return;
  }

  // Deal cards
  const deck = shuffleDeck();
  handDecks.set(roomCode, deck);
  let deckIndex = 0;
  const cardsPerPlayer = state.game === 'omaha' ? 4 : 2;
  
  activePlayers.forEach(p => {
    p.holeCards = [];
    p.currentBet = 0;
    p.hasFolded = false;
    p.hasActedThisRound = false;
    for (let i = 0; i < cardsPerPlayer; i++) {
      p.holeCards!.push(deck[deckIndex++]);
    }
  });
  
  // Move dealer button
  const dealerIdx = activePlayers.findIndex(p => p.isDealer);
  activePlayers.forEach(p => p.isDealer = false);
  if (dealerIdx >= 0 && dealerIdx < activePlayers.length - 1) {
    activePlayers[dealerIdx + 1].isDealer = true;
  } else {
    activePlayers[0].isDealer = true;
  }

  // Post blinds: Small blind = 5, Big blind = 10
  const dealerIndex = state.players.findIndex(p => p.isDealer);
  let sbIndex = (dealerIndex + 1) % state.players.length;
  let bbIndex = (dealerIndex + 2) % state.players.length;
  
  while (state.players[sbIndex].stack === 0 && sbIndex !== dealerIndex) {
    sbIndex = (sbIndex + 1) % state.players.length;
  }
  while (state.players[bbIndex].stack === 0 && bbIndex !== sbIndex) {
    bbIndex = (bbIndex + 1) % state.players.length;
  }
  
  const sb = 5;
  const bb = 10;
  
  // Post blinds - deduct from stack immediately, show as currentBet
  if (state.players[sbIndex].stack >= sb) {
    state.players[sbIndex].stack -= sb;
    state.players[sbIndex].currentBet = sb;
    state.players[sbIndex].hasActedThisRound = false;
  }
  if (state.players[bbIndex].stack >= bb) {
    state.players[bbIndex].stack -= bb;
    state.players[bbIndex].currentBet = bb;
    state.players[bbIndex].hasActedThisRound = false;
  }

  state.street = 'preflop';
  state.pot = 0;
  state.community = [];
  state.minBet = bb; // Big blind is minimum bet
  
  // Small blind acts first (needs to call 5 more to match big blind)
  state.players.forEach(p => p.isTurn = false);
  state.toActPlayerId = state.players[sbIndex].id;
  state.players[sbIndex].isTurn = true;
  
  io.to(roomCode).emit('hand:started');
  io.to(roomCode).emit('table:state', state);
}

function nextStreet(state: TableState, roomCode: string) {
  if (state.street === 'preflop') {
    dealFlop(state, roomCode);
    state.street = 'flop';
  } else if (state.street === 'flop') {
    dealTurn(state, roomCode);
    state.street = 'turn';
  } else if (state.street === 'turn') {
    dealRiver(state, roomCode);
    state.street = 'river';
  } else {
    state.street = 'showdown';
    endHand(state, roomCode);
    return;
  }

  state.minBet = 0;
  
  // Reset betting state
  state.players.forEach(p => {
    p.currentBet = 0;
    p.hasActedThisRound = false;
    p.isTurn = false;
  });
  
  // First to act after dealer (small blind position)
  const dealerIndex = state.players.findIndex(p => p.isDealer);
  if (dealerIndex === -1) return;
  
  let firstIndex = (dealerIndex + 1) % state.players.length;
  let attempts = 0;
  
  while (attempts < state.players.length) {
    const p = state.players[firstIndex];
    if (p && p.holeCards && p.holeCards.length > 0 && !p.hasFolded && p.stack > 0) {
      break;
    }
    firstIndex = (firstIndex + 1) % state.players.length;
    attempts++;
  }
  
  if (attempts < state.players.length) {
    const firstPlayer = state.players[firstIndex];
    state.toActPlayerId = firstPlayer.id;
    firstPlayer.isTurn = true;
  } else {
    state.toActPlayerId = undefined;
  }
}

function dealFlop(state: TableState, roomCode: string) {
  const deck = handDecks.get(roomCode);
  if (!deck) return;
  const playersInHand = state.players.filter(p => p.holeCards && p.holeCards.length > 0);
  const cardsPerPlayer = state.game === 'omaha' ? 4 : 2;
  const used = playersInHand.length * cardsPerPlayer;
  state.community = [deck[used], deck[used + 1], deck[used + 2]];
}

function dealTurn(state: TableState, roomCode: string) {
  const deck = handDecks.get(roomCode);
  if (!deck) return;
  const playersInHand = state.players.filter(p => p.holeCards && p.holeCards.length > 0);
  const cardsPerPlayer = state.game === 'omaha' ? 4 : 2;
  const used = playersInHand.length * cardsPerPlayer + state.community.length;
  state.community.push(deck[used]);
}

function dealRiver(state: TableState, roomCode: string) {
  const deck = handDecks.get(roomCode);
  if (!deck) return;
  const playersInHand = state.players.filter(p => p.holeCards && p.holeCards.length > 0);
  const cardsPerPlayer = state.game === 'omaha' ? 4 : 2;
  const used = playersInHand.length * cardsPerPlayer + state.community.length;
  state.community.push(deck[used]);
}

function revealAllCards(state: TableState, roomCode: string) {
  const deck = handDecks.get(roomCode) || shuffleDeck();
  handDecks.set(roomCode, deck);
  const playersInHand = state.players.filter(p => p.holeCards && p.holeCards.length > 0);
  const cardsPerPlayer = state.game === 'omaha' ? 4 : 2;
  const used = playersInHand.length * cardsPerPlayer + state.community.length;
  while (state.community.length < 5) {
    state.community.push(deck[used + state.community.length - used]);
  }
  state.street = 'showdown';
  endHand(state, roomCode);
}

function endHand(state: TableState, roomCode: string) {
  // Collect any remaining bets
  state.players.forEach(p => {
    if ((p.currentBet || 0) > 0) {
      state.pot += (p.currentBet || 0);
      p.currentBet = 0;
    }
  });
  
  const active = state.players.filter(p => !p.hasFolded && p.holeCards && p.holeCards.length > 0);
  
  if (active.length === 0) {
    state.pot = 0;
    io.to(roomCode).emit('hand:ended', {
      history: {
        id: `hand_${Date.now()}`,
        summary: 'No winner',
        pot: 0,
        winningPlayerIds: [],
        streetActions: [],
      },
    });
    setTimeout(() => startHand(state, roomCode), 5000);
    return;
  }

  const hands = active.map(p => ({
    player: p,
    result: evaluateHand(p.holeCards || [], state.community),
  }));
  
  const best = Math.max(...hands.map(h => h.result.value));
  const winners = hands.filter(h => h.result.value === best).map(h => h.player);
  
  const pot = state.pot;
  const perWinner = Math.floor(pot / winners.length);
  const remainder = pot % winners.length;
  
  const names = winners.map(w => w.name).join(' & ');
  const rank = hands.find(h => h.player.id === winners[0].id)?.result.rank || 'Unknown';
  
  // Use "split" when multiple winners, "wins" for single winner
  const winText = winners.length > 1 ? 'split' : 'wins';
  const perWinnerAmount = winners.length > 1 ? Math.floor(pot / winners.length) : pot;
  
  const history: HandHistoryItem = {
    id: `hand_${Date.now()}`,
    summary: winners.length > 1 
      ? `${names} split ${pot} (${perWinnerAmount} each) with ${rank}`
      : `${names} wins ${pot} with ${rank}`,
    pot,
    winningPlayerIds: winners.map(w => w.id),
    streetActions: [{ street: state.street, events: [`${names} ${winText} with ${rank}`] }],
  };
  
  // Emit hand:ended immediately (winner shown instantly)
  io.to(roomCode).emit('hand:ended', { history });
  
  // Start countdown timer immediately (3, 2, 1) above the winner display
  const activePlayers = state.players.filter(p => p.stack > 0);
  if (activePlayers.length >= 2) {
    console.log(`🎮 Starting countdown for next hand - ${activePlayers.length} active players`);
    // Start countdown from 3
    let countdown = 3;
    io.to(roomCode).emit('countdown', countdown);
    
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        io.to(roomCode).emit('countdown', countdown);
      } else {
        clearInterval(countdownInterval);
        io.to(roomCode).emit('countdown', null);
      }
    }, 1000);
    
    // Store interval reference to clear it if needed
    // The interval will complete after 3 seconds
  }
  
  // Start pot emptying animation immediately (pot decreases slowly)
  // Pot value stays the same in state during animation
  io.to(roomCode).emit('pot:empty');
  
  // After pot empties (1.5 seconds), give money to winner with animation
  setTimeout(() => {
    // Store winner info before updating
    const winnerAmounts = winners.map((w, i) => ({
      playerId: w.id,
      amount: perWinner + (i < remainder ? 1 : 0)
    }));
    
    // Store old stack values for animation
    const oldStacks = new Map(winners.map(w => [w.id, w.stack]));
    
    // Update stacks (will be animated on frontend via NumberFlow)
    winners.forEach((w, i) => {
      w.stack += perWinner + (i < remainder ? 1 : 0);
    });
    
    // Set pot to 0 after emptying animation completes
    state.pot = 0;
    
    // Emit state with updated stacks (NumberFlow will animate the increase)
    io.to(roomCode).emit('table:state', state);
    
    // Emit event for pot-to-winner animation (money being added to stack)
    io.to(roomCode).emit('pot:to:winner', {
      winnerIds: winners.map(w => w.id),
      amount: pot,
      winnerAmounts: winnerAmounts,
      oldStacks: Object.fromEntries(oldStacks)
    });
    
    // Reset cards immediately after money is distributed (cards turn back/face down)
    // Clear all cards - reset to face down
    state.players.forEach(p => {
      p.holeCards = [];
      p.currentBet = 0;
      p.hasFolded = false;
      p.hasActedThisRound = false;
      p.isTurn = false;
    });
    state.community = [];
    state.street = 'preflop';
    state.minBet = 0;
    state.toActPlayerId = undefined;
    
    // Emit state with cleared cards
    io.to(roomCode).emit('table:state', state);
    
    // Check if we have enough players to start next hand
    // Countdown already started above, now start the hand after countdown completes (3 seconds total)
    const activePlayersAfterReset = state.players.filter(p => p.stack > 0);
    if (activePlayersAfterReset.length >= 2) {
      // Wait for countdown to finish (3 seconds from when it started)
      // Since we're already 1.5 seconds in, wait another 1.5 seconds
      setTimeout(() => {
        console.log(`🎮 Starting next hand - ${activePlayersAfterReset.length} active players`);
        startHand(state, roomCode);
      }, 1500);
    } else {
      console.log(`⏸️ Waiting for more players - ${activePlayersAfterReset.length} active players (need 2)`);
      // Clear countdown if not enough players
      io.to(roomCode).emit('countdown', null);
    }
  }, 1500);
}

// ==================== SOCKET HANDLERS ====================

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('room:create', (settings: any) => {
    const roomCode = settings.roomCode || Math.random().toString(36).substring(2, 8).toUpperCase();
    const state = createInitialState(roomCode, settings);
    rooms.set(roomCode, state);
    socket.emit('room:created', { roomCode });
  });

  socket.on('room:join', ({ roomCode, name }: { roomCode: string; name: string }) => {
    let state = rooms.get(roomCode);
    if (!state) {
      state = createInitialState(roomCode, { game: 'texas', bigBlind: 10, buyIn: 1000 });
      rooms.set(roomCode, state);
    }

    if (state.players.length >= 7) {
      socket.emit('error', { message: 'Table is full' });
      return;
    }

    const playerId = `player_${socket.id}`;
    if (state.players.find(p => p.id === playerId)) {
      io.to(roomCode).emit('table:state', state);
      return;
    }

    const newPlayer: Player = {
      id: playerId,
      name: name || `Player ${state.players.length + 1}`,
      avatar: ['👨', '👩', '🧑', '👴', '👵'][state.players.length % 5],
      stack: 1000,
      seat: state.players.length,
      isDealer: state.players.length === 0,
      isTurn: false,
      connected: true,
    };

    state.players.push(newPlayer);
    playerRooms.set(socket.id, roomCode);
    socket.join(roomCode);
    socket.emit('player:id', { playerId });

    // Check if game is in progress
    const gameInProgress = state.players.some(p => p.holeCards && p.holeCards.length > 0) ||
                          state.toActPlayerId || state.pot > 0 || state.community.length > 0;

    // When 2nd player joins, start the game immediately
    if (state.players.length >= 2 && !gameInProgress) {
      startHand(state, roomCode);
    } else {
      io.to(roomCode).emit('table:state', state);
    }
  });

  socket.on('player:action', ({ action }: { action: ClientAction }) => {
    const roomCode = playerRooms.get(socket.id);
    if (!roomCode) return;

    const state = rooms.get(roomCode);
    if (!state) return;

    const playerId = `player_${socket.id}`;
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    if (state.toActPlayerId !== playerId) return;
    if (!player.holeCards || player.holeCards.length === 0 || player.hasFolded) return;

    const success = handleAction(state, player, action, roomCode);
    if (!success) return;

    moveToNextPlayer(state, roomCode);
  });

  socket.on('player:rebuy', () => {
    const roomCode = playerRooms.get(socket.id);
    if (!roomCode) return;

    const state = rooms.get(roomCode);
    if (!state) return;

    const playerId = `player_${socket.id}`;
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    player.stack = 1000;

    // Clear any remaining cards if they exist (reset state)
    const hasCards = state.players.some(p => p.holeCards && p.holeCards.length > 0) || state.community.length > 0;
    if (hasCards) {
      state.players.forEach(p => {
        p.holeCards = [];
        p.currentBet = 0;
        p.hasFolded = false;
        p.hasActedThisRound = false;
        p.isTurn = false;
      });
      state.community = [];
      state.street = 'preflop';
      state.minBet = 0;
      state.pot = 0;
      state.toActPlayerId = undefined;
    }

    // Check if game is in progress (more strict check)
    const gameInProgress = state.toActPlayerId !== undefined && state.toActPlayerId !== null;
    
    // Count active players (with stack > 0)
    const activePlayers = state.players.filter(p => p.stack > 0);

    // If no game in progress and we have at least 2 active players, start a new hand immediately
    if (!gameInProgress && activePlayers.length >= 2) {
      console.log(`🎮 Starting hand immediately after rebuy - ${activePlayers.length} active players`);
      // Emit cleared state first
      io.to(roomCode).emit('table:state', state);
      // Small delay to ensure state is updated, then start hand
      setTimeout(() => {
        startHand(state, roomCode);
      }, 200);
    } else {
      // Just update state - player will join next hand
      console.log(`💰 Player ${player.name} rebought. Game in progress: ${gameInProgress}, Active players: ${activePlayers.length}`);
      io.to(roomCode).emit('table:state', state);
    }
  });

  socket.on('disconnect', () => {
    const roomCode = playerRooms.get(socket.id);
    if (!roomCode) return;

    const state = rooms.get(roomCode);
    if (!state) return;

    const playerId = `player_${socket.id}`;
    const leavingPlayer = state.players.find(p => p.id === playerId);
    if (!leavingPlayer) {
      playerRooms.delete(socket.id);
      return;
    }

    const gameInProgress = state.players.some(p => p.holeCards && p.holeCards.length > 0) &&
                          (state.pot > 0 || state.toActPlayerId);
    const playerInHand = leavingPlayer.holeCards && leavingPlayer.holeCards.length > 0;
    const wasTheirTurn = state.toActPlayerId === playerId;

    if (gameInProgress && playerInHand && wasTheirTurn) {
      leavingPlayer.hasFolded = true;
      moveToNextPlayer(state, roomCode);
    }

    state.players = state.players.filter(p => p.id !== playerId);
    playerRooms.delete(socket.id);
    io.to(roomCode).emit('player:left', { playerId });
    io.to(roomCode).emit('table:state', state);
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5050;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Socket server running on port ${PORT}`);
  console.log(`🌐 CORS origins: ${process.env.CORS_ORIGIN || '*'}`);
});
