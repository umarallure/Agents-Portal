# Test Data Validation Queries

## After Each Test Scenario - Run These Validation Queries

### Test Scenario 1 Validation: BPO Transfer - New Entry
```sql
-- Should create new CBB entry
SELECT 
  submission_id,
  date,
  status,
  call_result,
  from_callback,
  is_callback,
  carrier,
  monthly_premium,
  face_amount
FROM daily_deal_flow 
WHERE submission_id LIKE 'CBB%SUB001'
ORDER BY created_at DESC 
LIMIT 1;
```

### Test Scenario 2 Validation: BPO Transfer - Update Existing
```sql
-- Should update existing SUB002 entry (no new CBB entry)
SELECT 
  submission_id,
  date,
  status,
  call_result,
  notes,
  updated_at
FROM daily_deal_flow 
WHERE submission_id = 'SUB002' 
  AND date = CURRENT_DATE;

-- Should NOT create CBB entry for SUB002
SELECT COUNT(*) as should_be_zero
FROM daily_deal_flow 
WHERE submission_id LIKE 'CBB%SUB002';
```

### Test Scenario 3 Validation: Agent Callback - New Entry
```sql
-- Should create new CBB entry for Agent Callback
SELECT 
  submission_id,
  date,
  status,
  call_result,
  from_callback,
  is_callback,
  carrier,
  monthly_premium,
  face_amount
FROM daily_deal_flow 
WHERE submission_id LIKE 'CBB%SUB003'
ORDER BY created_at DESC 
LIMIT 1;
```

### Test Scenario 4 Validation: Agent Callback - Update Existing
```sql
-- Should update existing SUB004 entry
SELECT 
  submission_id,
  date,
  status,
  call_result,
  notes,
  from_callback,
  updated_at
FROM daily_deal_flow 
WHERE submission_id = 'SUB004' 
  AND date = CURRENT_DATE;
```

### Test Scenario 5 Validation: Disconnected Call
```sql
-- Should create CBB entry for disconnected call
SELECT 
  submission_id,
  date,
  status,
  call_result,
  buffer_agent,
  agent
FROM daily_deal_flow 
WHERE submission_id LIKE 'CBB%SUB005'
  AND status = 'Incomplete Transfer';
```

## Call Results Table Validation

### Check all test call results were recorded
```sql
SELECT 
  submission_id,
  call_source,
  application_submitted,
  status,
  is_callback,
  created_at
FROM call_results 
WHERE submission_id IN ('SUB001', 'SUB002', 'SUB003', 'SUB004', 'SUB005')
ORDER BY submission_id, created_at DESC;
```

## Edge Cases Validation

### Check for duplicate entries on same date
```sql
-- Should return 0 duplicates
SELECT 
  submission_id,
  date,
  COUNT(*) as entry_count
FROM daily_deal_flow 
WHERE submission_id IN ('SUB001', 'SUB002', 'SUB003', 'SUB004', 'SUB005')
   OR submission_id LIKE 'CBB%SUB00%'
GROUP BY submission_id, date
HAVING COUNT(*) > 1;
```

### Check CBB prefix generation
```sql
-- All CBB entries should have is_callback = true
SELECT 
  submission_id,
  is_callback,
  from_callback,
  call_result
FROM daily_deal_flow 
WHERE submission_id LIKE 'CBB%'
  AND (is_callback = false OR is_callback IS NULL);
```

## Complete Test Results Overview
```sql
-- Summary of all test data after tests
SELECT 
  'Original Submissions' as category,
  COUNT(*) as count
FROM daily_deal_flow 
WHERE submission_id IN ('SUB001', 'SUB002', 'SUB003', 'SUB004', 'SUB005')

UNION ALL

SELECT 
  'CBB Callback Entries' as category,
  COUNT(*) as count
FROM daily_deal_flow 
WHERE submission_id LIKE 'CBB%SUB00%'

UNION ALL

SELECT 
  'Total Call Results' as category,
  COUNT(*) as count
FROM call_results 
WHERE submission_id IN ('SUB001', 'SUB002', 'SUB003', 'SUB004', 'SUB005');
```

## Cleanup After Testing
```sql
-- Run this to clean up test data after testing is complete
DELETE FROM daily_deal_flow WHERE submission_id LIKE 'SUB00%' OR submission_id LIKE 'CBB%SUB00%';
DELETE FROM call_results WHERE submission_id LIKE 'SUB00%';
DELETE FROM leads WHERE submission_id LIKE 'SUB00%';
```