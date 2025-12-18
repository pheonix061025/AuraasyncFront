# Quick Setup Guide for Referral System

## Step 1: Run the Database Migration

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of `supabase-migrations/create_referrals_table_v2.sql`
6. Click **Run** or press `Ctrl+Enter`

You should see a success message: "Referrals table created successfully!"

**Note:** If you already ran the old migration, run this new one - it will drop and recreate the table with proper permissions.

## Step 2: Verify the Migration

Run this query in the SQL Editor to verify the table was created:
```sql
SELECT * FROM referrals LIMIT 1;
```

You should see column headers but no data (empty table).

## Step 3: Test the Referral System

1. Start your development server:
   ```bash
   pnpm dev
   ```

2. Navigate to the referral page: `http://localhost:3000/referral`

3. Test the flow:
   - Copy your referral code
   - Open a new incognito window
   - Sign up with a different account
   - Enter the referral code
   - Verify both users receive coins

## Step 4: Common Issues

### Issue: "relation 'referrals' does not exist"
**Solution**: Run the migration in Step 1

### Issue: "duplicate key value violates unique constraint"
**Solution**: User has already used a referral code or trying to use own code

### Issue: Points not updating
**Solution**: Check that `user_id` exists in localStorage and Supabase

## That's it! 🎉

Your referral system is now ready to use.
