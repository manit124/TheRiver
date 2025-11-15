'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface PlayerStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface PlayerStats {
  username: string;
  email: string;
  profile_pic: string | null;
  chips: number;
  total_hands_played: number;
}

export function PlayerStatsDialog({ open, onOpenChange, userId }: PlayerStatsDialogProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && userId) {
      fetchStats();
    }
  }, [open, userId]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('username, email, profile_pic, chips, total_hands_played')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;
      setStats(data as PlayerStats);
    } catch (err: any) {
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    onOpenChange(false);
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gradient-to-br from-black/80 via-[#0a0a0a]/90 to-black/80 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-lg p-0">
        <DialogTitle className="sr-only">Player Stats</DialogTitle>
        
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 font-mono">Player Stats</h2>
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mb-4" />
            
            {/* Profile Picture */}
            {stats?.profile_pic && (
              <div className="text-6xl mb-4">{stats.profile_pic}</div>
            )}
            
            {/* Username */}
            {stats && (
              <h3 className="text-2xl font-semibold text-white font-mono mb-1">
                {stats.username}
              </h3>
            )}
            {stats && (
              <p className="text-white/60 font-mono text-sm">{stats.email}</p>
            )}
          </div>

          {loading && (
            <div className="text-center text-white/60 font-mono py-8">
              Loading stats...
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-mono mb-6">
              {error}
            </div>
          )}

          {stats && !loading && (
            <div className="space-y-6">
              {/* Chips Section */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white/80 font-mono text-sm uppercase tracking-wider">
                    Total Chips
                  </h4>
                  {/* Coin Emoji */}
                  <div className="text-3xl">🪙</div>
                </div>
                <div className="text-4xl font-bold text-white font-mono">
                  {stats.chips.toLocaleString()}
                </div>
              </div>

              {/* Total Hands Played */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-sm">
                <h4 className="text-white/80 font-mono text-sm uppercase tracking-wider mb-4">
                  Total Hands Played
                </h4>
                <div className="text-4xl font-bold text-white font-mono">
                  {stats.total_hands_played.toLocaleString()}
                </div>
              </div>

              {/* Sign Out Button */}
              <div className="pt-4">
                <Button
                  onClick={handleSignOut}
                  className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono transition-all duration-300 hover:border-white/30"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

