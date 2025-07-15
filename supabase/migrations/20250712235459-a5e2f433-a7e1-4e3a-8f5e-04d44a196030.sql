-- Create leads table to store JotForm submissions
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id TEXT UNIQUE NOT NULL,
  submission_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  customer_full_name TEXT NOT NULL,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone_number TEXT,
  email TEXT,
  date_of_birth DATE,
  age INTEGER,
  social_security TEXT,
  health_conditions TEXT,
  carrier TEXT,
  product_type TEXT,
  coverage_amount DECIMAL(12,2),
  monthly_premium DECIMAL(10,2),
  draft_date DATE,
  future_draft_date DATE,
  beneficiary_institution TEXT,
  beneficiary_routing TEXT,
  beneficiary_account TEXT,
  additional_notes TEXT,
  lead_vendor TEXT,
  buffer_agent TEXT,
  agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create agents table for user management
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  licensed_accounts TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create call_results table to store agent updates after calls
CREATE TABLE public.call_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES public.leads(submission_id) ON DELETE CASCADE,
  application_submitted BOOLEAN NOT NULL,
  status TEXT,
  notes TEXT,
  carrier TEXT,
  product_type TEXT,
  draft_date DATE,
  submitting_agent TEXT,
  licensed_agent_account TEXT,
  coverage_amount DECIMAL(12,2),
  monthly_premium DECIMAL(10,2),
  face_amount DECIMAL(12,2),
  submission_date DATE,
  agent_id UUID REFERENCES public.agents(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_results ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this will be accessed via Slack buttons)
-- You can restrict these later based on your authentication needs
CREATE POLICY "Allow all operations on leads" ON public.leads FOR ALL USING (true);
CREATE POLICY "Allow all operations on agents" ON public.agents FOR ALL USING (true);
CREATE POLICY "Allow all operations on call_results" ON public.call_results FOR ALL USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_results_updated_at
  BEFORE UPDATE ON public.call_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_leads_submission_id ON public.leads(submission_id);
CREATE INDEX idx_call_results_submission_id ON public.call_results(submission_id);
CREATE INDEX idx_agents_email ON public.agents(email);