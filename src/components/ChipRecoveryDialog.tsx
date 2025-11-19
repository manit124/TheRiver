'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Coins, Gift, Video, Users, Copy, Check, Star } from 'lucide-react';

interface ChipRecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onChipsUpdated?: () => void;
}

interface RecoveryStats {
  last_daily_claim: string | null;
  review_submitted: boolean;
  ad_watches_today: number;
  last_ad_watch_date: string | null;
  referral_code: string | null;
  referral_rewards_claimed: number;
}

export function ChipRecoveryDialog({ open, onOpenChange, userId, onChipsUpdated }: ChipRecoveryDialogProps) {
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralSuccess, setReferralSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchStats();
    }
  }, [open, userId]);

  const fetchStats = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('last_daily_claim, review_submitted, ad_watches_today, last_ad_watch_date, referral_code, referral_rewards_claimed')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setStats(data as RecoveryStats);
    } catch (err: any) {
      console.error('Error fetching recovery stats:', err);
    }
  };

  const canClaimDaily = () => {
    if (!stats?.last_daily_claim) return true;
    const lastClaim = new Date(stats.last_daily_claim);
    const now = new Date();
    const hoursSinceClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
    return hoursSinceClaim >= 24;
  };

  const canWatchAd = () => {
    if (!stats) return false;
    const today = new Date().toISOString().split('T')[0];
    if (stats.last_ad_watch_date !== today) return true;
    return stats.ad_watches_today < 3;
  };

  const handleDailyClaim = async () => {
    if (!canClaimDaily()) return;
    
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Add 1,000 chips
      const { data: profile } = await supabase
        .from('profiles')
        .select('chips')
        .eq('id', userId)
        .single();

      if (profile) {
        const newChips = (profile.chips || 0) + 1000;
        const { error } = await supabase
          .from('profiles')
          .update({ 
            chips: newChips,
            last_daily_claim: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) throw error;
        
        console.log('✅ Daily claim successful: +1,000 chips');
        await fetchStats();
        onChipsUpdated?.();
      }
    } catch (err: any) {
      console.error('Error claiming daily chips:', err);
      alert('Failed to claim daily chips. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWatchAd = async () => {
    if (!canWatchAd()) return;
    
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Simulate ad watch (in production, integrate with ad service)
      // For now, we'll just grant chips after a short delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('chips, ad_watches_today, last_ad_watch_date')
        .eq('id', userId)
        .single();

      if (profile) {
        const newChips = (profile.chips || 0) + 500;
        const today = new Date().toISOString().split('T')[0];
        const newAdWatches = profile.last_ad_watch_date === today 
          ? (profile.ad_watches_today || 0) + 1 
          : 1;

        const { error } = await supabase
          .from('profiles')
          .update({ 
            chips: newChips,
            ad_watches_today: newAdWatches,
            last_ad_watch_date: today
          })
          .eq('id', userId);

        if (error) throw error;
        
        console.log('✅ Ad watch successful: +500 chips');
        await fetchStats();
        onChipsUpdated?.();
      }
    } catch (err: any) {
      console.error('Error watching ad:', err);
      alert('Failed to process ad watch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (stats?.review_submitted) return;
    if (!reviewText.trim() || reviewRating === 0) {
      alert('Please provide a rating and review text.');
      return;
    }

    setSubmittingReview(true);
    try {
      const supabase = createClient();
      
      // In production, save review to a reviews table
      // For now, we'll just mark as submitted and grant chips
      const { data: profile } = await supabase
        .from('profiles')
        .select('chips')
        .eq('id', userId)
        .single();

      if (profile) {
        const newChips = (profile.chips || 0) + 5000;
        const { error } = await supabase
          .from('profiles')
          .update({ 
            chips: newChips,
            review_submitted: true
          })
          .eq('id', userId);

        if (error) throw error;
        
        console.log('✅ Review submitted: +5,000 chips');
        setReviewText('');
        setReviewRating(0);
        await fetchStats();
        onChipsUpdated?.();
      }
    } catch (err: any) {
      console.error('Error submitting review:', err);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReferralSubmit = async () => {
    if (!referralCode.trim()) {
      setReferralError('Please enter a referral code.');
      return;
    }

    setLoading(true);
    setReferralError(null);
    setReferralSuccess(false);

    try {
      const supabase = createClient();
      
      // Check if code exists and is not their own
      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('id, referral_code')
        .eq('referral_code', referralCode.toUpperCase())
        .single();

      if (!referrerProfile) {
        setReferralError('Invalid referral code.');
        return;
      }

      if (referrerProfile.id === userId) {
        setReferralError('You cannot use your own referral code.');
        return;
      }

      // Check if user was already referred
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('id', userId)
        .single();

      if (currentProfile?.referred_by) {
        setReferralError('You have already used a referral code.');
        return;
      }

      // Grant chips to both users
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('chips')
        .eq('id', userId)
        .single();

      const { data: refProfile } = await supabase
        .from('profiles')
        .select('chips, referral_rewards_claimed')
        .eq('id', referrerProfile.id)
        .single();

      if (userProfile && refProfile) {
        // Give 2,000 chips to the new user
        const newUserChips = (userProfile.chips || 0) + 2000;
        await supabase
          .from('profiles')
          .update({ 
            chips: newUserChips,
            referred_by: referrerProfile.id
          })
          .eq('id', userId);

        // Give 2,000 chips to the referrer
        const newRefChips = (refProfile.chips || 0) + 2000;
        const newRefRewards = (refProfile.referral_rewards_claimed || 0) + 1;
        await supabase
          .from('profiles')
          .update({ 
            chips: newRefChips,
            referral_rewards_claimed: newRefRewards
          })
          .eq('id', referrerProfile.id);

        setReferralSuccess(true);
        setReferralCode('');
        console.log('✅ Referral successful: +2,000 chips each');
        await fetchStats();
        onChipsUpdated?.();
      }
    } catch (err: any) {
      console.error('Error processing referral:', err);
      setReferralError('Failed to process referral. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = async () => {
    if (!stats?.referral_code) return;
    
    try {
      await navigator.clipboard.writeText(stats.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!stats) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border border-white/10 shadow-[0_0_60px_rgba(255,213,74,0.15)] rounded-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Get Free Chips</DialogTitle>
        
        <div className="relative p-6">
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-6xl mb-4"
            >
              💸
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-2 font-mono">Get Free Chips!</h2>
            <p className="text-white/60 font-mono text-sm">Choose how you want to earn chips</p>
          </div>

          <div className="space-y-4">
            {/* Daily Free Chips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Gift className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold font-mono">Daily Free Chips</h3>
                    <p className="text-white/60 text-sm font-mono">+1,000 chips every 24 hours</p>
                  </div>
                </div>
                <Button
                  onClick={handleDailyClaim}
                  disabled={!canClaimDaily() || loading}
                  className="bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-green-400 font-mono"
                >
                  {canClaimDaily() ? 'Claim' : 'Claimed'}
                </Button>
              </div>
            </motion.div>

            {/* Review Submission */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Star className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold font-mono mb-1">Leave a Review</h3>
                  <p className="text-white/60 text-sm font-mono mb-3">+5,000 chips (one-time)</p>
                  
                  {!stats.review_submitted ? (
                    <>
                      <div className="mb-3">
                        <Label className="text-white/70 font-mono text-sm mb-2 block">Rating</Label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              onClick={() => setReviewRating(rating)}
                              className={`p-2 rounded-lg transition-all ${
                                reviewRating >= rating
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-white/5 text-white/30'
                              }`}
                            >
                              <Star className="w-5 h-5" fill={reviewRating >= rating ? 'currentColor' : 'none'} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mb-3">
                        <Label className="text-white/70 font-mono text-sm mb-2 block">Your Review</Label>
                        <textarea
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          placeholder="Tell us what you think..."
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white font-mono text-sm resize-none"
                          rows={3}
                        />
                      </div>
                      <Button
                        onClick={handleSubmitReview}
                        disabled={submittingReview || !reviewText.trim() || reviewRating === 0}
                        className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/30 text-yellow-400 font-mono"
                      >
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </Button>
                    </>
                  ) : (
                    <p className="text-green-400 font-mono text-sm">✓ Review already submitted</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Watch Ads */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Video className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold font-mono">Watch Ads</h3>
                    <p className="text-white/60 text-sm font-mono">
                      +500 chips per ad ({stats.ad_watches_today || 0}/3 today)
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleWatchAd}
                  disabled={!canWatchAd() || loading}
                  className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-400 font-mono"
                >
                  {loading ? 'Watching...' : canWatchAd() ? 'Watch Ad' : 'Max Reached'}
                </Button>
              </div>
            </motion.div>

            {/* Referral System */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold font-mono mb-1">Referral Program</h3>
                  <p className="text-white/60 text-sm font-mono mb-3">+2,000 chips for you and your friend</p>
                  
                  {/* Your Referral Code */}
                  {stats.referral_code && (
                    <div className="mb-4 p-3 bg-white/5 rounded-lg">
                      <Label className="text-white/70 font-mono text-sm mb-2 block">Your Referral Code</Label>
                      <div className="flex gap-2">
                        <Input
                          value={stats.referral_code}
                          readOnly
                          className="bg-white/5 border-white/10 text-white font-mono"
                        />
                        <Button
                          onClick={copyReferralCode}
                          className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-400 font-mono"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Enter Referral Code */}
                  <div>
                    <Label className="text-white/70 font-mono text-sm mb-2 block">Enter Friend's Code</Label>
                    <div className="flex gap-2">
                      <Input
                        value={referralCode}
                        onChange={(e) => {
                          setReferralCode(e.target.value.toUpperCase());
                          setReferralError(null);
                          setReferralSuccess(false);
                        }}
                        placeholder="Enter referral code"
                        className="bg-white/5 border-white/10 text-white font-mono"
                      />
                      <Button
                        onClick={handleReferralSubmit}
                        disabled={loading || !referralCode.trim()}
                        className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-400 font-mono"
                      >
                        {loading ? 'Processing...' : 'Submit'}
                      </Button>
                    </div>
                    {referralError && (
                      <p className="text-red-400 text-sm font-mono mt-2">{referralError}</p>
                    )}
                    {referralSuccess && (
                      <p className="text-green-400 text-sm font-mono mt-2">✓ Referral code applied! +2,000 chips</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-mono"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

