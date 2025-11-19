'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { HyperText } from '@/components/HyperText';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { Button } from '@/components/ui/button';
import { useTableStore } from '@/store/useTableStore';
import { createClient } from '@/lib/supabase/client';

interface RebuyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRebuy: () => void;
  buyInAmount?: number;
  minBuyIn?: number;
  maxBuyIn?: number;
}

function RebuyDialogContent({ open, onOpenChange, onRebuy, buyInAmount = 1000, minBuyIn, maxBuyIn }: RebuyDialogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const disconnect = useTableStore((state) => state.disconnect);
  const [userChips, setUserChips] = useState<number>(0);
  const [calculatedRebuyAmount, setCalculatedRebuyAmount] = useState<number>(buyInAmount);
  const [canRebuy, setCanRebuy] = useState<boolean>(true);
  
  // Fetch user chips and calculate rebuy amount when dialog opens
  useEffect(() => {
    if (open) {
      const fetchChipsAndCalculate = async () => {
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
              const chips = profile.chips || 0;
              setUserChips(chips);
              
              // Get min/max from props or URL params
              const min = minBuyIn || parseInt(searchParams.get('minBuyIn') || '0');
              const max = maxBuyIn || parseInt(searchParams.get('maxBuyIn') || '0');
              
              // Calculate rebuy amount using same logic as join
              let rebuyAmt: number;
              if (min > 0 && max > 0) {
                if (chips >= max) {
                  rebuyAmt = max;
                  setCanRebuy(true);
                } else if (chips >= min) {
                  rebuyAmt = chips;
                  setCanRebuy(true);
                } else {
                  rebuyAmt = 0;
                  setCanRebuy(false);
                }
              } else if (min > 0) {
                if (chips >= min) {
                  rebuyAmt = chips;
                  setCanRebuy(true);
                } else {
                  rebuyAmt = 0;
                  setCanRebuy(false);
                }
              } else if (max > 0) {
                rebuyAmt = Math.min(chips, max);
                setCanRebuy(chips > 0);
              } else {
                rebuyAmt = buyInAmount > 0 ? Math.min(chips, buyInAmount) : chips;
                setCanRebuy(chips > 0);
              }
              
              setCalculatedRebuyAmount(rebuyAmt);
            }
          }
        } catch (error) {
          console.error('Error fetching chips for rebuy:', error);
        }
      };
      
      fetchChipsAndCalculate();
    }
  }, [open, minBuyIn, maxBuyIn, buyInAmount, searchParams]);
  
  const handleRebuy = () => {
    if (!canRebuy) {
      const min = minBuyIn || parseInt(searchParams.get('minBuyIn') || '0');
      alert(`You need at least ${min} chips to rebuy. You currently have ${userChips} chips.`);
      return;
    }
    onRebuy();
    // Don't close dialog here - let onRebuy handle it after chips are deducted
  };

  const handleLeave = () => {
    disconnect();
    router.push('/');
    onOpenChange(false);
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
                    text="Rebuy?"
                    className="text-2xl font-semibold text-white tracking-tight"
                    animateOnLoad={false}
                  />
                </div>
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Your chips are finished. Would you like to rebuy and continue playing?
              </DialogDescription>
            </CardHeader>
          </DialogHeader>
          <CardContent className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-md p-4 text-center space-y-2">
              <div>
                <p className="text-white/70 text-sm mb-1">Your Chips</p>
                <p className="text-white text-xl font-bold font-mono">{userChips.toLocaleString()}</p>
              </div>
              <div className="h-px bg-white/10" />
              <div>
                <p className="text-white/70 text-sm mb-1">Rebuy Amount</p>
                <p className="text-white text-2xl font-bold font-mono">{calculatedRebuyAmount.toLocaleString()}</p>
              </div>
              {!canRebuy && (
                <p className="text-red-400 text-xs mt-2">
                  You need at least {minBuyIn || parseInt(searchParams.get('minBuyIn') || '0')} chips to rebuy
                </p>
              )}
            </div>

            <div className="flex gap-0">
              <button
                onClick={handleRebuy}
                disabled={!canRebuy}
                className={`flex-1 rounded-r-none min-h-12 py-6 font-mono font-semibold transition-all duration-200 ${
                  canRebuy
                    ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-green-400 hover:text-green-300 cursor-pointer'
                    : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed opacity-60'
                }`}
              >
                {canRebuy ? "Rebuy" : "Insufficient Chips"}
              </button>
              <Button 
                variant="outline" 
                onClick={handleLeave}
                className="border-white/20 text-white/70 hover:text-white hover:border-white/30 bg-white/5 min-h-12 py-6 px-6 font-semibold rounded-l-none border-l-0"
              >
                Leave
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

export function RebuyDialog(props: RebuyDialogProps) {
  return (
    <Suspense fallback={null}>
      <RebuyDialogContent {...props} />
    </Suspense>
  );
}

