-- Migration: Add Medalert-specific columns to leads table
-- Created: 2026-02-11

-- Add columns for Medalert device quote form data
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS form_version TEXT;

-- Product Information
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS quoted_product TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS device_cost DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS original_device_cost DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS discounted_device_cost DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS monthly_subscription DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS monthly_premium DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS protection_plan_cost DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS protection_plan_included BOOLEAN DEFAULT FALSE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS total_upfront_cost DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS total_monthly_cost DECIMAL(10,2);

-- Primary User Information
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS primary_user_same_as_client BOOLEAN DEFAULT TRUE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS primary_user_first_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS primary_user_last_name TEXT;

-- Payment Information
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS card_number_last_four TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS card_expiry TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS cardholder_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS account_holder_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS account_number_last_four TEXT;

-- Client Account Info
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS client_password TEXT;

-- Center User Info (already have lead_vendor, adding center_user_name for clarity)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS center_user_name TEXT;

-- Create index for querying by source
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON public.leads(company_name);

-- Add comment to document the columns
COMMENT ON COLUMN public.leads.source IS 'Source of the lead (e.g., medalert_quote_form, jotform, etc.)';
COMMENT ON COLUMN public.leads.company_name IS 'Company name for product (e.g., Bay Alarm Alert)';
COMMENT ON COLUMN public.leads.quoted_product IS 'Product name quoted (e.g., SOS All-In-One 2)';
COMMENT ON COLUMN public.leads.payment_method IS 'Payment method: credit_card or ach';
COMMENT ON COLUMN public.leads.protection_plan_included IS 'Whether device protection plan was included';
