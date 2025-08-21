-- Migration: Add new statuses to verification_sessions.status constraint
-- Adds: 'call_dropped', 'buffer_done', 'la_done'

ALTER TABLE public.verification_sessions
  DROP CONSTRAINT IF EXISTS verification_sessions_status_check;

ALTER TABLE public.verification_sessions
  ADD CONSTRAINT verification_sessions_status_check
    CHECK (status IN (
      'pending',
      'in_progress',
      'ready_for_transfer',
      'transferred',
      'completed',
      'call_dropped',
      'buffer_done',
      'la_done'
    ));

-- Optionally, update documentation comment
COMMENT ON COLUMN public.verification_sessions.status IS 'Session status: pending, in_progress, ready_for_transfer, transferred, completed, call_dropped, buffer_done, la_done';
