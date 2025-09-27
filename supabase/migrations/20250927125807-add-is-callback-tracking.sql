-- Add is_callback column to track callback leads across all tables

-- Add to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS is_callback BOOLEAN DEFAULT false;

-- Add to call_results table
ALTER TABLE public.call_results
ADD COLUMN IF NOT EXISTS is_callback BOOLEAN DEFAULT false;

-- Add to daily_deal_flow table
ALTER TABLE public.daily_deal_flow
ADD COLUMN IF NOT EXISTS is_callback BOOLEAN DEFAULT false;

-- Update existing callback leads in leads table (those with submission_id starting with 'CB')
UPDATE public.leads
SET is_callback = true
WHERE submission_id LIKE 'CB%';

-- Update existing callback entries in call_results table
UPDATE public.call_results
SET is_callback = true
WHERE submission_id LIKE 'CB%';

-- Update existing callback entries in daily_deal_flow table
UPDATE public.daily_deal_flow
SET is_callback = true
WHERE submission_id LIKE 'CB%';