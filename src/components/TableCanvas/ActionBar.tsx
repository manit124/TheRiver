'use client';

import { useState, useEffect, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { NumberFlowSlider } from '@/components/ui/number-flow-slider';
import { TableState } from '@/types/poker';
import { useTableStore } from '@/store/useTableStore';
import { motion } from 'framer-motion';

interface ActionBarProps {
  tableState: TableState;
  playerId: string;
}

export function ActionBar({ tableState, playerId }: ActionBarProps) {
  const sendAction = useTableStore((state) => state.sendAction);
  // Use useMemo to prevent recalculation on every render unless dependencies change
  const currentPlayer = useMemo(() => 
    tableState.players.find((p) => p.id === playerId),
    [tableState.players, playerId]
  );
  const [betAmount, setBetAmount] = useState(tableState.minBet || 0);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState((tableState.minBet || 0) * 2);

  const isMyTurn = tableState.toActPlayerId === playerId;
  const hasFolded = currentPlayer?.hasFolded || false;
  const isAllIn = currentPlayer ? currentPlayer.stack === 0 : false;
  
  // Game state checks - game has started if players have cards OR there are community cards OR pot > 0
  const playersHaveCards = tableState.players.some(p => p.holeCards && p.holeCards.length > 0);
  const hasCommunityCards = tableState.community && tableState.community.length > 0;
  const hasPot = (tableState.pot || 0) > 0;
  const hasBlindsOrBets = (tableState.minBet || 0) > 0 || tableState.players.some(p => (p.currentBet || 0) > 0);
  
  // Game has started if: players have cards AND (there are community cards OR pot exists OR blinds/bets posted OR someone needs to act)
  const gameStarted = playersHaveCards && 
                      (hasCommunityCards || hasPot || hasBlindsOrBets || tableState.toActPlayerId);
  const playerHasCards = currentPlayer?.holeCards && currentPlayer.holeCards.length > 0;
  const hasEnoughPlayers = tableState.players.length >= 2;

  useEffect(() => {
    setBetAmount(tableState.minBet || 0);
    setShowRaiseSlider(false);
  }, [tableState.minBet, tableState.toActPlayerId]);

  const handleFold = () => {
    if (!isMyTurn || hasFolded) return;
    sendAction({ type: 'FOLD' });
  };

  const handleCheck = () => {
    if (!isMyTurn) return;
    sendAction({ type: 'CHECK' });
  };

  const handleCall = () => {
    if (!isMyTurn || !currentPlayer) return;
    const callAmount = Math.min(
      (tableState.minBet || 0) - (currentPlayer.currentBet || 0),
      currentPlayer.stack
    );
    if (callAmount > 0) {
      sendAction({ type: 'CALL', amount: callAmount });
    }
  };

  const handleBet = () => {
    if (!isMyTurn || !currentPlayer) return;
    sendAction({ type: 'BET', amount: betAmount });
  };

  const handleRaise = () => {
    if (!isMyTurn || !currentPlayer) return;
    if (showRaiseSlider) {
      sendAction({ type: 'RAISE', amount: raiseAmount });
      setShowRaiseSlider(false);
    } else {
      setShowRaiseSlider(true);
      setRaiseAmount(Math.max((tableState.minBet || 0) * 2, (tableState.minBet || 0) + (tableState.bigBlind || 10)));
    }
  };

  const handleRaiseCancel = () => {
    setShowRaiseSlider(false);
  };

  // Calculate button states - but ALWAYS show buttons
  const isBigBlind = currentPlayer && 
                     (currentPlayer.currentBet || 0) === (tableState.minBet || 0) && 
                     (tableState.minBet || 0) === (tableState.bigBlind || 10) && 
                     tableState.street === 'preflop';
  
  const actualCallAmount = currentPlayer 
    ? Math.min((tableState.minBet || 0) - (currentPlayer.currentBet || 0), currentPlayer.stack)
    : 0;
  
  // Determine which buttons should be enabled
  // Simplified: buttons are enabled if it's your turn, you have cards, game has started, and action is legal
  const canCheck = isMyTurn && !hasFolded && !isAllIn && playerHasCards && gameStarted && hasEnoughPlayers &&
                   ((tableState.minBet || 0) === 0 || isBigBlind);
  const canCall = isMyTurn && !hasFolded && !isAllIn && playerHasCards && gameStarted && hasEnoughPlayers &&
                  (tableState.minBet || 0) > 0 && actualCallAmount > 0 && !isBigBlind;
  // Extract values for consistency
  const minBet = tableState.minBet || 0;
  const bigBlind = tableState.bigBlind || 10;
  const playerStack = currentPlayer?.stack || 0;
  const playerCurrentBet = currentPlayer?.currentBet || 0;
  
  // Calculate if player can afford actions
  const canAffordBet = playerStack >= bigBlind;
  const canAffordRaise = minBet > 0 && playerStack >= (minBet + bigBlind);
  const minRaiseAmount = minBet > 0 ? minBet + bigBlind : bigBlind;
  
  // Button enable conditions - simpler logic
  const canBet = isMyTurn && !hasFolded && !isAllIn && playerHasCards && gameStarted && hasEnoughPlayers &&
                 minBet === 0 && currentPlayer && canAffordBet;
  
  const canRaise = isMyTurn && !hasFolded && !isAllIn && playerHasCards && gameStarted && hasEnoughPlayers &&
                   minBet > 0 && currentPlayer && canAffordRaise;
  
  const canFold = isMyTurn && !hasFolded && !isAllIn && playerHasCards && gameStarted && hasEnoughPlayers;

  // Determine which buttons should be visible
  // Standard poker behavior:
  // - When minBet = 0: Show Check, Bet, Fold
  // - When minBet > 0: Show Call, Raise, Fold
  
  const showCheck = minBet === 0 || isBigBlind;
  const showCall = minBet > 0 && !isBigBlind;
  const showBet = minBet === 0;
  // Show Raise when minBet > 0, show Bet when minBet = 0
  // Always show this button (either Bet or Raise), but it will be disabled if conditions aren't met
  const showRaise = minBet > 0;
  const showBetButton = minBet === 0;

  // Always render buttons - never return null or different layouts
  return (
    <div className="flex flex-col gap-3 min-h-[120px]">
      {/* Action Buttons Container - Fixed height to prevent layout shifts */}
      <div className="flex flex-col gap-2" style={{ transform: 'translateX(-30px)' }}>
        {/* Raise Slider Bar */}
        {showRaiseSlider && currentPlayer && canRaise && (
          <div className="flex flex-col items-center gap-3 mb-2">
            <div className="flex items-center gap-4" style={{ width: '100%', justifyContent: 'center' }}>
              <div style={{ width: '408px', marginRight: 'auto', marginLeft: 'calc(50% - 204px)' }}>
                <NumberFlowSlider
                  value={[raiseAmount]}
                  onValueChange={([value]) => {
                    const increment = tableState.bigBlind || 10;
                    const snapped = Math.floor(value / increment) * increment;
                    const minRaise = (tableState.minBet || 0) + increment;
                    setRaiseAmount(
                      Math.max(minRaise, Math.min(snapped, currentPlayer.stack))
                    );
                  }}
                  min={(tableState.minBet || 0) + (tableState.bigBlind || 10)}
                  max={currentPlayer.stack}
                  step={tableState.bigBlind || 10}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Betting Slider Bar */}
        {canBet && !showRaiseSlider && (
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-white text-sm font-mono">↑ {betAmount}</span>
            <div className="w-[408px]">
              <Slider
                value={[betAmount]}
                onValueChange={([value]) => {
                  const increment = tableState.bigBlind || 10;
                  const snapped = Math.floor(value / increment) * increment;
                  setBetAmount(
                    Math.max(tableState.minBet || 0, Math.min(snapped, currentPlayer?.stack || 0))
                  );
                }}
                min={tableState.minBet || 0}
                max={currentPlayer?.stack || 0}
                step={tableState.bigBlind || 10}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Action Buttons - Only 3 buttons: Check/Call, Raise, X - Always in fixed positions */}
        <div className="flex items-center justify-center min-h-[48px]">
          {/* Check OR Call button - Position 1 (mutually exclusive) */}
          <div className="w-32 h-12 flex items-center justify-center">
            {showCheck ? (
              <button
                onClick={handleCheck}
                disabled={!canCheck}
                className={`w-32 h-12 text-sm font-semibold rounded-xl bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border font-mono flex items-center justify-center transition-all ${
                  canCheck && isMyTurn
                    ? 'border-white/20 text-white hover:border-[#ffd54a]/50 hover:shadow-[0_0_20px_rgba(255,213,74,0.2)] cursor-pointer' 
                    : 'border-white/5 text-white/20 cursor-not-allowed opacity-30'
                }`}
              >
                Check
              </button>
            ) : showCall ? (
              <button
                onClick={handleCall}
                disabled={!canCall}
                className={`w-32 h-12 text-sm font-semibold rounded-xl bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border font-mono flex items-center justify-center transition-all ${
                  canCall && isMyTurn
                    ? 'border-emerald-600/60 text-white hover:border-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer' 
                    : 'border-emerald-600/20 text-white/20 cursor-not-allowed opacity-30'
                }`}
              >
                Call {actualCallAmount > 0 ? actualCallAmount : ''}
              </button>
            ) : null}
          </div>

          {/* Spacer */}
          <div className="w-6" />

          {/* Bet/Raise button - Position 2 - Always visible, shows Bet when minBet=0, Raise when minBet>0 */}
          <div className="w-32 h-12 flex items-center justify-center">
            {showBetButton ? (
              <button
                onClick={handleBet}
                disabled={!canBet}
                className={`w-32 h-12 text-sm font-semibold rounded-xl bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border font-mono flex items-center justify-center transition-all ${
                  canBet
                    ? 'border-white/20 text-white hover:border-[#ffd54a]/50 hover:shadow-[0_0_20px_rgba(255,213,74,0.2)] cursor-pointer' 
                    : 'border-white/5 text-white/20 cursor-not-allowed opacity-30'
                }`}
              >
                Bet
              </button>
            ) : showRaise ? (
              <button
                onClick={handleRaise}
                disabled={!canRaise}
                className={`w-32 h-12 text-sm font-semibold rounded-xl bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border font-mono flex items-center justify-center transition-all ${
                  canRaise
                    ? showRaiseSlider 
                      ? 'border-[#ffd54a]/50 shadow-[0_0_20px_rgba(255,213,74,0.2)] text-white hover:border-[#ffd54a]/50 cursor-pointer' 
                      : 'border-white/20 text-white hover:border-[#ffd54a]/50 hover:shadow-[0_0_20px_rgba(255,213,74,0.2)] cursor-pointer'
                    : 'border-white/5 text-white/20 cursor-not-allowed opacity-30'
                }`}
              >
                {showRaiseSlider ? `Raise ${raiseAmount}` : 'Raise'}
              </button>
            ) : (
              // Placeholder to maintain layout
              <div className="w-32 h-12" />
            )}
          </div>

          {/* Spacer before Fold */}
          <div className="w-6" />

          {/* Fold button (X) - Position 3 */}
          <div className="w-32 h-12 flex items-center justify-center">
            <button
              onClick={showRaiseSlider ? handleRaiseCancel : handleFold}
              disabled={!canFold && !showRaiseSlider}
              className={`w-32 h-12 text-sm font-semibold rounded-xl bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border font-mono flex items-center justify-center transition-all ${
                (canFold || showRaiseSlider) && isMyTurn
                  ? 'border-red-500/50 text-red-400 hover:border-red-500 hover:bg-red-500/10 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] cursor-pointer' 
                  : 'border-red-500/20 text-red-400/20 cursor-not-allowed opacity-30'
              }`}
            >
              {showRaiseSlider ? 'Cancel' : 'X'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
