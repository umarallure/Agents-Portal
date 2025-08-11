-- Add support for direct LA workflow with claimed status and timestamp
-- This migration adds the claimed_at column and updates the status check constraint

-- Add claimed_at column for tracking when a session is claimed by an LA
ALTER TABLE public.verification_sessions 
ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;

-- Update the status constraint to include 'claimed' status
ALTER TABLE public.verification_sessions 
DROP CONSTRAINT IF EXISTS verification_sessions_status_check;

ALTER TABLE public.verification_sessions 
ADD CONSTRAINT verification_sessions_status_check 
CHECK (status IN ('pending', 'in_progress', 'ready_for_transfer', 'transferred', 'claimed', 'completed'));

-- Create index on claimed_at for performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_verification_sessions_claimed_at ON public.verification_sessions(claimed_at);

-- Create index on status for performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_verification_sessions_status ON public.verification_sessions(status);
