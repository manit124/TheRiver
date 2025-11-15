'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { useRouter } from 'next/navigation';

interface TexasHoldemRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TexasHoldemRulesDialog({ open, onOpenChange }: TexasHoldemRulesDialogProps) {
  const router = useRouter();

  // Dialog size reducers - adjust these values to change dialog size
  // Width options: 'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg' (default), 'max-w-xl', 'max-w-2xl'
  // Width percentage: 'w-[50vw]', 'w-[60vw]' (default), 'w-[70vw]', 'w-[80vw]'
  // Height percentage: 'h-[40vh]', 'h-[45vh]' (default), 'h-[50vh]', 'h-[60vh]'
  const dialogMaxWidth = 'max-w-lg';
  const dialogWidth = 'w-[60vw]';
  const dialogHeight = 'h-[45vh]';

  const handleJoin = () => {
    onOpenChange(false);
    // Navigate to fixed tables lobby
    router.push('/lobby?game=texas');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${dialogMaxWidth} ${dialogWidth} ${dialogHeight} overflow-y-auto bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] rounded-lg`}
      >
        <DialogTitle className="sr-only">Texas Hold&apos;em Rules</DialogTitle>
        <div className="p-2 font-mono">
          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-white mb-2 font-mono">TEXAS HOLD&apos;EM</h2>
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto" />
          </div>

          {/* Rules Content */}
          <div className="space-y-5 text-white/90 font-mono">
            <section>
              <h3 className="text-lg font-semibold text-white mb-2 font-mono">HOW TO PLAY</h3>
              <div className="space-y-2 text-white/80 text-sm leading-relaxed font-mono">
                <div>• Get 2 hole cards, use 5 community cards</div>
                <div>• Make best 5-card hand</div>
                <div>• Bet, call, raise, or fold each round</div>
                <div>• Best hand wins the pot</div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-2 font-mono">HAND RANKINGS</h3>
              <div className="space-y-1 text-white/80 text-sm leading-relaxed font-mono">
                <div>Royal Flush → Straight Flush → Four of a Kind</div>
                <div>Full House → Flush → Straight</div>
                <div>Three of a Kind → Two Pair → One Pair → High Card</div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-2 font-mono">ACTIONS</h3>
              <div className="space-y-1 text-white/80 text-sm leading-relaxed font-mono">
                <div>Check / Bet / Call / Raise / Fold / All-In</div>
              </div>
            </section>
          </div>

          {/* Spacer - adjust h-12 to move button up (lower number) or down (higher number) */}
          <div className="h-5"></div>

          {/* Join Button */}
          <div className="pb-4 flex justify-center">
            <InteractiveHoverButton
              onClick={handleJoin}
              text="Click to Join"
              className="w-40 max-w-xs px-6 py-4 min-h-10 text-sm"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

