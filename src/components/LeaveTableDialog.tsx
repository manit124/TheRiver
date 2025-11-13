'use client';

import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { HyperText } from '@/components/HyperText';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { Button } from '@/components/ui/button';
import { useTableStore } from '@/store/useTableStore';

interface LeaveTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeaveTableDialog({ open, onOpenChange }: LeaveTableDialogProps) {
  const router = useRouter();
  const disconnect = useTableStore((state) => state.disconnect);

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
                text="Leave"
                className="flex-1 rounded-r-none min-h-12 py-6"
              />
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
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

