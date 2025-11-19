# Chip Recovery System Migration

This migration adds fields to the `profiles` table to support the chip recovery system.

## How to Run

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the migration file: `add-chip-recovery-fields.sql`

## What It Adds

- `last_daily_claim`: Tracks when user last claimed daily free chips
- `review_submitted`: Boolean flag for one-time review reward
- `ad_watches_today`: Count of ads watched today (resets daily)
- `last_ad_watch_date`: Date of last ad watch (for daily reset)
- `referral_code`: Unique referral code for each user
- `referred_by`: User ID who referred this user
- `referral_rewards_claimed`: Count of referral rewards claimed

## Features

The chip recovery system includes 4 methods:

1. **Daily Free Chips**: 1,000 chips every 24 hours
2. **Review Submission**: 5,000 chips (one-time) for leaving a review
3. **Watch Ads**: 500 chips per ad, up to 3 ads per day
4. **Referral Program**: 2,000 chips for both the referrer and new user

## Notes

- The migration automatically generates referral codes for existing users
- New users will get referral codes automatically via the `handle_new_user()` function
- The dialog appears automatically when a user's chips reach 0

