-- Add fields for chip recovery system
-- Daily free chips tracking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_daily_claim TIMESTAMP WITH TIME ZONE;

-- Review submission tracking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS review_submitted BOOLEAN DEFAULT FALSE;

-- Ad watches tracking (reset daily)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ad_watches_today INTEGER DEFAULT 0;
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_ad_watch_date DATE;

-- Referral system
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_rewards_claimed INTEGER DEFAULT 0;

-- Generate unique referral codes for existing users
UPDATE profiles 
SET referral_code = 'REF' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 6))
WHERE referral_code IS NULL;

-- Create index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

