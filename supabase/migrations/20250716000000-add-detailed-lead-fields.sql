-- Add detailed fields to leads table for comprehensive JotForm data capture

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS birth_state TEXT,
ADD COLUMN IF NOT EXISTS driver_license TEXT,
ADD COLUMN IF NOT EXISTS existing_coverage TEXT,
ADD COLUMN IF NOT EXISTS previous_applications TEXT,
ADD COLUMN IF NOT EXISTS height TEXT,
ADD COLUMN IF NOT EXISTS weight TEXT,
ADD COLUMN IF NOT EXISTS doctors_name TEXT,
ADD COLUMN IF NOT EXISTS tobacco_use TEXT,
ADD COLUMN IF NOT EXISTS medications TEXT,
ADD COLUMN IF NOT EXISTS beneficiary_information TEXT,
ADD COLUMN IF NOT EXISTS institution_name TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT;

-- Update the draft_date column to be TEXT instead of DATE to handle flexible formats
ALTER TABLE public.leads 
ALTER COLUMN draft_date TYPE TEXT USING draft_date::TEXT,
ALTER COLUMN future_draft_date TYPE TEXT USING future_draft_date::TEXT;

-- Add comment to document the table structure
COMMENT ON TABLE public.leads IS 'Comprehensive lead information from various sources including JotForm with detailed personal, health, and banking information';
