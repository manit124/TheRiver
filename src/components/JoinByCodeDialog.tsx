'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';
import { HyperText } from '@/components/HyperText';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { createClient } from '@/lib/supabase/client';

interface JoinByCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinByCodeDialog({ open, onOpenChange }: JoinByCodeDialogProps) {
  const [code, setCode] = useState('');
  const [userChips, setUserChips] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
      setError(null);
    }
  }, [open]);

  const handleJoin = async () => {
    if (code.length !== 6) return;

    setLoading(true);
    setError(null);

    try {
      // Check if user is logged in
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to join a table');
        setLoading(false);
        return;
      }

      // Navigate to table - chip validation will happen on the table page
      router.push(`/table/${code.toUpperCase()}`);
      onOpenChange(false);
      setCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to join table');
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
                    text="Join by Code"
                    className="text-2xl font-semibold text-white tracking-tight"
                    animateOnLoad={false}
                  />
                </div>
              </DialogTitle>
              <DialogDescription className="text-white/60">Enter the 6-character room code to join a table.</DialogDescription>
            </CardHeader>
          </DialogHeader>
          <CardContent className="space-y-6">
            {userChips > 0 && (
              <div className="text-center">
                <p className="text-white/60 font-mono text-sm">
                  Your Chips: <span className="text-white font-semibold">{userChips.toLocaleString()}</span>
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="code" className="text-white/90">Room Code</Label>
              <Input
                id="code"
                placeholder="ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                maxLength={6}
                className="text-center text-xl font-mono tracking-widest bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0 focus-visible:outline-none py-3"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-mono text-center">
                {error}
              </div>
            )}

            <InteractiveHoverButton
              onClick={handleJoin}
              text="Join Table"
              className="w-full"
              disabled={code.length !== 6 || loading}
            />
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

