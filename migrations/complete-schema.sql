-- Complete Supabase Schema with Chip Recovery System
-- Run this entire file in Supabase SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  profile_pic TEXT,
  chips BIGINT DEFAULT 10000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Add total_hands_played column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_hands_played INTEGER DEFAULT 0;

UPDATE profiles 
SET total_hands_played = 0 
WHERE total_hands_played IS NULL;

-- Fix foreign key constraint to allow CASCADE delete
-- First, drop the existing foreign key constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Re-add the foreign key with ON DELETE CASCADE
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

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

-- Function to automatically create profile on user signup
-- IMPORTANT: This includes referral_code generation with collision handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  ref_code TEXT;
  code_exists BOOLEAN;
  attempts INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  -- Generate unique referral code with collision handling
  LOOP
    ref_code := 'REF' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT || attempts::TEXT) FROM 1 FOR 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = ref_code) INTO code_exists;
    
    -- If code doesn't exist, exit loop
    EXIT WHEN NOT code_exists;
    
    -- Increment attempts to avoid infinite loop
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      -- Fallback: use timestamp-based code if too many collisions
      ref_code := 'REF' || UPPER(SUBSTRING(MD5(NEW.id::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT) FROM 1 FOR 6));
      EXIT;
    END IF;
  END LOOP;
  
  -- Insert profile with error handling
  BEGIN
    INSERT INTO public.profiles (id, email, username, chips, referral_code)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
      10000,
      ref_code
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- If username is duplicate, try with timestamp
      INSERT INTO public.profiles (id, email, username, chips, referral_code)
      VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        'user_' || substr(NEW.id::text, 1, 8) || '_' || EXTRACT(EPOCH FROM NOW())::BIGINT,
        10000,
        ref_code
      );
    WHEN OTHERS THEN
      -- Log error and re-raise
      RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

