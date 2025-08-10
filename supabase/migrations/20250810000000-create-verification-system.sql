-- Create verification system tables for real-time lead verification by buffer agents

-- Ensure submission_id has proper unique constraint (in case it's missing)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'leads' 
        AND constraint_name = 'leads_submission_id_key'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE public.leads ADD CONSTRAINT leads_submission_id_key UNIQUE (submission_id);
    END IF;
END $$;

-- Table: verification_sessions
-- Manages the overall verification process for each lead
CREATE TABLE public.verification_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id TEXT NOT NULL REFERENCES public.leads(submission_id) ON DELETE CASCADE,
  buffer_agent_id UUID REFERENCES auth.users(id), -- Assigned buffer agent
  licensed_agent_id UUID REFERENCES auth.users(id), -- Licensed agent who will receive the transfer
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'ready_for_transfer', 'transferred', 'completed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  transferred_at TIMESTAMP WITH TIME ZONE,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  total_fields INTEGER DEFAULT 0,
  verified_fields INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: verification_items
-- Stores individual field verification status and values
CREATE TABLE public.verification_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_category TEXT, -- personal, contact, health, insurance, banking, etc.
  original_value TEXT,
  verified_value TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_modified BOOLEAN DEFAULT false, -- true if verified_value differs from original_value
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(session_id, field_name)
);

-- Table: agent_status
-- Tracks real-time status of all agents (buffer and licensed)
CREATE TABLE public.agent_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('offline', 'available', 'on_call', 'busy')),
  agent_type TEXT NOT NULL DEFAULT 'licensed' CHECK (agent_type IN ('buffer', 'licensed', 'supervisor')),
  current_session_id UUID REFERENCES public.verification_sessions(id),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.verification_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification_sessions
CREATE POLICY "Users can view verification sessions they are involved in" 
ON public.verification_sessions 
FOR SELECT 
USING (
  auth.uid() = buffer_agent_id OR 
  auth.uid() = licensed_agent_id OR
  EXISTS (SELECT 1 FROM public.agent_status WHERE user_id = auth.uid() AND agent_type = 'supervisor')
);

CREATE POLICY "Licensed agents can create verification sessions" 
ON public.verification_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = licensed_agent_id);

CREATE POLICY "Buffer and licensed agents can update their sessions" 
ON public.verification_sessions 
FOR UPDATE 
USING (
  auth.uid() = buffer_agent_id OR 
  auth.uid() = licensed_agent_id OR
  EXISTS (SELECT 1 FROM public.agent_status WHERE user_id = auth.uid() AND agent_type = 'supervisor')
);

-- RLS Policies for verification_items
CREATE POLICY "Users can view verification items for their sessions" 
ON public.verification_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.verification_sessions vs 
    WHERE vs.id = session_id AND (
      vs.buffer_agent_id = auth.uid() OR 
      vs.licensed_agent_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.agent_status WHERE user_id = auth.uid() AND agent_type = 'supervisor')
    )
  )
);

CREATE POLICY "Buffer agents can modify verification items" 
ON public.verification_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.verification_sessions vs 
    WHERE vs.id = session_id AND vs.buffer_agent_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.verification_sessions vs 
    WHERE vs.id = session_id AND vs.buffer_agent_id = auth.uid()
  )
);

-- RLS Policies for agent_status
CREATE POLICY "Users can view all agent statuses" 
ON public.agent_status 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their own status" 
ON public.agent_status 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_verification_sessions_updated_at
  BEFORE UPDATE ON public.verification_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_verification_items_updated_at
  BEFORE UPDATE ON public.verification_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_status_updated_at
  BEFORE UPDATE ON public.agent_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate verification progress
CREATE OR REPLACE FUNCTION public.update_verification_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update progress when verification items change
  UPDATE public.verification_sessions 
  SET 
    verified_fields = (
      SELECT COUNT(*) 
      FROM public.verification_items 
      WHERE session_id = NEW.session_id AND is_verified = true
    ),
    progress_percentage = ROUND(
      (SELECT COUNT(*) FROM public.verification_items WHERE session_id = NEW.session_id AND is_verified = true) * 100.0 / 
      GREATEST((SELECT COUNT(*) FROM public.verification_items WHERE session_id = NEW.session_id), 1)
    ),
    updated_at = now()
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically update progress when verification items change
CREATE TRIGGER update_verification_progress_trigger
  AFTER INSERT OR UPDATE OF is_verified ON public.verification_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_verification_progress();

