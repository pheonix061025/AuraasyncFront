# Supabase Dashboard Integration

This document explains how the dashboard has been integrated with Supabase for user management, points system, referrals, and reviews.

## Overview

The dashboard now uses Supabase as the primary database and authentication system, replacing the previous Firebase + custom API setup. All user data, points transactions, reviews, and rewards are now stored in Supabase.

## Database Schema

The integration uses the following Supabase tables:

### 1. `user` table
- `user_id` (bigint, primary key)
- `email` (varchar, unique)
- `name` (varchar)
- `gender` (text)
- `location` (text)
- `skin_tone` (text)
- `face_shape` (text)
- `body_shape` (text)
- `personality` (text)
- `onboarding_completed` (boolean)
- `points` (integer, default 0)
- `last_login_date` (date)
- `referral_code` (text, unique)
- `total_referrals` (integer, default 0)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 2. `points_transactions` table
- `id` (uuid, primary key)
- `user_id` (bigint, foreign key)
- `action` (text)
- `points` (integer)
- `description` (text)
- `created_at` (timestamp)

### 3. `reviews` table
- `id` (uuid, primary key)
- `user_id` (bigint, foreign key)
- `product_id` (text)
- `product_name` (text)
- `review_text` (text)
- `rating` (integer, 1-5)
- `points_awarded` (integer, default 0)
- `created_at` (timestamp)

### 4. `rewards` table
- `id` (uuid, primary key)
- `name` (text)
- `description` (text)
- `cost` (integer)
- `created_at` (timestamp)

### 5. `reward_purchases` table
- `id` (uuid, primary key)
- `user_id` (bigint, foreign key)
- `reward_id` (uuid, foreign key)
- `purchased_at` (timestamp)

## Environment Variables

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Features Integrated

### 1. User Authentication
- Uses Supabase Auth for user authentication
- Automatic session management
- Secure token handling

### 2. User Data Management
- Fetch user profile data from Supabase
- Update user information
- Track onboarding completion
- Manage user preferences

### 3. Points System
- Real-time points tracking
- Transaction history from Supabase
- Daily login bonuses
- Points for various actions (reviews, referrals, etc.)

### 4. Referral System
- Track referral codes and counts
- Award points for successful referrals
- Store referral data in Supabase

### 5. Review System
- Submit product reviews
- Store reviews in Supabase
- Award points for reviews
- Track review history

### 6. Rewards System
- Browse available rewards
- Purchase rewards with points
- Track reward purchases
- Unlock premium features

## API Endpoints

### User Management
- `GET /api/user?email=user@example.com` - Get user data
- `POST /api/user` - Create or update user
- `PUT /api/user` - Update user data

### Points System
- `GET /api/points?user_id=123` - Get user's transaction history
- `POST /api/points` - Create points transaction

### Reviews
- `GET /api/reviews?user_id=123` - Get user's reviews
- `GET /api/reviews?product_id=product-1` - Get product reviews
- `POST /api/reviews` - Submit a review

### Rewards
- `GET /api/rewards?user_id=123` - Get rewards with purchase status
- `POST /api/rewards` - Purchase a reward

## Component Updates

### Dashboard (`src/app/dashboard/page.tsx`)
- Replaced Firebase auth with Supabase auth
- Updated user data fetching to use Supabase
- Integrated points system with Supabase transactions
- Added real-time data updates

### PointsDisplay (`src/components/PointsDisplay.tsx`)
- Fetches transaction history from Supabase
- Loads rewards from Supabase
- Handles reward purchases with Supabase
- Real-time points updates

### ReferralSystem (`src/components/ReferralSystem.tsx`)
- Stores referral data in Supabase
- Tracks referral points and counts
- Updates user data in real-time

### ReviewSystem (`src/components/ReviewSystem.tsx`)
- Saves reviews to Supabase
- Awards points for reviews
- Tracks review history

## Setup Instructions

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Get your project URL and anon key

2. **Set up Database Schema**
   - Run the SQL from `supabaseschema.md` in your Supabase SQL editor
   - This will create all necessary tables and relationships

3. **Configure Environment Variables**
   - Add Supabase credentials to `.env.local`
   - Restart your development server

4. **Seed Initial Data**
   - Run the rewards seeding script: `src/lib/seedRewards.ts`
   - This will populate the rewards table with sample data

5. **Test the Integration**
   - Start your development server
   - Navigate to `/dashboard`
   - Test user authentication and data loading

## Data Flow

1. **User Login**: Supabase Auth handles authentication
2. **Data Fetching**: Dashboard fetches user data from Supabase
3. **Points Updates**: All points changes are saved to Supabase
4. **Real-time Updates**: Components update when data changes
5. **Persistence**: All user actions are persisted in Supabase

## Error Handling

- Comprehensive error handling for all Supabase operations
- Fallback to localStorage for offline functionality
- User-friendly error messages
- Console logging for debugging

## Performance Considerations

- Efficient queries with proper indexing
- Minimal data fetching with targeted selects
- Real-time updates only when necessary
- Caching for frequently accessed data

## Security

- Row Level Security (RLS) policies should be implemented
- User data is isolated by user_id
- Sensitive operations require authentication
- Input validation on all API endpoints

## Future Enhancements

- Real-time subscriptions for live updates
- Advanced analytics and reporting
- Bulk operations for better performance
- Caching layer for improved speed
- Background jobs for complex operations
