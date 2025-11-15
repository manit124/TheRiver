'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { HyperText } from '@/components/HyperText';
import { createClient } from '@/lib/supabase/client';
import { generateRoomCode } from '@/lib/utils';

interface TableOption {
  id: string;
  stakes: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
}

const TABLE_OPTIONS: TableOption[] = [
  {
    id: 'table-1',
    stakes: '1/2',
    smallBlind: 1,
    bigBlind: 2,
    minBuyIn: 40,
    maxBuyIn: 200,
  },
  {
    id: 'table-2',
    stakes: '5/10',
    smallBlind: 5,
    bigBlind: 10,
    minBuyIn: 200,
    maxBuyIn: 1000,
  },
  {
    id: 'table-3',
    stakes: '50/100',
    smallBlind: 50,
    bigBlind: 100,
    minBuyIn: 2000,
    maxBuyIn: 10000,
  },
  {
    id: 'table-4',
    stakes: '500/1k',
    smallBlind: 500,
    bigBlind: 1000,
    minBuyIn: 20000,
    maxBuyIn: 100000,
  },
  {
    id: 'table-5',
    stakes: '2k/4k',
    smallBlind: 2000,
    bigBlind: 4000,
    minBuyIn: 80000,
    maxBuyIn: 400000,
  },
  {
    id: 'table-6',
    stakes: '5k/10k',
    smallBlind: 5000,
    bigBlind: 10000,
    minBuyIn: 200000,
    maxBuyIn: 1000000,
  },
  {
    id: 'table-7',
    stakes: '25k/50k',
    smallBlind: 25000,
    bigBlind: 50000,
    minBuyIn: 1000000,
    maxBuyIn: 5000000,
  },
];

interface TableSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameType?: string;
  userChips?: number;
  onJoinTable?: (table: TableOption) => void;
}

