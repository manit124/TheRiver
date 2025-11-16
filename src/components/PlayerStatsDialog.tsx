'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { LogOut, Coins, Activity } from 'lucide-react';

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

  // Dialog size controls - adjust width and height
  // Width options: 'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg' (default), 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl'
  // Or use custom width: 'w-[400px]', 'w-[500px]', 'w-[600px]', 'w-[700px]', 'w-[800px]', etc.
  const dialogMaxWidth = 'max-w-lg';
  const dialogWidth = 'w-[400px]'; // Custom width (leave empty to use max-w, or set like 'w-[500px]')
  
  // Height options: 'h-auto' (default), 'h-[500px]', 'h-[600px]', 'h-[700px]', 'h-[800px]', 'min-h-[500px]', etc.
  const dialogHeight = 'h-[300px]';

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
      <DialogContent className={`${dialogWidth || dialogMaxWidth} ${dialogHeight} bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border border-white/10 shadow-[0_0_60px_rgba(255,213,74,0.15)] rounded-2xl p-0 overflow-visible`}>
        <DialogTitle className="sr-only">Player Stats</DialogTitle>
        
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffd54a]/5 via-transparent to-transparent pointer-events-none rounded-2xl overflow-hidden" />
        
        <div className="relative p-8 overflow-visible">
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-bold text-white mb-6 font-mono tracking-tight">
              Player Stats
            </h2>
            
            {/* Profile Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="relative inline-block mb-4"
            >
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#ffd54a]/30 to-transparent rounded-full blur-xl" />
                {/* Avatar container */}
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-2 border-[#ffd54a]/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,213,74,0.2)] overflow-hidden">
                  {stats?.profile_pic ? (
                    stats.profile_pic.startsWith('/') ? (
                      <img 
                        src={stats.profile_pic} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-5xl">{stats.profile_pic}</div>
                    )
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ffd54a]/20 to-[#ffd54a]/5 flex items-center justify-center">
                      <span className="text-2xl font-bold text-[#ffd54a]">
                        {stats?.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
            
            {/* Username */}
            {stats && (
              <motion.h3 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-2xl font-semibold text-white font-mono mb-1"
              >
                {stats.username}
              </motion.h3>
            )}
            {stats && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="text-white/50 font-mono text-sm"
              >
                {stats.email}
              </motion.p>
            )}
          </motion.div>

          {loading && (
            <div className="text-center text-white/60 font-mono py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#ffd54a]/30 border-t-[#ffd54a] mb-2" />
              <p className="mt-2">Loading stats...</p>
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-mono mb-6 backdrop-blur-sm"
            >
              {error}
            </motion.div>
          )}

          {stats && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="space-y-4 overflow-visible"
            >
              {/* Chips Section */}
              <motion.div
                whileHover={{ scale: 1.01, borderColor: 'rgba(255,213,74,0.4)' }}
                transition={{ duration: 0.2 }}
                className="relative bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80 border border-white/10 rounded-xl p-4 backdrop-blur-sm overflow-hidden group"
              >
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#ffd54a]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="w-3.5 h-3.5 text-[#ffd54a]" />
                      <h4 className="text-white/70 font-mono text-xs uppercase tracking-wider">
                        Total Chips
                      </h4>
                    </div>
                    <div className="text-3xl font-bold text-white font-mono tracking-tight">
                      {stats.chips.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-2xl opacity-80 group-hover:opacity-100 transition-opacity">
                    🪙
                  </div>
                </div>
                
                {/* Decorative corner accent */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#ffd54a]/10 to-transparent rounded-bl-full opacity-50" />
              </motion.div>

              {/* Total Hands Played */}
              <motion.div
                whileHover={{ scale: 1.01, borderColor: 'rgba(255,255,255,0.2)' }}
                transition={{ duration: 0.2 }}
                className="relative bg-gradient-to-br from-[#1a1a1a]/80 to-[#0a0a0a]/80 border border-white/10 rounded-xl p-4 backdrop-blur-sm overflow-hidden group"
              >
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-3.5 h-3.5 text-white/60" />
                    <h4 className="text-white/70 font-mono text-xs uppercase tracking-wider">
                      Total Hands Played
                    </h4>
                  </div>
                  <div className="text-3xl font-bold text-white font-mono tracking-tight">
                    {stats.total_hands_played.toLocaleString()}
                  </div>
                </div>
                
                {/* Decorative corner accent */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full opacity-50" />
              </motion.div>

              {/* Sign Out Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="pt-4"
              >
                <Button
                  onClick={handleSignOut}
                  className="w-full group relative bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] hover:from-[#2a2a2a] hover:to-[#1a1a1a] border border-white/20 hover:border-red-500/50 text-white font-mono transition-all duration-300 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    Sign Out
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

