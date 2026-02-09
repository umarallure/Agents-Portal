-- =====================================================
-- AFLAC AGENT STATE AVAILABILITY SYSTEM
-- =====================================================
-- This migration creates a separate state availability system 
-- specifically for Aflac carrier, similar to Aetna.
-- All 52 US states/territories require upline license verification for Aflac.
-- =====================================================

-- =====================================================
-- 1. CREATE AFLAC STATE AVAILABILITY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.aflac_agent_state_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_name TEXT NOT NULL,
  state_code TEXT,
  is_available BOOLEAN DEFAULT true,
  requires_upline_license BOOLEAN DEFAULT true, -- Always true for Aflac
  notes TEXT,
  effective_date DATE,
  expiration_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique combination of agent and state
  UNIQUE(agent_user_id, state_name)
);

COMMENT ON TABLE public.aflac_agent_state_availability IS 'Tracks Aflac-specific state availability for each agent, separate from general state licensing';
COMMENT ON COLUMN public.aflac_agent_state_availability.agent_user_id IS 'Reference to the agent user';
COMMENT ON COLUMN public.aflac_agent_state_availability.state_name IS 'Full state name (independent from states table)';
COMMENT ON COLUMN public.aflac_agent_state_availability.state_code IS 'Two-letter state code';
COMMENT ON COLUMN public.aflac_agent_state_availability.is_available IS 'Whether agent is available for Aflac in this state';
COMMENT ON COLUMN public.aflac_agent_state_availability.requires_upline_license IS 'Always true for Aflac - requires upline verification';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_aflac_agent_state_availability_agent 
  ON public.aflac_agent_state_availability(agent_user_id);
CREATE INDEX IF NOT EXISTS idx_aflac_agent_state_availability_state 
  ON public.aflac_agent_state_availability(state_name);
CREATE INDEX IF NOT EXISTS idx_aflac_agent_state_availability_available 
  ON public.aflac_agent_state_availability(agent_user_id, is_available) 
  WHERE is_available = true;

-- Enable RLS
ALTER TABLE public.aflac_agent_state_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Agents can view their own Aflac state availability" 
ON public.aflac_agent_state_availability 
FOR SELECT 
USING (auth.uid() = agent_user_id);

CREATE POLICY "Admins can view all Aflac state availability" 
ON public.aflac_agent_state_availability 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.agent_code IS NOT NULL
  )
);

CREATE POLICY "Admins can insert Aflac state availability" 
ON public.aflac_agent_state_availability 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.agent_code IS NOT NULL
  )
);

CREATE POLICY "Admins can update Aflac state availability" 
ON public.aflac_agent_state_availability 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.agent_code IS NOT NULL
  )
);

