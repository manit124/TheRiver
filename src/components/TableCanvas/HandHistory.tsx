'use client';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { HandHistoryItem } from '@/types/poker';
import { formatCurrency } from '@/lib/utils';
import { History } from 'lucide-react';

interface HandHistoryProps {
  history: HandHistoryItem[];
}

export function HandHistory({ history }: HandHistoryProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <History className="h-4 w-4" />
          <span className="sr-only">Hand History</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Hand History</SheetTitle>
          <SheetDescription>View past hands and actions</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hands played yet</p>
          ) : (
            history
              .slice()
              .reverse()
              .map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{item.summary}</p>
                      <p className="text-sm text-muted-foreground">Pot: {formatCurrency(item.pot)}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {item.streetActions.map((streetAction, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground">
                        <span className="font-medium">{streetAction.street.toUpperCase()}:</span>{' '}
                        {streetAction.events.join(', ')}
                      </div>
                    ))}
                  </div>
                  {item.winningPlayerIds.length > 0 && (
                    <div className="text-xs text-accent font-semibold">
                      Winner{item.winningPlayerIds.length > 1 ? 's' : ''}: {item.winningPlayerIds.join(', ')}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

