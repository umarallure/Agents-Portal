-- Add dq_reason field to call_results table to store status reason selection
-- This field stores reasons for various statuses: DQ, Needs Callback, Not Interested, Future Submission Date
ALTER TABLE public.call_results 
ADD COLUMN dq_reason TEXT;

-- Add call_source field if it doesn't exist (for tracking call source)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_results' 
                   AND column_name = 'call_source') THEN
        ALTER TABLE public.call_results ADD COLUMN call_source TEXT;
    END IF;
END $$;

-- Ensure notes field exists and is properly configured
-- (This should already exist, but adding a check for completeness)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_results' 
                   AND column_name = 'notes') THEN
        ALTER TABLE public.call_results ADD COLUMN notes TEXT;
    END IF;
END $$;
