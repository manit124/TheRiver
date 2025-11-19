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
    smallBlind: settings.smallBlind || 5,
    bigBlind: settings.bigBlind || 10,
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
  // Check if all players are all-in (all have 0 chips) - if so, no more actions allowed
  // Note: This is different from "at least one all-in" - we only block actions if ALL are all-in
  const playersInHand = getPlayersInHand(state);
  const allAllIn = playersInHand.length > 0 && playersInHand.every(p => p.stack === 0);
  if (allAllIn) {
    console.log('🚫 All players are all-in (0 chips), no more actions allowed');
    return false;
  }
  
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
    // Check if at least one player is all-in (has 0 chips) AND bets are matched
    // If so, reveal all remaining cards even if other players still have chips
    const hasAllInPlayer = playersInHand.some(p => p.stack === 0);
    
    if (hasAllInPlayer && state.community.length < 5) {
      // At least one player is all-in and bets are matched - reveal all remaining cards
      const allInPlayers = playersInHand.filter(p => p.stack === 0);
      const playersWithChips = playersInHand.filter(p => p.stack > 0);
      console.log(`🎯 All-in detected: ${allInPlayers.map(p => p.name).join(', ')} are all-in (0 chips). ${playersWithChips.length > 0 ? `Other players (${playersWithChips.map(p => `${p.name}=${p.stack}`).join(', ')}) have matched bets.` : ''} Revealing all remaining cards.`);
      // Still collect bets first
      const { totalAmount, playerBets } = getBetData(state);
      if (totalAmount > 0 && playerBets.length > 0) {
        io.to(roomCode).emit('betting:round:complete', { 
          totalAmount: totalAmount,
          playerBets: playerBets 
        });
      }
      collectBetsToPot(state);
      io.to(roomCode).emit('table:state', state);
      revealAllCards(state, roomCode);
      return;
    }
    
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
    
    // Collect bets to pot immediately
    console.log(`🎯 Collecting bets to pot. Pot before: ${state.pot}`);
    collectBetsToPot(state);
    console.log(`🎯 Pot after collection: ${state.pot}`);
    // Emit state with updated pot and currentBet = 0
    console.log(`📤 Emitting table:state with pot=${state.pot}`);
    io.to(roomCode).emit('table:state', state);
    
    // Move to next street immediately
    nextStreet(state, roomCode);
    io.to(roomCode).emit('table:state', state);
    return;
  }
  
  // Find next player
  const next = getNextPlayer(state);
  
  if (!next) {
    // Double check if round is complete
    if (isRoundComplete(state)) {
      // Check if at least one player is all-in (has 0 chips) AND bets are matched
      const hasAllInPlayer = playersInHand.some(p => p.stack === 0);
      
      if (hasAllInPlayer && state.community.length < 5) {
        // At least one player is all-in and bets are matched - reveal remaining cards immediately
        const allInPlayers = playersInHand.filter(p => p.stack === 0);
        const playersWithChips = playersInHand.filter(p => p.stack > 0);
        console.log(`🎯 All-in detected (fallback check): ${allInPlayers.map(p => p.name).join(', ')} are all-in. Revealing remaining cards (${state.community.length}/5 open)`);
        const { totalAmount, playerBets } = getBetData(state);
        if (totalAmount > 0 && playerBets.length > 0) {
          io.to(roomCode).emit('betting:round:complete', { 
            totalAmount: totalAmount,
            playerBets: playerBets 
          });
        }
        collectBetsToPot(state);
        io.to(roomCode).emit('table:state', state);
        revealAllCards(state, roomCode);
        return;
      }
      
      const { totalAmount, playerBets } = getBetData(state);
      
      // Emit state FIRST with currentBet values still visible
      io.to(roomCode).emit('table:state', state);
      
      if (totalAmount > 0 && playerBets.length > 0) {
        io.to(roomCode).emit('betting:round:complete', { 
          totalAmount: totalAmount,
          playerBets: playerBets 
        });
      }
      
      // Collect bets to pot immediately
      collectBetsToPot(state);
      io.to(roomCode).emit('table:state', state);
      
      // Move to next street immediately
      nextStreet(state, roomCode);
      io.to(roomCode).emit('table:state', state);
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

  // Post blinds: Use values from state (set when room was created/joined)
  const dealerIndex = state.players.findIndex(p => p.isDealer);
  let sbIndex = (dealerIndex + 1) % state.players.length;
  let bbIndex = (dealerIndex + 2) % state.players.length;
  
  while (state.players[sbIndex].stack === 0 && sbIndex !== dealerIndex) {
    sbIndex = (sbIndex + 1) % state.players.length;
  }
  while (state.players[bbIndex].stack === 0 && bbIndex !== sbIndex) {
    bbIndex = (bbIndex + 1) % state.players.length;
  }
  
  // Use blinds from state, fallback to defaults if not set
  const sb = state.smallBlind || 5;
  const bb = state.bigBlind || 10;
  
  // Post blinds - deduct from stack immediately, show as currentBet
  // Blinds will be collected to pot when betting round completes
  if (state.players[sbIndex].stack >= sb) {
    const oldStack = state.players[sbIndex].stack;
    state.players[sbIndex].stack -= sb;
    state.players[sbIndex].currentBet = sb;
    state.players[sbIndex].hasActedThisRound = false;
    console.log(`🎰 Small blind: ${state.players[sbIndex].name} posts ${sb} (stack: ${oldStack} → ${state.players[sbIndex].stack})`);
  }
  if (state.players[bbIndex].stack >= bb) {
    const oldStack = state.players[bbIndex].stack;
    state.players[bbIndex].stack -= bb;
    state.players[bbIndex].currentBet = bb;
    state.players[bbIndex].hasActedThisRound = false;
    console.log(`🎰 Big blind: ${state.players[bbIndex].name} posts ${bb} (stack: ${oldStack} → ${state.players[bbIndex].stack})`);
  }

  state.street = 'preflop';
  state.pot = 0; // Explicitly reset pot to 0 for new hand
  console.log(`🎰 Starting new hand - pot reset to 0`);
  state.community = [];
  state.minBet = bb; // Big blind is minimum bet
  
  // Small blind acts first (needs to call the difference to match big blind)
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
  } else if (state.street === 'river') {
    // River betting complete - move to showdown and reveal cards
    state.street = 'showdown';
    console.log('🎴 Moving to showdown - revealing all non-folded players\' cards');
    // Emit state with showdown so frontend can reveal cards
    io.to(roomCode).emit('table:state', state);
    // Wait a moment for cards to be revealed, then end the hand
    setTimeout(() => {
      endHand(state, roomCode);
    }, 1000);
    return;
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
  const cardsAlreadyOpen = state.community.length;
  const cardsToReveal = 5 - cardsAlreadyOpen;
  console.log(`🃏 Revealing remaining cards - all players are all-in (${cardsAlreadyOpen}/5 already open, revealing ${cardsToReveal} more)`);
  
  const deck = handDecks.get(roomCode) || shuffleDeck();
  handDecks.set(roomCode, deck);
  const playersInHand = state.players.filter(p => p.holeCards && p.holeCards.length > 0);
  const cardsPerPlayer = state.game === 'omaha' ? 4 : 2;
  const used = playersInHand.length * cardsPerPlayer + cardsAlreadyOpen;
  
  // Reveal all remaining community cards one by one with a delay
  let cardsRevealed = 0;
  const revealNextCard = () => {
    if (state.community.length < 5) {
      state.community.push(deck[used + cardsRevealed]);
      cardsRevealed++;
      
      // Update street based on number of cards
      if (state.community.length === 3) {
        state.street = 'flop';
      } else if (state.community.length === 4) {
        state.street = 'turn';
      } else if (state.community.length === 5) {
        state.street = 'showdown';
      }
      
      // Emit state after each card is revealed
      state.toActPlayerId = undefined; // No more betting since all are all-in
      state.players.forEach(p => p.isTurn = false); // Clear all turns
      io.to(roomCode).emit('table:state', state);
      
      // If more cards to reveal, wait and reveal next one
      if (state.community.length < 5) {
        setTimeout(revealNextCard, 800); // 800ms delay between each card
      } else {
        // All 5 cards revealed, wait a bit then end the hand
        console.log(`🃏 All 5 community cards revealed, ending hand in 1.5 seconds`);
        setTimeout(() => {
          console.log('🃏 Cards revealed, ending hand now');
          endHand(state, roomCode);
        }, 1500);
      }
    }
  };
  
  // Start revealing cards
  revealNextCard();
}

function endHand(state: TableState, roomCode: string) {
  // Ensure we're at showdown (cards should be revealed)
  if (state.street !== 'showdown') {
    state.street = 'showdown';
    console.log('🎴 Setting street to showdown in endHand');
    // Emit state so cards are revealed before showing winner
    io.to(roomCode).emit('table:state', state);
  }
  
  // Collect any remaining bets (should be 0 if collectBetsToPot was called properly)
  // But we check just in case there are any stragglers
  let remainingBets = 0;
  state.players.forEach(p => {
    const bet = p.currentBet || 0;
    if (bet > 0) {
      remainingBets += bet;
      state.pot += bet;
      p.currentBet = 0;
      console.log(`💰 Collecting remaining bet from ${p.name}: ${bet} (pot now: ${state.pot})`);
    }
  });
  
  if (remainingBets > 0) {
    console.log(`⚠️ Warning: Collected ${remainingBets} in remaining bets at endHand`);
  }
  
  console.log(`🎯 EndHand: Final pot = ${state.pot}, Active players: ${state.players.filter(p => !p.hasFolded && p.holeCards && p.holeCards.length > 0).length}`);
  
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
  
  console.log(`🏆 Winners: ${winners.map(w => w.name).join(', ')}, Pot: ${pot}, Per winner: ${perWinner}, Remainder: ${remainder}`);
  console.log(`🏆 Winner stacks BEFORE: ${winners.map(w => `${w.name}=${w.stack}`).join(', ')}`);
  
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
    // IMPORTANT: Only add the pot amount, not the player's existing stack
    winners.forEach((w, i) => {
      const winAmount = perWinner + (i < remainder ? 1 : 0);
      const oldStack = w.stack;
      w.stack += winAmount;
      console.log(`💰 ${w.name}: ${oldStack} + ${winAmount} (from pot) = ${w.stack}`);
    });
    
    console.log(`🏆 Winner stacks AFTER: ${winners.map(w => `${w.name}=${w.stack}`).join(', ')}`);
    
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
    // Normalize room code to uppercase
    const roomCode = (settings.roomCode || Math.random().toString(36).substring(2, 8)).toUpperCase();
    console.log(`🏗️ Creating room: ${roomCode} with settings:`, settings);
    
    // Check if room already exists
    if (rooms.has(roomCode)) {
      console.warn(`⚠️ Room ${roomCode} already exists, updating settings`);
      const existingState = rooms.get(roomCode);
      if (existingState) {
        // Update settings if provided
        if (settings.smallBlind) existingState.smallBlind = settings.smallBlind;
        if (settings.bigBlind) existingState.bigBlind = settings.bigBlind;
        if (settings.buyIn) existingState.maxBet = settings.buyIn;
        if (settings.game) existingState.game = settings.game;
      }
      socket.emit('room:created', { roomCode });
      return;
    }
    
    const state = createInitialState(roomCode, settings);
    rooms.set(roomCode, state);
    console.log(`✅ Room ${roomCode} created successfully`);
    socket.emit('room:created', { roomCode });
  });

  // Check if room exists
  socket.on('room:check', ({ roomCode }: { roomCode: string }) => {
    const normalizedRoomCode = roomCode.toUpperCase();
    const exists = rooms.has(normalizedRoomCode);
    console.log(`🔍 Room check: ${normalizedRoomCode} exists: ${exists}`);
    socket.emit('room:exists', { roomCode: normalizedRoomCode, exists });
  });

  socket.on('room:join', ({ roomCode, name, buyIn, smallBlind, bigBlind, profilePic }: { roomCode: string; name: string; buyIn?: number; smallBlind?: number; bigBlind?: number; profilePic?: string | null }) => {
    // Normalize room code to uppercase for consistency
    const normalizedRoomCode = roomCode.toUpperCase();
    console.log(`📥 room:join received:`, { roomCode, normalizedRoomCode, name, buyIn, smallBlind, bigBlind, buyInType: typeof buyIn });
    let state = rooms.get(normalizedRoomCode);
    
    // Only allow joining existing rooms - don't create new rooms on join
    if (!state) {
      console.error(`❌ Room ${normalizedRoomCode} does not exist. Cannot join.`);
      socket.emit('error', { message: `Room ${normalizedRoomCode} does not exist. Please check the room code.` });
      return;
    }
    
    // Room exists - update settings if needed
    if (state) {
      // If room exists but blinds weren't set, update them from client
      if (smallBlind !== undefined && smallBlind !== null && !state.smallBlind) {
        state.smallBlind = smallBlind;
      }
      if (bigBlind !== undefined && bigBlind !== null && !state.bigBlind) {
        state.bigBlind = bigBlind;
      }
    }

    if (state.players.length >= 7) {
      socket.emit('error', { message: 'Table is full' });
      return;
    }

    const playerId = `player_${socket.id}`;
    const existingPlayer = state.players.find(p => p.id === playerId);
    if (existingPlayer) {
      // Player already exists - update their name and avatar if provided
      if (name) {
        existingPlayer.name = name;
      }
      if (profilePic) {
        existingPlayer.avatar = profilePic;
      }
      // Update buy-in if provided and different
      if (buyIn !== undefined && buyIn !== null && buyIn > 0) {
        existingPlayer.stack = buyIn;
      }
      io.to(normalizedRoomCode).emit('table:state', state);
      socket.emit('player:id', { playerId });
      return;
    }
    
    // Don't create a player if name is 'settings_check' - this is just for fetching table state
    if (name === 'settings_check') {
      // Just emit the table state without creating a player
      socket.emit('table:state', state);
      return;
    }

    // Use buyIn from client if provided
    // If room exists, use existing maxBet as default if buyIn not provided
    // If room doesn't exist, use buyIn or default to 1000
    let playerStack: number;
    if (buyIn !== undefined && buyIn !== null && buyIn > 0) {
      playerStack = buyIn;
    } else if (state.maxBet && state.maxBet > 0) {
      // Room exists - use existing table's maxBet as default
      playerStack = state.maxBet;
    } else {
      // New room - use default
      playerStack = 1000;
    }
    console.log(`🎰 Creating player with stack: ${playerStack} (buyIn received: ${buyIn}, buyIn type: ${typeof buyIn})`);

    
    // Use profile picture if provided, otherwise fallback to emoji
    const avatar = profilePic || ['👨', '👩', '🧑', '👴', '👵'][state.players.length % 5];
    
    const newPlayer: Player = {
      id: playerId,
      name: name || `Player ${state.players.length + 1}`,
      avatar: avatar,
      stack: playerStack,
      seat: state.players.length,
      isDealer: state.players.length === 0,
      isTurn: false,
      connected: true,
    };

    state.players.push(newPlayer);
    playerRooms.set(socket.id, normalizedRoomCode);
    socket.join(normalizedRoomCode);
    socket.emit('player:id', { playerId });

    // Check if game is in progress
    const gameInProgress = state.players.some(p => p.holeCards && p.holeCards.length > 0) ||
                          state.toActPlayerId || state.pot > 0 || state.community.length > 0;

    console.log(`✅ Player ${name} joined room ${normalizedRoomCode}. Total players: ${state.players.length}`);

    // When 2nd player joins, start the game immediately
    if (state.players.length >= 2 && !gameInProgress) {
      startHand(state, normalizedRoomCode);
    } else {
      io.to(normalizedRoomCode).emit('table:state', state);
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

  socket.on('player:rebuy', ({ buyIn }: { buyIn?: number } = {}) => {
    const roomCode = playerRooms.get(socket.id);
    if (!roomCode) return;

    const state = rooms.get(roomCode);
    if (!state) return;

    const playerId = `player_${socket.id}`;
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    // Use buyIn from request, or use maxBet (which stores the buy-in amount), or default to 1000
    const rebuyAmount = buyIn !== undefined && buyIn !== null ? buyIn : (state.maxBet || 1000);
    console.log(`🔄 Rebuy: Setting stack to ${rebuyAmount} (buyIn: ${buyIn}, maxBet: ${state.maxBet})`);
    player.stack = rebuyAmount;

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
