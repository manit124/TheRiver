'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { HyperText } from '@/components/HyperText';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { Button } from '@/components/ui/button';
import { useTableStore } from '@/store/useTableStore';
import { createClient } from '@/lib/supabase/client';
import { useState, Suspense } from 'react';

interface LeaveTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  originalBuyIn?: number; // Original buy-in amount when joining
}

function LeaveTableDialogContent({ open, onOpenChange, userId, originalBuyIn }: LeaveTableDialogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const disconnect = useTableStore((state) => state.disconnect);
  const state = useTableStore((state) => state.state);
  const playerId = useTableStore((state) => state.playerId);
  const [loading, setLoading] = useState(false);

  const handleLeave = async () => {
    setLoading(true);
    
    try {
      // Get player's current stack
      const currentPlayer = state?.players.find((p) => p.id === playerId);
      const remainingStack = currentPlayer?.stack || 0;

      // Use originalBuyIn prop if provided, otherwise try to get from URL params
      let actualBuyIn = originalBuyIn || 0;
      if (!actualBuyIn) {
        const buyInAmount = parseInt(searchParams.get('buyIn') || '0');
        const minBuyIn = parseInt(searchParams.get('minBuyIn') || '0');
        const maxBuyIn = parseInt(searchParams.get('maxBuyIn') || '0');
        actualBuyIn = buyInAmount > 0 ? buyInAmount : (minBuyIn > 0 ? minBuyIn : maxBuyIn);
      }

      // Add remaining stack back to user's profile chips
      // When joining, buy-in was deducted from profile chips
      // When leaving, we add back only the remaining stack (not the buy-in amount)
      // Formula: newChips = (current profile chips) + remainingStack
      // Example: User had 10k, joined with 1k (profile now 9k), leaves with 1k -> 9k + 1k = 10k (correct, net profit = 0)
      // Example: User had 10k, joined with 1k (profile now 9k), leaves with 1.5k -> 9k + 1.5k = 10.5k (correct, +500 profit)
      // Example: User had 10k, joined with 550 (profile now 9.45k), leaves with 550 -> 9.45k + 550 = 10k (correct, net profit = 0)
      if (userId) {
        const supabase = createClient();
        
        // Fetch current chips (should already have buy-in deducted when joining)
        const { data: profile } = await supabase
          .from('profiles')
          .select('chips')
          .eq('id', userId)
          .single();

        if (profile) {
          // Add back only the remaining stack (not the buy-in amount)
          // The buy-in was already deducted when joining, so we just add back what's left
          const newChips = profile.chips + remainingStack;
          const netProfit = remainingStack - actualBuyIn;
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ chips: newChips })
            .eq('id', userId);

          if (updateError) {
            console.error('Error adding chips back:', updateError);
            // Still disconnect even if update fails
          } else {
            console.log(`💰 Returning ${remainingStack} chips. Profile chips: ${profile.chips} → ${newChips} (buy-in was ${actualBuyIn}, net profit: ${netProfit >= 0 ? '+' : ''}${netProfit})`);
          }
        }
      }

      disconnect();
      router.push('/');
      onOpenChange(false);
    } catch (error) {
      console.error('Error leaving table:', error);
      // Still disconnect even if update fails
      disconnect();
      router.push('/');
      onOpenChange(false);
    } finally {
      setLoading(false);
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
                    text="Leave Table?"
                    className="text-2xl font-semibold text-white tracking-tight"
                    animateOnLoad={false}
                  />
                </div>
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Are you sure you want to leave this table? You will be disconnected from the game.
              </DialogDescription>
            </CardHeader>
          </DialogHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-0">
              <InteractiveHoverButton
                onClick={handleLeave}
                text={loading ? "Processing..." : "Leave"}
                className="flex-1 rounded-r-none min-h-12 py-6"
                disabled={loading}
              />
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="border-white/20 text-white/70 hover:text-white hover:border-white/30 bg-white/5 min-h-12 py-6 px-6 font-semibold rounded-l-none border-l-0"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

export function LeaveTableDialog({ open, onOpenChange, userId, originalBuyIn }: LeaveTableDialogProps) {
  return (
    <Suspense fallback={null}>
      <LeaveTableDialogContent open={open} onOpenChange={onOpenChange} userId={userId} originalBuyIn={originalBuyIn} />
    </Suspense>
  );
}

