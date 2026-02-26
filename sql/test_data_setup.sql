-- Test Data Setup Script for Call Result Updates
-- Run this before executing the test cases

-- Clean up any existing test data
DELETE FROM daily_deal_flow WHERE submission_id LIKE 'SUB00%' OR submission_id LIKE 'CBB%SUB00%';
DELETE FROM call_results WHERE submission_id LIKE 'SUB00%';
DELETE FROM leads WHERE submission_id LIKE 'SUB00%';

-- Create test lead data
INSERT INTO leads (
  submission_id,
  customer_full_name,
  phone_number,
  email,
  lead_vendor,
  submission_date
) VALUES 
  ('SUB001', 'John Doe', '555-0101', 'john.doe@email.com', 'Ark Tech', '2025-09-28'),
  ('SUB002', 'Jane Smith', '555-0102', 'jane.smith@email.com', 'GrowthOnics BPO', '2025-09-28'),
  ('SUB003', 'Bob Johnson', '555-0103', 'bob.johnson@email.com', 'Maverick', '2025-09-28'),
  ('SUB004', 'Alice Brown', '555-0104', 'alice.brown@email.com', 'Omnitalk BPO', '2025-09-28'),
  ('SUB005', 'Charlie Wilson', '555-0105', 'charlie.wilson@email.com', 'Vize BPO', '2025-09-28')
ON CONFLICT (submission_id) DO UPDATE SET
  customer_full_name = EXCLUDED.customer_full_name,
  phone_number = EXCLUDED.phone_number,
  email = EXCLUDED.email,
  lead_vendor = EXCLUDED.lead_vendor,
  submission_date = EXCLUDED.submission_date;

-- Create existing daily_deal_flow entries for update test scenarios
INSERT INTO daily_deal_flow (
  submission_id,
  lead_vendor,
  insured_name,
  client_phone_number,
  date,
  buffer_agent,
  agent,
  licensed_agent_account,
  status,
  call_result,
  from_callback,
  is_callback
) VALUES 
  ('SUB002', 'GrowthOnics BPO', 'Jane Smith', '555-0102', CURRENT_DATE, 'Ira', 'Juan', 'N/A', 'Needs BPO Callback', 'Not Submitted', false, false),
  ('SUB004', 'Omnitalk BPO', 'Alice Brown', '555-0104', CURRENT_DATE, 'N/A', 'Lydia', 'Claudia', 'Pending Approval', 'Submitted', true, false)
ON CONFLICT (submission_id, date) DO UPDATE SET
  status = EXCLUDED.status,
  call_result = EXCLUDED.call_result;

-- Verification query
SELECT 
  'Test data setup complete' as message,
  COUNT(*) as lead_count
FROM leads 
WHERE submission_id IN ('SUB001', 'SUB002', 'SUB003', 'SUB004', 'SUB005');