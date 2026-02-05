-- Migration: Create lead_vendors table
-- Created: 2026-02-05

CREATE TABLE IF NOT EXISTS public.lead_vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    did TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index for faster lookups on active vendors
CREATE INDEX IF NOT EXISTS idx_lead_vendors_is_active ON public.lead_vendors(is_active);

-- Add index for name lookups
CREATE INDEX IF NOT EXISTS idx_lead_vendors_name ON public.lead_vendors(name);

-- Enable Row Level Security
ALTER TABLE public.lead_vendors ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read active vendors
CREATE POLICY "Allow authenticated users to read active vendors"
    ON public.lead_vendors
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Create policy to allow all authenticated users to read all vendors (for existing records)
CREATE POLICY "Allow authenticated users to read all vendors"
    ON public.lead_vendors
    FOR SELECT
    TO authenticated
    USING (true);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lead_vendors_updated_at
    BEFORE UPDATE ON public.lead_vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
