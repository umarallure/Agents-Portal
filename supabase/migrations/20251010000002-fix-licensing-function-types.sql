-- =====================================================
-- AGENT LICENSING SYSTEM - TYPE FIX
-- =====================================================
-- This migration fixes type mismatches in the original functions
-- Apply this AFTER the main agent-licensing-system migration
-- =====================================================

-- Fix get_eligible_agents function
DROP FUNCTION IF EXISTS public.get_eligible_agents(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_eligible_agents(
  p_carrier_name TEXT,
  p_state_name TEXT
)
RETURNS TABLE (
  agent_user_id UUID,
  agent_name TEXT,
  agent_email TEXT,
  agent_code TEXT,
  carrier_licensed BOOLEAN,
  state_licensed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.user_id,
    p.display_name::TEXT,
    u.email::TEXT,
    p.agent_code::TEXT,
    COALESCE(acl.is_licensed, false) as carrier_licensed,
    COALESCE(asl.is_licensed, false) as state_licensed
  FROM public.profiles p
  INNER JOIN auth.users u ON u.id = p.user_id
  INNER JOIN public.agent_carrier_licenses acl ON acl.agent_user_id = p.user_id
  INNER JOIN public.carriers c ON c.id = acl.carrier_id AND LOWER(c.carrier_name) = LOWER(p_carrier_name)
  INNER JOIN public.agent_state_licenses asl ON asl.agent_user_id = p.user_id
  INNER JOIN public.states s ON s.id = asl.state_id AND LOWER(s.state_name) = LOWER(p_state_name)
  WHERE 
    acl.is_licensed = true 
    AND asl.is_licensed = true
    AND c.is_active = true
    AND s.is_active = true
  ORDER BY p.display_name;
END;
$$;

COMMENT ON FUNCTION public.get_eligible_agents IS 'Returns all agents licensed for a specific carrier and state combination';

-- Fix is_agent_eligible function
DROP FUNCTION IF EXISTS public.is_agent_eligible(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.is_agent_eligible(
  p_agent_user_id UUID,
  p_carrier_name TEXT,
  p_state_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_carrier_licensed BOOLEAN := false;
  v_state_licensed BOOLEAN := false;
BEGIN
  -- Check carrier license
  SELECT COALESCE(acl.is_licensed, false)
  INTO v_carrier_licensed
  FROM public.agent_carrier_licenses acl
  INNER JOIN public.carriers c ON c.id = acl.carrier_id
  WHERE acl.agent_user_id = p_agent_user_id
    AND LOWER(c.carrier_name::TEXT) = LOWER(p_carrier_name)
    AND c.is_active = true
  LIMIT 1;

  -- Check state license
  SELECT COALESCE(asl.is_licensed, false)
  INTO v_state_licensed
  FROM public.agent_state_licenses asl
  INNER JOIN public.states s ON s.id = asl.state_id
  WHERE asl.agent_user_id = p_agent_user_id
    AND LOWER(s.state_name::TEXT) = LOWER(p_state_name)
    AND s.is_active = true
  LIMIT 1;

  -- Return true only if licensed for both
  RETURN v_carrier_licensed AND v_state_licensed;
END;
$$;

COMMENT ON FUNCTION public.is_agent_eligible IS 'Checks if a specific agent is eligible for a carrier and state combination';

-- Fix get_agent_licensing_summary function
DROP FUNCTION IF EXISTS public.get_agent_licensing_summary(UUID);

CREATE OR REPLACE FUNCTION public.get_agent_licensing_summary(
  p_agent_user_id UUID
)
RETURNS TABLE (
  total_carriers INTEGER,
  total_states INTEGER,
  carrier_names TEXT[],
  state_names TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER 
     FROM public.agent_carrier_licenses acl 
     WHERE acl.agent_user_id = p_agent_user_id AND acl.is_licensed = true),
    (SELECT COUNT(*)::INTEGER 
     FROM public.agent_state_licenses asl 
     WHERE asl.agent_user_id = p_agent_user_id AND asl.is_licensed = true),
    (SELECT ARRAY_AGG(c.carrier_name::TEXT ORDER BY c.carrier_name)
     FROM public.agent_carrier_licenses acl
     INNER JOIN public.carriers c ON c.id = acl.carrier_id
     WHERE acl.agent_user_id = p_agent_user_id AND acl.is_licensed = true),
    (SELECT ARRAY_AGG(s.state_name::TEXT ORDER BY s.state_name)
     FROM public.agent_state_licenses asl
     INNER JOIN public.states s ON s.id = asl.state_id
     WHERE asl.agent_user_id = p_agent_user_id AND asl.is_licensed = true);
END;
$$;

COMMENT ON FUNCTION public.get_agent_licensing_summary IS 'Returns a summary of all carriers and states an agent is licensed for';
