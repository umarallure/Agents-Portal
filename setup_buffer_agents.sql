-- Insert buffer agents into agent_status table
-- This will set up the buffer agents for the verification system

-- First, let's create profiles for the buffer agents if they don't exist
-- (These should already exist if the users are in auth.users)

-- Insert Kyla as buffer agent
INSERT INTO public.agent_status (user_id, status, agent_type, last_activity)
VALUES ('96153ce4-1d62-4434-8b3a-a4b6b178be26', 'available', 'buffer', NOW())
ON CONFLICT (user_id) DO UPDATE SET
  agent_type = 'buffer',
  status = 'available',
  last_activity = NOW();

-- Insert Ira as buffer agent  
INSERT INTO public.agent_status (user_id, status, agent_type, last_activity)
VALUES ('24e4781c-474c-4898-a22a-985b5f0066a2', 'available', 'buffer', NOW())
ON CONFLICT (user_id) DO UPDATE SET
  agent_type = 'buffer',
  status = 'available',
  last_activity = NOW();

-- Insert Bryan as buffer agent
INSERT INTO public.agent_status (user_id, status, agent_type, last_activity)
VALUES ('27cfea76-6bd0-4543-90f1-7bc313429825', 'available', 'buffer', NOW())
ON CONFLICT (user_id) DO UPDATE SET
  agent_type = 'buffer',
  status = 'available',
  last_activity = NOW();

-- Verify the buffer agents were inserted correctly
SELECT 
  as_table.user_id,
  as_table.status,
  as_table.agent_type,
  p.display_name,
  au.email
FROM public.agent_status as_table
LEFT JOIN public.profiles p ON p.user_id = as_table.user_id
LEFT JOIN auth.users au ON au.id = as_table.user_id
WHERE as_table.agent_type = 'buffer';

-- Optional: Create profiles if they don't exist (run these if needed)
-- INSERT INTO public.profiles (user_id, display_name) 
-- VALUES ('96153ce4-1d62-4434-8b3a-a4b6b178be26', 'Kyla')
-- ON CONFLICT (user_id) DO UPDATE SET display_name = 'Kyla';

-- INSERT INTO public.profiles (user_id, display_name) 
-- VALUES ('24e4781c-474c-4898-a22a-985b5f0066a2', 'Ira')
-- ON CONFLICT (user_id) DO UPDATE SET display_name = 'Ira';

-- INSERT INTO public.profiles (user_id, display_name) 
-- VALUES ('27cfea76-6bd0-4543-90f1-7bc313429825', 'Bryan')
-- ON CONFLICT (user_id) DO UPDATE SET display_name = 'Bryan';

-- Create a sample lead for testing the verification system
INSERT INTO public.leads (
  submission_id,
  customer_full_name,
  street_address,
  city,
  state,
  zip_code,
  phone_number,
  email,
  date_of_birth,
  age,
  social_security,
  health_conditions,
  carrier,
  product_type,
  coverage_amount,
  monthly_premium,
  draft_date,
  beneficiary_routing,
  beneficiary_account,
  additional_notes,
  birth_state,
  driver_license,
  existing_coverage,
  previous_applications,
  height,
  weight,
  doctors_name,
  tobacco_use,
  medications,
  beneficiary_information,
  institution_name,
  account_type,
  lead_vendor
) VALUES (
  'TEST001',
  'William G Moore',
  '8700 NE 16th St',
  'Oklahoma City',
  'OK',
  '73110',
  '(405) 423-4272',
  'william.moore@example.com',
  '1948-05-26',
  77,
  '447489617',
  'nil',
  'AMAM',
  'Senior Choice Immediate',
  5000.00,
  63.37,
  '8th of aug',
  '103900036',
  '103900036',
  'Nil',
  'NE',
  'nil',
  'nil',
  'nil',
  '5.2',
  '160',
  'Dr. Daniel Pham, MD',
  'NO',
  'nil',
  'Son Garland Moore ( 09 08 1985)',
  'Bank of Oklahoma',
  'Checking',
  'Corebiz'
);

-- Verify the test lead was created
SELECT * FROM public.leads WHERE submission_id = 'TEST001';
