-- =====================================================
-- SEED DATA FOR AGENT LICENSING SYSTEM
-- =====================================================
-- This file contains initial seed data for carriers and states
-- Run this AFTER the main migration file
-- =====================================================

-- =====================================================
-- 1. INSERT CARRIERS
-- =====================================================

INSERT INTO public.carriers (carrier_name, is_active, display_order) VALUES
  ('Liberty Bankers', true, 1),
  ('AMAM', true, 2),
  ('Pioneer', true, 3),
  ('Occidental', true, 4),
  ('MOA', true, 5),
  ('Royal Neighbors', true, 6),
  ('Aetna', true, 7),
  ('Aflac', true, 8),
  ('Americo', true, 9),
  ('CoreBridge', true, 10),
  ('TransAmerica', true, 11),
  ('CICA', true, 12),
  ('GTL', true, 13),
  ('SBLI', true, 14),
  ('Chubb', true, 15),
  ('Foresters', true, 16),
  ('Baltimore Life', true, 17)
ON CONFLICT (carrier_name) DO NOTHING;

-- =====================================================
-- 2. INSERT STATES
-- =====================================================

INSERT INTO public.states (state_name, state_code, is_active, display_order) VALUES
  ('Alabama', 'AL', true, 1),
  ('Alaska', 'AK', true, 2),
  ('Arizona', 'AZ', true, 3),
  ('Arkansas', 'AR', true, 4),
  ('California', 'CA', true, 5),
  ('Colorado', 'CO', true, 6),
  ('Connecticut', 'CT', true, 7),
  ('Delaware', 'DE', true, 8),
  ('District of Columbia', 'DC', true, 9),
  ('Florida', 'FL', true, 10),
  ('Georgia', 'GA', true, 11),
  ('Guam', 'GU', true, 12),
  ('Hawaii', 'HI', true, 13),
  ('Idaho', 'ID', true, 14),
  ('Illinois', 'IL', true, 15),
  ('Indiana', 'IN', true, 16),
  ('Iowa', 'IA', true, 17),
  ('Kansas', 'KS', true, 18),
  ('Kentucky', 'KY', true, 19),
  ('Louisiana', 'LA', true, 20),
  ('Maine', 'ME', true, 21),
  ('Maryland', 'MD', true, 22),
  ('Massachusetts', 'MA', true, 23),
  ('Michigan', 'MI', true, 24),
  ('Minnesota', 'MN', true, 25),
  ('Mississippi', 'MS', true, 26),
  ('Missouri', 'MO', true, 27),
  ('Montana', 'MT', true, 28),
  ('Nebraska', 'NE', true, 29),
  ('Nevada', 'NV', true, 30),
  ('New Hampshire', 'NH', true, 31),
  ('New Jersey', 'NJ', true, 32),
  ('New Mexico', 'NM', true, 33),
  ('New York', 'NY', true, 34),
  ('North Carolina', 'NC', true, 35),
  ('North Dakota', 'ND', true, 36),
  ('Ohio', 'OH', true, 37),
  ('Oklahoma', 'OK', true, 38),
  ('Oregon', 'OR', true, 39),
  ('Pennsylvania', 'PA', true, 40),
  ('Puerto Rico', 'PR', true, 41),
  ('Rhode Island', 'RI', true, 42),
  ('South Carolina', 'SC', true, 43),
  ('South Dakota', 'SD', true, 44),
  ('Tennessee', 'TN', true, 45),
  ('Texas', 'TX', true, 46),
  ('Utah', 'UT', true, 47),
  ('Vermont', 'VT', true, 48),
  ('Virgin Islands', 'VI', true, 49),
  ('Virginia', 'VA', true, 50),
  ('Washington', 'WA', true, 51),
  ('West Virginia', 'WV', true, 52),
  ('Wisconsin', 'WI', true, 53),
  ('Wyoming', 'WY', true, 54)
ON CONFLICT (state_name) DO NOTHING;

-- =====================================================
-- 3. EXAMPLE: SET UP AGENT "BEN" WITH LICENSES
-- =====================================================
-- This is an example showing how to set up an agent's licenses
-- Replace 'ben@example.com' with the actual agent's email
-- Uncomment and modify as needed