CREATE POLICY "Admins can delete Aflac state availability" 
ON public.aflac_agent_state_availability 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.agent_code IS NOT NULL
  )
);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_aflac_agent_state_availability_updated_at
BEFORE UPDATE ON public.aflac_agent_state_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. CREATE FUNCTION TO GET ELIGIBLE AGENTS FOR AFLAC
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_eligible_agents_for_aflac(
  p_state_name TEXT
)
RETURNS TABLE (
  user_id UUID,
  agent_name TEXT,
  email TEXT,
  agent_code TEXT,
  carrier_licensed BOOLEAN,
  state_licensed BOOLEAN,
  upline_licensed BOOLEAN,
  upline_required BOOLEAN,
  upline_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Get Aflac carrier ID
  aflac_carrier AS (
    SELECT c.id 
    FROM public.carriers c 
    WHERE LOWER(c.carrier_name) = 'aflac'
    LIMIT 1
  ),
  
  -- Get agents who have Aflac carrier license
  agents_with_aflac AS (
    SELECT 
      acl.agent_user_id,
      p.display_name,
      u.email,
      p.agent_code,
      true as has_carrier_license
    FROM public.agent_carrier_licenses acl
    INNER JOIN aflac_carrier ac ON acl.carrier_id = ac.id
    INNER JOIN public.profiles p ON p.user_id = acl.agent_user_id
    INNER JOIN auth.users u ON u.id = acl.agent_user_id
    WHERE acl.is_licensed = true
  ),
  
  -- Check Aflac state availability for the requested state
  agents_with_state AS (
    SELECT 
      aasa.agent_user_id,
      true as has_state_availability
    FROM public.aflac_agent_state_availability aasa
    WHERE LOWER(aasa.state_name) = LOWER(p_state_name)
      AND aasa.is_available = true
  ),
  
  -- Get upline information
  agent_uplines AS (
    SELECT 
      auh.agent_user_id,
      auh.upline_user_id,
      p.display_name as upline_name
    FROM public.agent_upline_hierarchy auh
    INNER JOIN public.profiles p ON p.user_id = auh.upline_user_id
    WHERE auh.is_active = true
  ),
  
  -- Check if upline has Aflac carrier license
  upline_carrier_licenses AS (
    SELECT 
      au.agent_user_id,
      COALESCE(acl.is_licensed, false) as upline_has_carrier
    FROM agent_uplines au
    LEFT JOIN public.agent_carrier_licenses acl ON acl.agent_user_id = au.upline_user_id
    LEFT JOIN aflac_carrier ac ON acl.carrier_id = ac.id
  ),
  
  -- Check if upline has Aflac state availability
  upline_state_availability AS (
    SELECT 
      au.agent_user_id,
      COALESCE(aasa.is_available, false) as upline_has_state
    FROM agent_uplines au
    LEFT JOIN public.aflac_agent_state_availability aasa 
      ON aasa.agent_user_id = au.upline_user_id
      AND LOWER(aasa.state_name) = LOWER(p_state_name)
  )
  
  -- Final query combining all checks
  SELECT 
    awa.agent_user_id as user_id,
    awa.display_name as agent_name,
    awa.email::TEXT,
    awa.agent_code,
    awa.has_carrier_license as carrier_licensed,
    COALESCE(aws.has_state_availability, false) as state_licensed,
    -- Upline is licensed if upline exists and has both carrier and state
    CASE 
      WHEN au.upline_user_id IS NULL THEN false
      ELSE COALESCE(ucl.upline_has_carrier, false) AND COALESCE(usa.upline_has_state, false)
    END as upline_licensed,
    true as upline_required, -- Always true for Aflac
    au.upline_name
  FROM agents_with_aflac awa
  LEFT JOIN agents_with_state aws ON aws.agent_user_id = awa.agent_user_id
  LEFT JOIN agent_uplines au ON au.agent_user_id = awa.agent_user_id
  LEFT JOIN upline_carrier_licenses ucl ON ucl.agent_user_id = awa.agent_user_id
  LEFT JOIN upline_state_availability usa ON usa.agent_user_id = awa.agent_user_id
  WHERE 
    -- Agent must have Aflac carrier license
    awa.has_carrier_license = true
    -- Agent must have state availability
    AND COALESCE(aws.has_state_availability, false) = true
    -- If agent has upline, upline must have both carrier and state
    AND (
      au.upline_user_id IS NULL 
      OR (
        COALESCE(ucl.upline_has_carrier, false) = true 
        AND COALESCE(usa.upline_has_state, false) = true
      )
    )
  ORDER BY awa.display_name;
END;
$$;

COMMENT ON FUNCTION public.get_eligible_agents_for_aflac IS 'Returns all agents eligible for Aflac in a specific state, including upline verification for all states';

-- =====================================================
-- 3. SEED DATA - Insert Aflac Carrier if not exists
-- =====================================================

INSERT INTO public.carriers (carrier_name, carrier_code, is_active, notes)
VALUES ('Aflac', 'AFLAC', true, 'Aflac carrier with separate state availability system requiring upline verification for all states')
ON CONFLICT (carrier_name) DO UPDATE 
SET 
  carrier_code = EXCLUDED.carrier_code,
  is_active = EXCLUDED.is_active,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- =====================================================
-- 4. POPULATE AFLAC STATES FOR EXISTING AFLAC AGENTS
-- =====================================================
-- This will populate all 52 states for agents who already have Aflac carrier license
-- Run this after deployment to set up initial data

-- Note: To populate states for specific agents, use the populate_aflac_states.sql script
-- or use the Aflac State Availability Manager in the UI
