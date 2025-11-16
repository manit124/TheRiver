-- Fix foreign key constraint to allow CASCADE delete
-- This allows deleting auth users and automatically cleaning up profiles

-- First, drop the existing foreign key constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Re-add the foreign key with ON DELETE CASCADE
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Now you can delete users from auth.users and their profiles will be automatically deleted