/*
-- First, get Ben's user_id
DO $$
DECLARE
  v_agent_user_id UUID;
  v_carrier_id UUID;
  v_state_id UUID;
BEGIN
  -- Get Ben's user ID (replace with actual email)
  SELECT id INTO v_agent_user_id 
  FROM auth.users 
  WHERE email = 'ben@example.com'
  LIMIT 1;

  IF v_agent_user_id IS NULL THEN
    RAISE NOTICE 'Agent not found. Please create the user first or update the email.';
    RETURN;
  END IF;

  -- =====================================================
  -- CARRIER LICENSES FOR BEN
  -- =====================================================
  
  -- Licensed carriers (Yes)
  INSERT INTO public.agent_carrier_licenses (agent_user_id, carrier_id, is_licensed)
  SELECT v_agent_user_id, id, true
  FROM public.carriers
  WHERE carrier_name IN (
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
  DO UPDATE SET is_licensed = true;

  -- NOT licensed carriers (No)
  INSERT INTO public.agent_carrier_licenses (agent_user_id, carrier_id, is_licensed)
  SELECT v_agent_user_id, id, false
  FROM public.carriers
  WHERE carrier_name IN (
    'Aflac',
    'CICA',
    'GTL',
    'SBLI',
    'Chubb',
    'Foresters',
    'Baltimore Life'
  )
  ON CONFLICT (agent_user_id, carrier_id) 
  DO UPDATE SET is_licensed = false;

  -- =====================================================
  -- STATE LICENSES FOR BEN
  -- =====================================================
  
  -- Licensed states (Yes)
  INSERT INTO public.agent_state_licenses (agent_user_id, state_id, is_licensed)
  SELECT v_agent_user_id, id, true
  FROM public.states
  WHERE state_name IN (
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
  DO UPDATE SET is_licensed = true;

  -- NOT licensed states (No)
  INSERT INTO public.agent_state_licenses (agent_user_id, state_id, is_licensed)
  SELECT v_agent_user_id, id, false
  FROM public.states
  WHERE state_name IN (
    'Delaware', 'Guam', 'Hawaii', 'Nevada', 'New Hampshire',
    'New Mexico', 'North Dakota', 'Puerto Rico', 'Rhode Island',
    'South Dakota', 'Vermont', 'Virgin Islands', 'Wyoming'
  )
  ON CONFLICT (agent_user_id, state_id) 
  DO UPDATE SET is_licensed = false;

  RAISE NOTICE 'Successfully set up licenses for agent: %', v_agent_user_id;
END $$;
*/

-- =====================================================
-- 4. HELPER QUERIES FOR TESTING
-- =====================================================

-- View all carriers
-- SELECT * FROM public.carriers ORDER BY display_order;

-- View all states
-- SELECT * FROM public.states ORDER BY state_code;

-- View a specific agent's carrier licenses
-- SELECT 
--   p.display_name as agent_name,
--   c.carrier_name,
--   acl.is_licensed
-- FROM public.agent_carrier_licenses acl
-- JOIN public.profiles p ON p.user_id = acl.agent_user_id
-- JOIN public.carriers c ON c.id = acl.carrier_id
-- WHERE p.display_name = 'Ben'
-- ORDER BY c.carrier_name;

-- View a specific agent's state licenses
-- SELECT 
--   p.display_name as agent_name,
--   s.state_name,
--   s.state_code,
--   asl.is_licensed
-- FROM public.agent_state_licenses asl
-- JOIN public.profiles p ON p.user_id = asl.agent_user_id
-- JOIN public.states s ON s.id = asl.state_id
-- WHERE p.display_name = 'Ben'
-- ORDER BY s.state_name;

-- Find all agents eligible for a specific carrier and state
-- SELECT * FROM public.get_eligible_agents('Americo', 'California');

-- Check if a specific agent is eligible
-- SELECT public.is_agent_eligible(
--   (SELECT user_id FROM public.profiles WHERE display_name = 'Ben'),
--   'Americo',
--   'California'
-- );

-- Get licensing summary for an agent
-- SELECT * FROM public.get_agent_licensing_summary(
--   (SELECT user_id FROM public.profiles WHERE display_name = 'Ben')
-- );