export function TableSelectorDialog({ 
  open, 
  onOpenChange, 
  gameType = 'texas',
  userChips: initialUserChips = 0,
  onJoinTable 
}: TableSelectorDialogProps) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [userChips, setUserChips] = useState(initialUserChips);
  const selectedTable = TABLE_OPTIONS[selectedIndex];

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
    }
  }, [open]);

  // Dialog size reducers - adjust these values to change dialog size
  // Width options: 'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl'
  // Width percentage: 'w-[40vw]', 'w-[50vw]', 'w-[60vw]' (default), 'w-[70vw]', 'w-[80vw]'
  // Height percentage: 'h-[50vh]', 'h-[60vh]' (default), 'h-[70vh]', 'h-[80vh]'
  const dialogMaxWidth = 'max-w-2xl';
  const dialogWidth = 'w-[30vw]';
  const dialogHeight = 'h-[45vh]';

  // Button size reducer - adjust button width
  // Options: 'w-32', 'w-40', 'w-48', 'w-52' (default), 'w-56', 'w-64', 'w-72', 'w-full'
  const buttonWidth = 'w-48';

  // Button position mover - adjust spacing above button
  // Options: 'h-4', 'h-6', 'h-8' (default), 'h-10', 'h-12', 'h-16'
  const buttonSpacer = 'h-11';

  // Bar gap reducer - adjust spacing between bars
  // Options: 'gap-1', 'gap-1.5', 'gap-2' (default), 'gap-2.5', 'gap-3', 'gap-4'
  const barGap = 'gap-6';

  // Content position mover - adjust vertical position of all content (Your Chips, Stakes, Buy-in, Bars)
  // Options: 'pt-0', 'pt-2', 'pt-4', 'pt-6', 'pt-8' (default), 'pt-10', 'pt-12', 'pt-16', 'pt-20'
  const contentTopMover = 'pt-16';

  // Content centering mover - adjust vertical centering
  // Options: 'my-auto' (centered), 'my-0' (top), 'my-4', 'my-8', 'my-12', 'my-16' (higher = more space from edges)
  // Set to empty string '' to disable centering and use contentTopMover instead
  const contentCenterMover = 'my-auto';

  // Your Chips position mover - adjust vertical position of "Your Chips" only (moves it up)
  // Options: '-translate-y-0', '-translate-y-1', '-translate-y-2', '-translate-y-3', '-translate-y-4', '-translate-y-6', '-translate-y-8', '-translate-y-10', '-translate-y-12'
  // Higher numbers = move up more
  const chipsPositionMover = '-translate-y-4';

  const handleJoin = async () => {
    if (!canJoin) {
      return;
    }

    // Generate random room code
    const roomCode = generateRoomCode();
    const buyInAmount = userChips >= selectedTable.maxBuyIn ? selectedTable.maxBuyIn : selectedTable.minBuyIn;

    if (onJoinTable) {
      onJoinTable({ ...selectedTable, id: roomCode });
    } else {
      router.push(`/table/${roomCode}?stakes=${selectedTable.stakes}&buyIn=${buyInAmount}&bigBlind=${selectedTable.bigBlind}&smallBlind=${selectedTable.smallBlind}&minBuyIn=${selectedTable.minBuyIn}&maxBuyIn=${selectedTable.maxBuyIn}`);
    }
    onOpenChange(false);
  };

  const canJoin = userChips >= selectedTable.minBuyIn;

  // Total bars to display (7 bars total)
  const totalBars = 7;
  // All 7 bars are clickable
  const clickableIndices = [0, 1, 2, 3, 4, 5, 6]; // All indices are clickable

  // Helper function to format numbers (2000 -> "2k", 10000 -> "10k", etc.)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(0)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}k`;
    }
    return num.toString();
  };

  const getBarInfo = (index: number) => {
    const isClickable = clickableIndices.includes(index);
    const tableIndex = isClickable ? index : -1;
    const isSelected = isClickable && tableIndex === selectedIndex;
    const canAffordTable = isClickable && userChips >= TABLE_OPTIONS[tableIndex].minBuyIn;
    
    // Bars are smaller by default, increase when selected
    const height = isSelected ? 'h-13' : 'h-8';
    
    // Bars are thinner by default, slightly wider when selected
    const width = isSelected ? 'w-1.5' : 'w-1';
    
    // Opacities
    const opacity = isSelected 
      ? 'opacity-100' 
      : isClickable 
        ? 'opacity-60' 
        : 'opacity-30';
    
    return { 
      isClickable, 
      tableIndex, 
      isSelected, 
      canAffordTable,
      height, 
      opacity, 
      width
    };
  };

  const handleBarClick = (index: number) => {
    if (clickableIndices.includes(index)) {
      // Index directly maps to tableIndex (0-6 for all 7 tables)
      setSelectedIndex(index);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogMaxWidth} ${dialogWidth} ${dialogHeight} overflow-y-auto bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] rounded-lg p-8 font-mono flex flex-col justify-center`}>
        <DialogTitle className="sr-only">Select Table</DialogTitle>
        
        <div className={`space-y-12 ${contentCenterMover ? contentCenterMover : contentTopMover}`}>
          {/* Your Chips */}
          {userChips > 0 && (
            <div className={`text-center transform ${chipsPositionMover}`}>
              <p className="text-white/60 font-mono text-sm">
                Your Chips: <span className="text-white font-semibold">{userChips.toLocaleString()}</span>
              </p>
            </div>
          )}

          {/* Selected Table Info - Centered */}
          <div className="text-center space-y-6">
            <div>
              <div className="text-white/50 text-xs font-mono mb-1 uppercase tracking-wider">Stakes</div>
              <div className={`text-3xl font-bold font-mono ${canJoin ? 'text-green-400' : 'text-red-400'}`}>{selectedTable.stakes}</div>
            </div>
            <div>
              <div className="text-white/50 text-xs font-mono mb-1 uppercase tracking-wider">Buy-in</div>
              <div className="text-3xl font-bold text-white font-mono">
                {formatNumber(selectedTable.minBuyIn)} / {formatNumber(selectedTable.maxBuyIn)}
              </div>
            </div>
          </div>

          {/* Slider Bar */}
          <div className="space-y-4">
            <div className={`flex items-end justify-center ${barGap} h-20 relative`}>
              {Array.from({ length: totalBars }).map((_, index) => {
                const { isClickable, tableIndex, isSelected, canAffordTable, height, opacity, width } = getBarInfo(index);
                
                return (
                  <div key={index} className="flex flex-col items-center justify-end">
                    <button
                      onClick={() => handleBarClick(index)}
                      disabled={!isClickable}
                      className={`${width} ${height} rounded-sm transition-all duration-300 ${
                        isSelected 
                          ? canAffordTable
                            ? 'bg-green-400 opacity-100 shadow-[0_0_15px_rgba(74,222,128,0.6)] scale-110'
                            : 'bg-red-400 opacity-100 shadow-[0_0_15px_rgba(239,68,68,0.6)] scale-110'
                          : isClickable
                            ? `bg-white ${opacity} cursor-pointer hover:opacity-100 hover:scale-105`
                            : `bg-white ${opacity} cursor-default`
                      }`}
                      aria-label={isClickable ? `Select ${TABLE_OPTIONS[tableIndex].stakes} stakes table` : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Button Spacer - adjust h-8 to move button up (lower number) or down (higher number) */}
          <div className={buttonSpacer}></div>

          {/* Join Button */}
          <div className="flex justify-center">
            <button
              onClick={handleJoin}
              disabled={!canJoin}
              className={`group relative ${buttonWidth} overflow-hidden rounded-lg backdrop-blur-md px-6 py-4 text-center font-semibold transition-all duration-300 min-h-12 shadow-lg ${
                canJoin
                  ? 'border border-green-400/30 bg-green-500/20 text-green-400 cursor-pointer hover:bg-green-500/30 hover:border-green-400/40 hover:text-green-300'
                  : 'border border-red-400/30 bg-red-500/20 text-red-400 cursor-not-allowed opacity-60'
              } disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-red-500/20 disabled:hover:border-red-400/30`}
            >
              {canJoin ? (
                <>
                  <span className="inline-block translate-x-1 transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
                    <HyperText
                      text="Join Table"
                      className="text-green-400 font-semibold font-mono"
                      animateOnLoad={false}
                    />
                  </span>
                  <div className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-green-400 opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100">
                    <HyperText
                      text="Join Table"
                      className="text-green-400 font-semibold font-mono"
                      animateOnLoad={false}
                    />
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </>
              ) : (
                <span className="font-mono">
                  Insufficient Chips (Need {formatNumber(selectedTable.minBuyIn)})
                </span>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