-- Function to initialize verification items for a new session
CREATE OR REPLACE FUNCTION public.initialize_verification_items(session_id_param UUID, submission_id_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lead_record public.leads%ROWTYPE;
BEGIN
  -- Get the lead data
  SELECT * INTO lead_record FROM public.leads WHERE submission_id = submission_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found with submission_id: %', submission_id_param;
  END IF;
  
  -- Insert verification items for all fields that need verification
  INSERT INTO public.verification_items (session_id, field_name, field_category, original_value) VALUES
    -- Personal Information
    (session_id_param, 'customer_full_name', 'personal', lead_record.customer_full_name),
    (session_id_param, 'date_of_birth', 'personal', lead_record.date_of_birth::TEXT),
    (session_id_param, 'birth_state', 'personal', lead_record.birth_state),
    (session_id_param, 'age', 'personal', lead_record.age::TEXT),
    (session_id_param, 'social_security', 'personal', lead_record.social_security),
    (session_id_param, 'driver_license', 'personal', lead_record.driver_license),
    
    -- Contact Information
    (session_id_param, 'street_address', 'contact', lead_record.street_address),
    (session_id_param, 'city', 'contact', lead_record.city),
    (session_id_param, 'state', 'contact', lead_record.state),
    (session_id_param, 'zip_code', 'contact', lead_record.zip_code),
    (session_id_param, 'phone_number', 'contact', lead_record.phone_number),
    (session_id_param, 'email', 'contact', lead_record.email),
    
    -- Health Information
    (session_id_param, 'height', 'health', lead_record.height),
    (session_id_param, 'weight', 'health', lead_record.weight),
    (session_id_param, 'doctors_name', 'health', lead_record.doctors_name),
    (session_id_param, 'tobacco_use', 'health', lead_record.tobacco_use),
    (session_id_param, 'health_conditions', 'health', lead_record.health_conditions),
    (session_id_param, 'medications', 'health', lead_record.medications),
    (session_id_param, 'existing_coverage', 'health', lead_record.existing_coverage),
    (session_id_param, 'previous_applications', 'health', lead_record.previous_applications),
    
    -- Insurance Information
    (session_id_param, 'carrier', 'insurance', lead_record.carrier),
    (session_id_param, 'product_type', 'insurance', lead_record.product_type),
    (session_id_param, 'coverage_amount', 'insurance', lead_record.coverage_amount::TEXT),
    (session_id_param, 'monthly_premium', 'insurance', lead_record.monthly_premium::TEXT),
    (session_id_param, 'draft_date', 'insurance', lead_record.draft_date),
    (session_id_param, 'future_draft_date', 'insurance', lead_record.future_draft_date),
    
    -- Banking/Beneficiary Information
    (session_id_param, 'beneficiary_information', 'banking', lead_record.beneficiary_information),
    (session_id_param, 'institution_name', 'banking', lead_record.institution_name),
    (session_id_param, 'beneficiary_routing', 'banking', lead_record.beneficiary_routing),
    (session_id_param, 'beneficiary_account', 'banking', lead_record.beneficiary_account),
    (session_id_param, 'account_type', 'banking', lead_record.account_type),
    
    -- Additional Information
    (session_id_param, 'additional_notes', 'additional', lead_record.additional_notes),
    (session_id_param, 'lead_vendor', 'additional', lead_record.lead_vendor);
    
  -- Update total fields count in the session
  UPDATE public.verification_sessions 
  SET total_fields = (SELECT COUNT(*) FROM public.verification_items WHERE session_id = session_id_param)
  WHERE id = session_id_param;
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_verification_sessions_submission_id ON public.verification_sessions(submission_id);
CREATE INDEX idx_verification_sessions_buffer_agent ON public.verification_sessions(buffer_agent_id);
CREATE INDEX idx_verification_sessions_licensed_agent ON public.verification_sessions(licensed_agent_id);
CREATE INDEX idx_verification_sessions_status ON public.verification_sessions(status);
CREATE INDEX idx_verification_items_session_id ON public.verification_items(session_id);
CREATE INDEX idx_verification_items_field_name ON public.verification_items(field_name);
CREATE INDEX idx_verification_items_is_verified ON public.verification_items(is_verified);
CREATE INDEX idx_agent_status_user_id ON public.agent_status(user_id);
CREATE INDEX idx_agent_status_status ON public.agent_status(status);
CREATE INDEX idx_agent_status_agent_type ON public.agent_status(agent_type);

-- Comment tables for documentation
COMMENT ON TABLE public.verification_sessions IS 'Manages verification sessions where buffer agents verify lead information before transferring to licensed agents';
COMMENT ON TABLE public.verification_items IS 'Individual field verification tracking with original and verified values';
COMMENT ON TABLE public.agent_status IS 'Real-time status tracking for all agents in the system';
