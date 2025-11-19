-- Fix signup function with better error handling and collision prevention
-- Run this to fix signup issues

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

