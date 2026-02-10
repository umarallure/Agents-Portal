-- =====================================================
-- ADD GOOGLE DRIVE FOLDER ID TO LEAD VENDORS
-- =====================================================
-- This migration adds a column to store Google Drive folder IDs
-- for each lead vendor to enable automatic EOD report uploads
-- =====================================================

-- Add google_drive_folder_id column to lead_vendors table
ALTER TABLE public.lead_vendors
ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT,
ADD COLUMN IF NOT EXISTS report_folder_name TEXT;

COMMENT ON COLUMN public.lead_vendors.google_drive_folder_id IS 'Google Drive folder ID where EOD reports should be uploaded';
COMMENT ON COLUMN public.lead_vendors.report_folder_name IS 'Custom folder name for organizing reports (optional)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lead_vendors_drive_folder 
ON public.lead_vendors(google_drive_folder_id) 
WHERE google_drive_folder_id IS NOT NULL;
