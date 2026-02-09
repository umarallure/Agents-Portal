-- =====================================================
-- POPULATE AFLAC STATES FOR EXISTING AFLAC AGENTS
-- =====================================================
-- This script populates the aflac_agent_state_availability table
-- with all 52 US states/territories for agents who have Aflac carrier license.
-- Run this after deploying the Aflac state availability system.
-- Can be run multiple times safely (uses ON CONFLICT).
-- =====================================================

-- All 52 US States/Territories
WITH all_states AS (
  SELECT * FROM (VALUES
    ('Alabama', 'AL'),
    ('Alaska', 'AK'),
    ('Arizona', 'AZ'),
    ('Arkansas', 'AR'),
    ('California', 'CA'),
    ('Colorado', 'CO'),
    ('Connecticut', 'CT'),
    ('Delaware', 'DE'),
    ('District of Columbia', 'DC'),
    ('Florida', 'FL'),
    ('Georgia', 'GA'),
    ('Guam', 'GU'),
    ('Hawaii', 'HI'),
    ('Idaho', 'ID'),
    ('Illinois', 'IL'),
    ('Indiana', 'IN'),
    ('Iowa', 'IA'),
    ('Kansas', 'KS'),
    ('Kentucky', 'KY'),
    ('Louisiana', 'LA'),
    ('Maine', 'ME'),
    ('Maryland', 'MD'),
    ('Massachusetts', 'MA'),
    ('Michigan', 'MI'),
    ('Minnesota', 'MN'),
    ('Mississippi', 'MS'),
    ('Missouri', 'MO'),
    ('Montana', 'MT'),
    ('Nebraska', 'NE'),
    ('Nevada', 'NV'),
    ('New Hampshire', 'NH'),
    ('New Jersey', 'NJ'),
    ('New Mexico', 'NM'),
    ('New York', 'NY'),
    ('North Carolina', 'NC'),
    ('North Dakota', 'ND'),
    ('Ohio', 'OH'),
    ('Oklahoma', 'OK'),
    ('Oregon', 'OR'),
    ('Pennsylvania', 'PA'),
    ('Puerto Rico', 'PR'),
    ('Rhode Island', 'RI'),
    ('South Carolina', 'SC'),
    ('South Dakota', 'SD'),
    ('Tennessee', 'TN'),
    ('Texas', 'TX'),
    ('Utah', 'UT'),
    ('Vermont', 'VT'),
    ('Virgin Islands', 'VI'),
    ('Virginia', 'VA'),
    ('Washington', 'WA'),
    ('West Virginia', 'WV'),
    ('Wisconsin', 'WI'),
    ('Wyoming', 'WY')
  ) AS t(state_name, state_code)
),

-- Get Aflac carrier ID
aflac_carrier AS (
  SELECT id 
  FROM public.carriers 
  WHERE LOWER(carrier_name) = 'aflac'
  LIMIT 1
),

-- Get all agents who have Aflac carrier license
aflac_agents AS (
  SELECT DISTINCT acl.agent_user_id
  FROM public.agent_carrier_licenses acl
  INNER JOIN aflac_carrier ac ON acl.carrier_id = ac.id
  WHERE acl.is_licensed = true
)

-- Insert all states for all Aflac agents
INSERT INTO public.aflac_agent_state_availability (
  agent_user_id,
  state_name,
  state_code,
  is_available,
  requires_upline_license,
  notes,
  effective_date
)
SELECT 
  aa.agent_user_id,
  s.state_name,
  s.state_code,
  true, -- is_available
  true, -- requires_upline_license (always true for Aflac)
  'Initial setup - all states enabled',
  CURRENT_DATE
FROM aflac_agents aa
CROSS JOIN all_states s
ON CONFLICT (agent_user_id, state_name) DO UPDATE 
SET 
  is_available = EXCLUDED.is_available,
  state_code = EXCLUDED.state_code,
  requires_upline_license = EXCLUDED.requires_upline_license,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Report results
SELECT 
  'Aflac states populated successfully' as message,
  COUNT(*) as total_records,
  COUNT(DISTINCT agent_user_id) as agent_count
FROM public.aflac_agent_state_availability;
