-- Migration: Create medalert_leads table to store Medalert quote submissions
-- Created: 2026-02-12

-- Create table for Medalert leads
CREATE TABLE public.medalert_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Submission Info
  submission_id TEXT UNIQUE NOT NULL,
  submission_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source TEXT DEFAULT 'medalert_quote_form',
  form_version TEXT DEFAULT '1.0',
  
  -- Center User Info (who submitted the lead)
  submitted_by UUID REFERENCES auth.users(id),
  lead_vendor TEXT,
  center_user_name TEXT,
  
  -- Client Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  
  -- Address
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  
  -- Account Credentials (optional)
  client_password TEXT,
  
  -- Primary User Info
  primary_user_same_as_client BOOLEAN DEFAULT TRUE,
  primary_user_first_name TEXT,
  primary_user_last_name TEXT,
  
  -- Product Info
  company_name TEXT NOT NULL,
  quoted_product TEXT NOT NULL,
  device_cost DECIMAL(10,2) NOT NULL,
  original_device_cost DECIMAL(10,2),
  discounted_device_cost DECIMAL(10,2),
  shipping_cost DECIMAL(10,2) NOT NULL,
  monthly_subscription DECIMAL(10,2) NOT NULL,
  protection_plan_included BOOLEAN DEFAULT FALSE,
  protection_plan_cost DECIMAL(10,2),
  total_upfront_cost DECIMAL(10,2) NOT NULL,
  total_monthly_cost DECIMAL(10,2) NOT NULL,
  
  -- Payment Info
  payment_method TEXT NOT NULL,
  
  -- Credit Card Info (if applicable)
  card_number_last_four TEXT,
  card_expiry TEXT,
  cardholder_name TEXT,
  
  -- ACH Info (if applicable)
  account_holder_name TEXT,
  account_number_last_four TEXT,
  routing_number TEXT,
  account_number TEXT,
  account_type TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.medalert_leads ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only view their own submitted leads
CREATE POLICY "Users can view own medalert leads" 
  ON public.medalert_leads 
  FOR SELECT 
  USING (auth.uid() = submitted_by);

-- Users can only insert their own leads
CREATE POLICY "Users can insert own medalert leads" 
  ON public.medalert_leads 
  FOR INSERT 
  WITH CHECK (auth.uid() = submitted_by);

-- Create index for faster queries
CREATE INDEX idx_medalert_leads_submitted_by ON public.medalert_leads(submitted_by);
CREATE INDEX idx_medalert_leads_status ON public.medalert_leads(status);
CREATE INDEX idx_medalert_leads_submission_date ON public.medalert_leads(submission_date);

-- Add comments
COMMENT ON TABLE public.medalert_leads IS 'Stores Medalert device quote submissions from center users';
COMMENT ON COLUMN public.medalert_leads.submitted_by IS 'The user who submitted this lead';
COMMENT ON COLUMN public.medalert_leads.lead_vendor IS 'The lead vendor/center name';
COMMENT ON COLUMN public.medalert_leads.status IS 'Lead status: pending, processing, completed, cancelled';
