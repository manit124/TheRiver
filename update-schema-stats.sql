-- Add total_hands_played column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_hands_played INTEGER DEFAULT 0;

-- Update existing users to have 0 hands played
UPDATE profiles 
SET total_hands_played = 0 
WHERE total_hands_played IS NULL;

