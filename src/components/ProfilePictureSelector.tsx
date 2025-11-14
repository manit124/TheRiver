'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { createClient } from '@/lib/supabase/client';

interface ProfilePictureSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onComplete: () => void;
}

// Profile picture options (non-card avatars only)
const POKER_AVATARS = [
  { id: 'poker-chip', name: 'Poker Chip', emoji: '🪙' },
  { id: 'dice', name: 'Dice', emoji: '🎲' },
  { id: 'trophy', name: 'Trophy', emoji: '🏆' },
  { id: 'crown', name: 'Crown', emoji: '👑' },
  { id: 'star', name: 'Star', emoji: '⭐' },
  { id: 'fire', name: 'Fire', emoji: '🔥' },
  { id: 'diamond', name: 'Diamond', emoji: '💎' },
  { id: 'rocket', name: 'Rocket', emoji: '🚀' },
  { id: 'trophy-gold', name: 'Gold Trophy', emoji: '🥇' },
  { id: 'medal', name: 'Medal', emoji: '🎖️' },
  { id: 'gem', name: 'Gem', emoji: '💠' },
  { id: 'sparkles', name: 'Sparkles', emoji: '✨' },
];

export function ProfilePictureSelector({ open, onOpenChange, userId, onComplete }: ProfilePictureSelectorProps) {
  // Dialog size reducers - adjust these values to change dialog size
  // Width options: 'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-4xl' (default)
  // Width percentage: 'w-[50vw]', 'w-[60vw]', 'w-[70vw]', 'w-[80vw]' (default)
  // Height percentage: 'h-[40vh]', 'h-[50vh]', 'h-[60vh]', 'h-[70vh]' (default)
  const dialogMaxWidth = 'max-w-4xl';
  const dialogWidth = 'w-[50vw]';
  const dialogHeight = 'h-[49vh]';
  
  // Button position spacer - adjust h-8 to move button up (lower number) or down (higher number)
  const buttonSpacer = 'h-8';

  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!selectedAvatar) {
      setError('Please select a profile picture');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Find the selected avatar
      const avatar = POKER_AVATARS.find(a => a.id === selectedAvatar);
      if (!avatar) {
        throw new Error('Invalid avatar selection');
      }

      // First, check if profile exists and wait a bit if it doesn't (trigger might still be creating it)
      let profileExists = false;
      let retries = 0;
      while (!profileExists && retries < 5) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();
        
        if (existingProfile) {
          profileExists = true;
        } else {
          // Wait 200ms before retrying
          await new Promise(resolve => setTimeout(resolve, 200));
          retries++;
        }
      }

      if (!profileExists) {
        throw new Error('Profile not found. Please try again.');
      }

      // Update the profile with the selected avatar emoji
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ profile_pic: avatar.emoji })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating profile picture:', updateError);
        throw updateError;
      }

      // Verify the update was successful
      if (!updateData || updateData.profile_pic !== avatar.emoji) {
        throw new Error('Failed to save profile picture. Please try again.');
      }

      console.log('Profile picture saved successfully:', updateData.profile_pic);

      // Close dialogs first
      onOpenChange(false);
      
      // Wait a bit longer to ensure database update is fully committed
      // Then trigger a page refresh to update nav bar with new profile picture
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile picture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogMaxWidth} ${dialogWidth} ${dialogHeight} bg-gradient-to-br from-black/80 via-[#0a0a0a]/90 to-black/80 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-lg p-0 overflow-y-auto`}>
        <DialogTitle className="sr-only">Choose Your Profile Picture</DialogTitle>
        
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 font-mono">Choose Your Profile Picture</h2>
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mb-2" />
            <p className="text-white/70 font-mono text-sm">Select a poker-themed avatar to represent you</p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-mono mb-6">
              {error}
            </div>
          )}

          <div className="grid grid-cols-6 gap-3 mb-8">
            {POKER_AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => setSelectedAvatar(avatar.id)}
                className={`
                  relative aspect-square rounded-lg border-2 transition-all duration-300
                  flex items-center justify-center text-2xl
                  backdrop-blur-sm
                  ${
                    selectedAvatar === avatar.id
                      ? 'border-white bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-105'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }
                `}
              >
                <span>{avatar.emoji}</span>
                {selectedAvatar === avatar.id && (
                  <div className="absolute inset-0 bg-white/10 rounded-lg" />
                )}
              </button>
            ))}
          </div>

          {/* Spacer - adjust buttonSpacer value above to move button up (lower number) or down (higher number) */}
          <div className={buttonSpacer}></div>

          <div className="flex justify-center">
            <InteractiveHoverButton
              onClick={handleSave}
              text="Save Profile Picture"
              disabled={loading || !selectedAvatar}
              className="w-full max-w-xs"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

