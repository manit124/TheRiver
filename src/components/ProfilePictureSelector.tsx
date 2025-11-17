'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface ProfilePictureSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onComplete: () => void;
  isNewSignup?: boolean; // If true, cancel will delete account. If false, just close dialog.
}

// Profile picture options - images only
const POKER_AVATARS = [
  { id: 'profile1', name: 'Profile 1', type: 'image' as const, image: '/profile1.png' },
  { id: 'profile2', name: 'Profile 2', type: 'image' as const, image: '/profile2.png' },
  { id: 'profile3', name: 'Profile 3', type: 'image' as const, image: '/profile3.png' },
];

export function ProfilePictureSelector({ open, onOpenChange, userId, onComplete, isNewSignup = false }: ProfilePictureSelectorProps) {
  // Dialog size reducers - adjust these values to change dialog size
  // Width options: 'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-4xl' (default)
  // Width percentage: 'w-[50vw]', 'w-[60vw]', 'w-[70vw]', 'w-[80vw]' (default)
  // Height percentage: 'h-[40vh]', 'h-[50vh]', 'h-[60vh]', 'h-[70vh]' (default)
  const dialogMaxWidth = 'max-w-4xl';
  const dialogWidth = 'w-[50vw]';
  const dialogHeight = 'h-[49vh]';
  
  // Profile pictures position mover - adjust vertical position of profile picture grid
  // Positive values move down, negative values move up
  // Options: 'translateY(0px)', 'translateY(10px)', 'translateY(20px)', 'translateY(30px)', 'translateY(40px)', 'translateY(-10px)', etc.
  const profilePicturesMover = 'translateY(30px)';
  
  // Save button position mover - adjust vertical position of Save Profile Picture button
  // Positive values move down, negative values move up
  // Options: 'translateY(0px)', 'translateY(10px)', 'translateY(20px)', 'translateY(30px)', 'translateY(40px)', 'translateY(-10px)', etc.
  const saveButtonMover = 'translateY(30px)';
  
  // Button position spacer - adjust h-8 to move button up (lower number) or down (higher number)
  const buttonSpacer = 'h-8';

  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profilePictureSaved, setProfilePictureSaved] = useState(false);

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

      // Get the profile picture value (image path)
      const profilePicValue = avatar.image;

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

      // Update the profile with the selected avatar (emoji or image path)
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ profile_pic: profilePicValue })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating profile picture:', updateError);
        throw updateError;
      }

      // Verify the update was successful
      if (!updateData || updateData.profile_pic !== profilePicValue) {
        throw new Error('Failed to save profile picture. Please try again.');
      }

      console.log('Profile picture saved successfully:', updateData.profile_pic);

      // Mark that profile picture was saved
      setProfilePictureSaved(true);

      // Close dialogs first
      onOpenChange(false);
      
      // Call onComplete to notify parent
      onComplete();
      
      // Reload page to update nav bar (needed for both new signups and profile updates)
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = async (open: boolean) => {
    if (!open && !profilePictureSaved && isNewSignup) {
      // User is trying to close without selecting a profile picture during NEW SIGNUP
      // Delete the user account and profile only if this is a new signup
      try {
        const supabase = createClient();
        
        // Sign out the user first
        await supabase.auth.signOut();
        
        // Delete the profile (this will be cleaned up by cascade or trigger)
        const { error: profileDeleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);
        
        if (profileDeleteError) {
          console.error('Error deleting profile:', profileDeleteError);
        }
        
        // Note: We can't delete the auth user from client-side without admin API
        // The profile deletion should be sufficient, and the auth user can be cleaned up
        // by a server-side cron job or manually if needed
        console.log('User account cancelled - profile deleted and user signed out');
        
        // Reset the form and close dialogs
        onOpenChange(false);
        
        // Reload to reset the auth state
        window.location.reload();
        return;
      } catch (err) {
        console.error('Error cleaning up user account:', err);
        // Still close the dialog even if cleanup fails
        onOpenChange(open);
        return;
      }
    }
    
    // For existing users changing profile pic, just close the dialog
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className={`${dialogMaxWidth} ${dialogWidth} ${dialogHeight} bg-gradient-to-br from-black/80 via-[#0a0a0a]/90 to-black/80 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-lg p-0 overflow-y-auto`}>
        <DialogTitle className="sr-only">Choose Your Profile Picture</DialogTitle>
        
        <div className="p-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-2 font-mono">Choose Your Profile Picture</h2>
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mb-2" />
            <p className="text-white/70 font-mono text-sm">Select a poker-themed avatar to represent you</p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-mono mb-6">
              {error}
            </div>
          )}

          <div className="flex justify-center mb-8" style={{ transform: profilePicturesMover }}>
            <div className="grid grid-cols-3 gap-6 max-w-md">
            {POKER_AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => setSelectedAvatar(avatar.id)}
                className={`
                  relative aspect-square rounded-lg border-2 transition-all duration-200 ease-out
                  flex items-center justify-center text-2xl overflow-hidden
                  backdrop-blur-sm
                  ${
                    selectedAvatar === avatar.id
                      ? 'border-white bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-[1.05]'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }
                `}
              >
                <Image
                  src={avatar.image}
                  alt={avatar.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  unoptimized
                />
                {selectedAvatar === avatar.id && (
                  <div className="absolute inset-0 bg-white/15 rounded-lg pointer-events-none" />
                )}
              </button>
            ))}
            </div>
          </div>

          {/* Spacer - adjust buttonSpacer value above to move button up (lower number) or down (higher number) */}
          <div className={buttonSpacer}></div>

          <div className="flex justify-center" style={{ transform: saveButtonMover }}>
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

