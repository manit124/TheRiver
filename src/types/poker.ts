export type Suit = '♠' | '♥' | '♦' | '♣';

export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

export type Card = { rank: Rank; suit: Suit; id: string };

export type Player = {
  id: string;
  name: string;
  avatar: string;
  stack: number;
  seat: number;
  isDealer: boolean;
  isTurn: boolean;
  connected: boolean;
  holeCards?: Card[];
  hasFolded?: boolean;
  currentBet?: number;
  hasActedThisRound?: boolean;
};

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export type TableState = {
  roomCode: string;
  game: 'texas' | 'omaha';
  bigBlind: number;
  pot: number;
  street: Street;
  players: Player[];
  community: Card[];
  minBet: number;
  maxBet: number;
  toActPlayerId?: string;
};

export type ClientAction = { type: 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE' | 'REBUY'; amount?: number };

export type HandHistoryItem = {
  id: string;
  summary: string;
  pot: number;
  winningPlayerIds: string[];
  streetActions: Array<{ street: Street; events: string[] }>;
};

export type TableSettings = {
  game: 'texas' | 'omaha';
  maxPlayers: number;
  bigBlind: number;
  buyIn: number;
  isPrivate: boolean;
};

