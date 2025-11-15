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
}

function LeaveTableDialogContent({ open, onOpenChange, userId }: LeaveTableDialogProps) {
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

      // Get buy-in amount from URL params
      const buyInAmount = parseInt(searchParams.get('buyIn') || '0');
      const minBuyIn = parseInt(searchParams.get('minBuyIn') || '0');
      const maxBuyIn = parseInt(searchParams.get('maxBuyIn') || '0');
      
      // Determine the actual buy-in amount used (prefer buyIn, fallback to minBuyIn or maxBuyIn)
      const actualBuyIn = buyInAmount > 0 ? buyInAmount : (minBuyIn > 0 ? minBuyIn : maxBuyIn);

      // Add remaining stack back to user's profile chips
      // Formula: newChips = (current profile chips) + remainingStack
      // This works because current profile chips = original chips - buyInAmount
      // So: newChips = (original - buyIn) + remaining = original - buyIn + remaining
      // Which is correct: player gets back what they had minus what they spent plus what they have left
      if (userId) {
        const supabase = createClient();
        
        // Fetch current chips (should already have buy-in deducted)
        const { data: profile } = await supabase
          .from('profiles')
          .select('chips')
          .eq('id', userId)
          .single();

        if (profile) {
          // Calculate: current profile chips + remaining stack
          // If profile.chips was correctly updated when joining (original - buyIn),
          // then this gives us: (original - buyIn) + remaining = correct final amount
          const newChips = profile.chips + remainingStack;
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ chips: newChips })
            .eq('id', userId);

          if (updateError) {
            console.error('Error adding chips back:', updateError);
            // Still disconnect even if update fails
          } else {
            console.log(`💰 Returning ${remainingStack} chips. Profile chips: ${profile.chips} → ${newChips} (buy-in was ${actualBuyIn})`);
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

export function LeaveTableDialog({ open, onOpenChange, userId }: LeaveTableDialogProps) {
  return (
    <Suspense fallback={null}>
      <LeaveTableDialogContent open={open} onOpenChange={onOpenChange} userId={userId} />
    </Suspense>
  );
}

