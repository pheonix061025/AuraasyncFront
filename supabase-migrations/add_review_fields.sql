-- Add additional fields to reviews table for better tracking
-- Run this in your Supabase SQL Editor

-- Add trigger_action column to track what action triggered the review
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS trigger_action text NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.reviews.trigger_action IS 'What action triggered the review popup (e.g., analysis_complete, onboarding_complete, outfit_pairing, daily_login)';

-- Optional: Add index for faster queries on trigger_action
CREATE INDEX IF NOT EXISTS idx_reviews_trigger_action ON public.reviews(trigger_action);

-- Optional: Add index for user reviews lookup
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);

-- Optional: Add index for product reviews lookup
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
