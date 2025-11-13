import { Card, Rank, Suit } from '@/types/poker';

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export type HandRank = 
  | 'High Card'
  | 'Pair'
  | 'Two Pair'
  | 'Three of a Kind'
  | 'Straight'
  | 'Flush'
  | 'Full House'
  | 'Four of a Kind'
  | 'Straight Flush'
  | 'Royal Flush';

export interface HandResult {
  rank: HandRank;
  value: number; // For comparison - encodes hand strength with rank and kickers
  tiebreaker?: number[]; // For breaking ties when value is the same
}

function getRankValue(rank: Rank): number {
  return RANK_VALUES[rank];
}

function countRanks(cards: Card[]): Map<number, number> {
  const counts = new Map<number, number>();
  cards.forEach(card => {
    const value = getRankValue(card.rank);
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return counts;
}

function isFlush(cards: Card[]): boolean {
  if (cards.length < 5) return false;
  const suits = cards.map(c => c.suit);
  return suits.every(suit => suit === suits[0]);
}

function isStraight(cards: Card[]): boolean {
  if (cards.length < 5) return false;
  const values = cards.map(c => getRankValue(c.rank)).sort((a, b) => a - b);
  
  // Check for regular straight
  for (let i = 0; i < values.length - 4; i++) {
    let consecutive = true;
    for (let j = 1; j < 5; j++) {
      if (values[i + j] !== values[i] + j) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) return true;
  }
  
  // Check for A-2-3-4-5 (wheel)
  const hasAce = values.includes(14);
  const has2345 = [2, 3, 4, 5].every(v => values.includes(v));
  return hasAce && has2345;
}

export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandResult {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) {
    return { rank: 'High Card', value: 1000000 };
  }

  // Get all possible 5-card combinations
  const combinations = getCombinations(allCards, 5);
  let bestHand: HandResult = { rank: 'High Card', value: 1000000 };

  combinations.forEach(combo => {
    const hand = evaluateFiveCards(combo);
    if (hand.value > bestHand.value) {
      bestHand = hand;
    }
  });

  return bestHand;
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 1) return arr.map(x => [x]);
  if (k === arr.length) return [arr];
  
  const result: T[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const head = arr[i];
    const tailCombos = getCombinations(arr.slice(i + 1), k - 1);
    tailCombos.forEach(tail => {
      result.push([head, ...tail]);
    });
  }
  return result;
}

function evaluateFiveCards(cards: Card[]): HandResult {
  const rankCounts = countRanks(cards);
  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
  const cardValues = cards.map(c => getRankValue(c.rank)).sort((a, b) => b - a);
  
  // Create a map of rank value to count for easier lookup
  const rankToCount = new Map<number, number>();
  cardValues.forEach(val => {
    rankToCount.set(val, (rankToCount.get(val) || 0) + 1);
  });
  
  // Get ranks sorted by count (most frequent first), then by value
  const sortedByCount = Array.from(rankToCount.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]; // Sort by count first
      return b[0] - a[0]; // Then by rank value
    });
  
  const flush = isFlush(cards);
  const straight = isStraight(cards);
  
  // Royal Flush
  if (flush && straight) {
    const sortedValues = cardValues.sort((a, b) => a - b);
    if (sortedValues[0] === 10 && sortedValues[4] === 14) {
      return { rank: 'Royal Flush', value: 10000000 };
    }
    // Straight Flush - value encodes high card
    const highCard = Math.max(...cardValues);
    return { rank: 'Straight Flush', value: 9000000 + highCard };
  }
  
  // Four of a Kind
  if (counts[0] === 4) {
    const fourKindRank = sortedByCount[0][0];
    const kicker = sortedByCount[1][0];
    return { rank: 'Four of a Kind', value: 8000000 + fourKindRank * 100 + kicker };
  }
  
  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    const threeKindRank = sortedByCount[0][0];
    const pairRank = sortedByCount[1][0];
    return { rank: 'Full House', value: 7000000 + threeKindRank * 100 + pairRank };
  }
  
  // Flush
  if (flush) {
    // Value encodes the 5 highest cards
    const sortedHighToLow = cardValues.sort((a, b) => b - a);
    const value = 6000000 + 
      sortedHighToLow[0] * 10000 + 
      sortedHighToLow[1] * 1000 + 
      sortedHighToLow[2] * 100 + 
      sortedHighToLow[3] * 10 + 
      sortedHighToLow[4];
    return { rank: 'Flush', value };
  }
  
  // Straight
  if (straight) {
    // For A-2-3-4-5 (wheel), high card is 5, not A
    const hasAce = cardValues.includes(14);
    const has2345 = [2, 3, 4, 5].every(v => cardValues.includes(v));
    const highCard = (hasAce && has2345) ? 5 : Math.max(...cardValues);
    return { rank: 'Straight', value: 5000000 + highCard };
  }
  
  // Three of a Kind
  if (counts[0] === 3) {
    const threeKindRank = sortedByCount[0][0];
    const kickers = sortedByCount.slice(1).map(([rank]) => rank).sort((a, b) => b - a);
    return { 
      rank: 'Three of a Kind', 
      value: 4000000 + threeKindRank * 10000 + kickers[0] * 100 + kickers[1] 
    };
  }
  
  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    const pair1Rank = sortedByCount[0][0];
    const pair2Rank = sortedByCount[1][0];
    const kicker = sortedByCount[2][0];
    return { 
      rank: 'Two Pair', 
      value: 3000000 + Math.max(pair1Rank, pair2Rank) * 10000 + Math.min(pair1Rank, pair2Rank) * 100 + kicker 
    };
  }
  
  // Pair
  if (counts[0] === 2) {
    const pairRank = sortedByCount[0][0];
    const kickers = sortedByCount.slice(1).map(([rank]) => rank).sort((a, b) => b - a);
    return { 
      rank: 'Pair', 
      value: 2000000 + pairRank * 10000 + kickers[0] * 100 + kickers[1] * 10 + kickers[2] 
    };
  }
  
  // High Card
  const sortedHighToLow = cardValues.sort((a, b) => b - a);
  const value = 1000000 + 
    sortedHighToLow[0] * 10000 + 
    sortedHighToLow[1] * 1000 + 
    sortedHighToLow[2] * 100 + 
    sortedHighToLow[3] * 10 + 
    sortedHighToLow[4];
  return { rank: 'High Card', value };
}

// Simple win probability estimation based on hand strength
export function estimateWinProbability(handResult: HandResult, street: string, numPlayers: number): number {
  const baseProb: Record<HandRank, number> = {
    'Royal Flush': 0.99,
    'Straight Flush': 0.95,
    'Four of a Kind': 0.90,
    'Full House': 0.80,
    'Flush': 0.70,
    'Straight': 0.60,
    'Three of a Kind': 0.50,
    'Two Pair': 0.40,
    'Pair': 0.30,
    'High Card': 0.15,
  };
  
  let probability = baseProb[handResult.rank];
  
  // Adjust based on street (more cards = more accurate)
  const streetMultiplier: Record<string, number> = {
    'preflop': 0.5,
    'flop': 0.7,
    'turn': 0.85,
    'river': 1.0,
    'showdown': 1.0,
  };
  
  probability *= streetMultiplier[street] || 1.0;
  
  // Adjust for number of players (more players = lower probability)
  probability *= (1 / numPlayers) * 2;
  
  return Math.min(95, Math.max(5, Math.round(probability * 100)));
}

