-- Delete a user from Supabase Auth
-- Replace 'user@example.com' with the actual email address

-- First, delete from profiles table (if it exists)
DELETE FROM public.profiles 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'user@example.com'
);

-- Then delete from auth.users
-- Note: This requires admin privileges and should be done carefully
-- You can also do this from the Supabase Dashboard: Authentication → Users

-- If you have admin access, you can run:
-- DELETE FROM auth.users WHERE email = 'user@example.com';

-- However, it's safer to use the Supabase Dashboard for deleting auth users
-- as it handles all related data cleanup automatically.

