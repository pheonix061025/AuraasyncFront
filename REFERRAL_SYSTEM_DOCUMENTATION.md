# Referral System Documentation

## Overview
The referral system allows users to refer friends and earn rewards. Both the referrer and the referred user receive coins when a referral code is used.

## Features

### 1. Share Referral Code
- Each user gets a unique referral code (e.g., `AURA123456`)
- Users can share via:
  - Direct copy link
  - WhatsApp
  - Twitter
  - Manual code sharing

### 2. Use Referral Code
- New users can enter a referral code
- Validation ensures:
  - Code exists and is valid
  - User hasn't already used a referral code (one-time only)
  - User can't use their own code
  - Same pair can't refer each other multiple times

### 3. Rewards
- **Referrer (person who shared)**: 150 coins
- **New user (person who entered code)**: 50 coins

### 4. Tracking
- View referral history
- See total referrals count
- Track points earned from referrals

## Database Schema

### Referrals Table
```sql
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY,
  referrer_user_id bigint NOT NULL,  -- User who shared the code
  referred_user_id bigint NOT NULL,   -- User who used the code
  referral_code text NOT NULL,
  points_awarded boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Constraints
  UNIQUE (referred_user_id),  -- User can only be referred once
  UNIQUE (referrer_user_id, referred_user_id)  -- No duplicate pairs
);
```

## Setup Instructions

### 1. Run Database Migration
Execute the SQL migration in your Supabase dashboard:
```bash
# File: supabase-migrations/create_referrals_table.sql
```

Go to your Supabase project → SQL Editor → Run the migration

### 2. Points System Integration
The referral system uses these point actions:
- `REFERRAL`: 150 points for the referrer
- `REFERRAL_BONUS`: 50 points for the new user

### 3. Access the Referral Page
Navigate to `/referral` or click "Complete Task" on the referral task in the Rewards Modal.

## User Flow

### For Referrers:
1. Visit `/referral` page
2. Copy their unique referral code or link
3. Share with friends via social media or direct message
4. Earn 150 coins when friend uses the code

### For New Users:
1. Visit `/referral` page
2. Enter referral code in the form
3. Click "Claim Bonus Coins"
4. Receive 50 coins instantly
5. Referrer receives 150 coins

## Security Features

- ✅ One referral code per user lifetime
- ✅ Cannot use own referral code
- ✅ Validation prevents duplicate referrals
- ✅ Points awarded only on successful referral
- ✅ Database constraints prevent abuse

## API Integration

The referral page directly uses Supabase client for:
- Checking if user already used a code
- Validating referral codes
- Creating referral records
- Awarding points to both users

## UI/UX Features

- 🎨 Consistent styling with RewardModal
- 📱 Fully responsive design
- 🎉 Success animations and sound effects
- 📊 Real-time stats display
- 📜 Referral history tracking
- 🔄 Auto-reload on success

## Testing Checklist

- [ ] User can view their referral code
- [ ] Copy link functionality works
- [ ] Social sharing buttons work
- [ ] Can enter valid referral code
- [ ] Prevents using own code
- [ ] Prevents using code twice
- [ ] Both users receive correct points
- [ ] Referral history displays correctly
- [ ] Error messages show appropriately
- [ ] Success message shows and coins update
- [ ] Works on mobile devices

## Future Enhancements

- Email referral invitations
- Leaderboard for top referrers
- Bonus rewards for milestone referrals (e.g., 5, 10, 20 referrals)
- Referral analytics dashboard
- Custom referral code selection
- Referral tiers with increasing rewards
