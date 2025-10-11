-- =====================================================
-- HELPER SCRIPT: SET UP AGENT LICENSES
-- =====================================================
-- Use this script to easily configure an agent's carrier and state licenses
-- 
-- Instructions:
-- 1. Replace 'AGENT_EMAIL_HERE' with the agent's actual email
-- 2. Modify the carrier and state lists as needed
-- 3. Run this script
-- =====================================================

DO $$
DECLARE
  v_agent_user_id UUID;
  v_agent_email TEXT := 'AGENT_EMAIL_HERE'; -- CHANGE THIS
BEGIN
  -- Get agent's user ID
  SELECT id INTO v_agent_user_id 
  FROM auth.users 
  WHERE email = v_agent_email
  LIMIT 1;

  IF v_agent_user_id IS NULL THEN
    RAISE EXCEPTION 'Agent with email % not found. Please create the user first.', v_agent_email;
  END IF;

  RAISE NOTICE 'Setting up licenses for agent: % (ID: %)', v_agent_email, v_agent_user_id;

  -- =====================================================
  -- CARRIER LICENSES
  -- =====================================================
  
  -- Add carriers this agent IS licensed for
  INSERT INTO public.agent_carrier_licenses (agent_user_id, carrier_id, is_licensed)
  SELECT v_agent_user_id, id, true
  FROM public.carriers
  WHERE carrier_name IN (
    -- EDIT THIS LIST - Add carriers the agent IS licensed for
    'Liberty Bankers',
    'AMAM',
    'Pioneer',
    'Occidental',
    'MOA',
    'Royal Neighbors',
    'Aetna',
    'Americo',
    'CoreBridge',
    'TransAmerica'
  )
  ON CONFLICT (agent_user_id, carrier_id) 
  DO UPDATE SET is_licensed = true, updated_at = now();

  RAISE NOTICE 'Added % carrier licenses', (
    SELECT COUNT(*) FROM public.agent_carrier_licenses 
    WHERE agent_user_id = v_agent_user_id AND is_licensed = true
  );

  -- =====================================================
  -- STATE LICENSES
  -- =====================================================
  
  -- Add states this agent IS licensed for
  INSERT INTO public.agent_state_licenses (agent_user_id, state_id, is_licensed)
  SELECT v_agent_user_id, id, true
  FROM public.states
  WHERE state_name IN (
    -- EDIT THIS LIST - Add states the agent IS licensed for
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
    'Colorado', 'Connecticut', 'District of Columbia', 'Florida', 
    'Georgia', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas',
    'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
    'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana',
    'Nebraska', 'New Jersey', 'New York', 'North Carolina', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'South Carolina', 'Tennessee',
    'Texas', 'Utah', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin'
  )
  ON CONFLICT (agent_user_id, state_id) 
  DO UPDATE SET is_licensed = true, updated_at = now();

  RAISE NOTICE 'Added % state licenses', (
    SELECT COUNT(*) FROM public.agent_state_licenses 
    WHERE agent_user_id = v_agent_user_id AND is_licensed = true
  );

  -- =====================================================
  -- VERIFICATION
  -- =====================================================
  
  -- Display summary
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Setup complete!';
  RAISE NOTICE 'Agent: %', v_agent_email;
  RAISE NOTICE 'Total Carriers: %', (
    SELECT COUNT(*) FROM public.agent_carrier_licenses 
    WHERE agent_user_id = v_agent_user_id AND is_licensed = true
  );
  RAISE NOTICE 'Total States: %', (
    SELECT COUNT(*) FROM public.agent_state_licenses 
    WHERE agent_user_id = v_agent_user_id AND is_licensed = true
  );
  RAISE NOTICE '===========================================';

END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- View the agent's carrier licenses
SELECT 
  p.display_name as agent_name,
  c.carrier_name,
  acl.is_licensed,
  acl.created_at,
  acl.updated_at
FROM public.agent_carrier_licenses acl
JOIN public.profiles p ON p.user_id = acl.agent_user_id
JOIN public.carriers c ON c.id = acl.carrier_id
WHERE acl.agent_user_id = (SELECT id FROM auth.users WHERE email = 'AGENT_EMAIL_HERE')
ORDER BY c.carrier_name;

-- View the agent's state licenses
SELECT 
  p.display_name as agent_name,
  s.state_name,
  s.state_code,
  asl.is_licensed,
  asl.created_at,
  asl.updated_at
FROM public.agent_state_licenses asl
JOIN public.profiles p ON p.user_id = asl.agent_user_id
JOIN public.states s ON s.id = asl.state_id
WHERE asl.agent_user_id = (SELECT id FROM auth.users WHERE email = 'AGENT_EMAIL_HERE')
ORDER BY s.state_name;
