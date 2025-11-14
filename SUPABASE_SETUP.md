# Supabase Setup Guide

This guide will help you set up Supabase authentication for TheRiver poker platform.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: the-river (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be created (2-3 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

## Step 3: Set Up Environment Variables

Create a `.env.local` file in the root of your project (if it doesn't exist):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Socket Server (existing)
NEXT_PUBLIC_SOCKET_URL=http://localhost:5050
```

Replace `your_project_url_here` and `your_anon_key_here` with the values from Step 2.

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the contents of `supabase-schema.sql`
4. Click "Run" to execute the SQL
5. This will create:
   - `profiles` table for user data
   - Row Level Security policies
   - Triggers for automatic profile creation

## Step 5: Disable Email Confirmation (Optional)

If you want users to be able to sign in immediately without email confirmation:

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Click on **Email** provider
3. Scroll down to **Email Auth** settings
4. Toggle off **"Confirm email"** or **"Enable email confirmations"**
5. Click **Save**

**Note:** Disabling email confirmation means users can sign in immediately after signup without verifying their email. This is useful for development but less secure for production.

## Step 6: Enable OAuth Providers

### GitHub OAuth

1. Go to **Settings** → **Auth** → **Providers**
2. Find **GitHub** and click to expand
3. Toggle "Enable GitHub provider"
4. You'll need to create a GitHub OAuth App:
   - Go to GitHub → Settings → Developer settings → OAuth Apps
   - Click "New OAuth App"
   - **Application name**: TheRiver
   - **Homepage URL**: `http://localhost:3000` (or your production URL)
   - **Authorization callback URL**: `https://your-project.supabase.co/auth/v1/callback`
     - Get this URL from Supabase dashboard → Settings → API → Project URL
   - Click "Register application"
   - Copy the **Client ID** and **Client Secret**
5. Back in Supabase, paste the Client ID and Client Secret
6. Click "Save"

### Google OAuth

1. Go to **Settings** → **Auth** → **Providers**
2. Find **Google** and click to expand
3. Toggle "Enable Google provider"
4. You'll need to create a Google OAuth Client:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Go to **APIs & Services** → **Credentials**
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - **Authorized redirect URIs**: `https://your-project.supabase.co/auth/v1/callback`
   - Click "Create"
   - Copy the **Client ID** and **Client Secret**
5. Back in Supabase, paste the Client ID and Client Secret
6. Click "Save"

## Step 6: Configure Redirect URLs

1. In Supabase dashboard, go to **Settings** → **Auth** → **URL Configuration**
2. Add your site URLs:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**:
     - `http://localhost:3000/auth/callback`
     - `https://your-production-domain.com/auth/callback` (for production)

## Step 7: Test the Authentication

1. Start your development server: `npm run dev`
2. Click the "Login / Sign Up" button in the nav bar
3. Try signing up with email/password
4. Try signing in with GitHub or Google

## Features Included

✅ Email/Password authentication  
✅ GitHub OAuth  
✅ Google OAuth  
✅ User profiles with username, email, profile pic, and chips  
✅ Automatic profile creation on signup  
✅ Row Level Security for data protection  
✅ Starting chips: 10,000

## Database Schema

The `profiles` table stores:

- `id`: UUID (linked to auth.users)
- `email`: User's email address
- `username`: Unique username
- `profile_pic`: URL to profile picture (optional)
- `chips`: User's chip balance (default: 10,000)
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

## Next Steps

- Add profile picture upload functionality
- Implement chip transactions
- Add user leaderboard queries
- Create user settings page
