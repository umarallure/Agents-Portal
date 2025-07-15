-- Add new fields to call_results table for enhanced form structure
ALTER TABLE public.call_results 
ADD COLUMN buffer_agent TEXT,
ADD COLUMN agent_who_took_call TEXT,
ADD COLUMN sent_to_underwriting BOOLEAN DEFAULT false;
