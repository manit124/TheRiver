'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { HyperText } from '@/components/HyperText';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { Button } from '@/components/ui/button';
import { useTableStore } from '@/store/useTableStore';

interface RebuyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRebuy: () => void;
  buyInAmount?: number;
}

export function RebuyDialog({ open, onOpenChange, onRebuy, buyInAmount = 1000 }: RebuyDialogProps) {
  const router = useRouter();
  const disconnect = useTableStore((state) => state.disconnect);
  
  const handleRebuy = () => {
    onRebuy();
    onOpenChange(false);
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
            <div className="bg-white/5 border border-white/10 rounded-md p-4 text-center">
              <p className="text-white/70 text-sm mb-1">Buy-in Amount</p>
              <p className="text-white text-2xl font-bold font-mono">{buyInAmount}</p>
            </div>

            <div className="flex gap-0">
              <InteractiveHoverButton
                onClick={handleRebuy}
                text="Rebuy"
                className="flex-1 rounded-r-none min-h-12 py-6"
              />
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

