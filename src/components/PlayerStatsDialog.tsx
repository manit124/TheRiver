'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { LogOut, Coins, Activity, User, Camera } from 'lucide-react';
import { ProfilePictureSelector } from '@/components/ProfilePictureSelector';
import Image from 'next/image';

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
  const [showProfilePicSelector, setShowProfilePicSelector] = useState(false);

  // Dialog size controls - adjust width and height
  // Width options: 'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg' (default), 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl'
  // Or use custom width: 'w-[400px]', 'w-[500px]', 'w-[600px]', 'w-[700px]', 'w-[800px]', etc.
  const dialogMaxWidth = 'max-w-2xl';
  const dialogWidth = 'w-[600px]'; // Custom width (leave empty to use max-w, or set like 'w-[500px]')
  
  // Height options: 'h-auto' (default), 'h-[500px]', 'h-[600px]', 'h-[700px]', 'h-[800px]', 'min-h-[500px]', etc.
  const dialogHeight = 'h-auto';

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

  const handleProfilePicChange = () => {
    setShowProfilePicSelector(true);
  };

  const handleProfilePicUpdated = () => {
    setShowProfilePicSelector(false);
    fetchStats(); // Refresh stats to show new profile picture
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`${dialogWidth || dialogMaxWidth} ${dialogHeight} bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border border-white/10 shadow-[0_0_60px_rgba(255,213,74,0.15)] rounded-2xl p-0 overflow-hidden`}>
          <DialogTitle className="sr-only">Player Stats</DialogTitle>
          
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#ffd54a]/5 via-transparent to-transparent pointer-events-none rounded-2xl" />
          
          <div className="relative p-6">
            {/* Header Section - Side by side layout */}
            <div className="flex items-start gap-5 mb-6">
              {/* Profile Avatar Section */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex-shrink-0"
              >
                <div className="relative group">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#ffd54a]/30 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  {/* Avatar container */}
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-2 border-[#ffd54a]/30 flex items-center justify-center shadow-[0_0_20px_rgba(255,213,74,0.15)] overflow-hidden">
                    {stats?.profile_pic ? (
                      stats.profile_pic.startsWith('/') ? (
                        <img 
                          src={stats.profile_pic} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-4xl">{stats.profile_pic}</div>
                      )
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-[#ffd54a]/20 to-[#ffd54a]/5 flex items-center justify-center">
                        <span className="text-2xl font-bold text-[#ffd54a]">
                          {stats?.username?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Change profile pic button overlay */}
                  <button
                    onClick={handleProfilePicChange}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm"
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                </div>
              </motion.div>

              {/* User Info Section */}
              <div className="flex-1 pt-1">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <h2 className="text-xl font-bold text-white mb-1.5 font-mono">Player Stats</h2>
                  {stats && (
                    <h3 className="text-lg font-semibold text-white font-mono mb-0.5">
                      {stats.username}
                    </h3>
                  )}
                  {stats && (
                    <p className="text-white/50 font-mono text-xs mb-3">
                      {stats.email}
                    </p>
                  )}
                  <Button
                    onClick={handleProfilePicChange}
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-[#ffd54a]/30 font-mono text-xs h-7 px-3"
                  >
                    <Camera className="w-3 h-3 mr-1.5" />
                    Change Pic
                  </Button>
                </motion.div>
              </div>
            </div>

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
              transition={{ delay: 0.3, duration: 0.4 }}
              className="space-y-4"
            >
              {/* Stats Grid - Side by side */}
              <div className="grid grid-cols-2 gap-3">
                {/* Chips Section */}
                <motion.div
                  whileHover={{ borderColor: 'rgba(255,213,74,0.4)' }}
                  transition={{ duration: 0.2 }}
                  className="relative bg-gradient-to-br from-[#1a1a1a]/90 to-[#0a0a0a]/90 border border-white/10 rounded-lg p-4 backdrop-blur-sm overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#ffd54a]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Coins className="w-3.5 h-3.5 text-[#ffd54a]" />
                      <h4 className="text-white/70 font-mono text-xs uppercase tracking-wider">
                        Total Chips
                      </h4>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <div className="text-2xl font-bold text-white font-mono tracking-tight">
                        {stats.chips.toLocaleString()}
                      </div>
                      <div className="text-lg opacity-80">🪙</div>
                    </div>
                  </div>
                  
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-[#ffd54a]/10 to-transparent rounded-bl-full opacity-50" />
                </motion.div>

                {/* Total Hands Played */}
                <motion.div
                  whileHover={{ borderColor: 'rgba(255,255,255,0.2)' }}
                  transition={{ duration: 0.2 }}
                  className="relative bg-gradient-to-br from-[#1a1a1a]/90 to-[#0a0a0a]/90 border border-white/10 rounded-lg p-4 backdrop-blur-sm overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Activity className="w-3.5 h-3.5 text-white/60" />
                      <h4 className="text-white/70 font-mono text-xs uppercase tracking-wider">
                        Total Hands
                      </h4>
                    </div>
                    <div className="text-2xl font-bold text-white font-mono tracking-tight">
                      {stats.total_hands_played.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full opacity-50" />
                </motion.div>
              </div>

              {/* Sign Out Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="pt-2"
              >
                <Button
                  onClick={handleSignOut}
                  className="w-full group relative bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] hover:from-[#2a2a2a] hover:to-[#1a1a1a] border border-white/20 hover:border-red-500/50 text-white font-mono transition-all duration-300 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] overflow-hidden py-4"
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

    {/* Profile Picture Selector */}
    {userId && (
      <ProfilePictureSelector
        open={showProfilePicSelector}
        onOpenChange={setShowProfilePicSelector}
        userId={userId}
        onComplete={handleProfilePicUpdated}
      />
    )}
    </>
  );
}

