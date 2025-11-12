# Upline License System - Test Scenarios

## Test Environment Setup

### Agent Hierarchy
```
Top Level (No Uplines):
├─ Benjamin (Ben001)
└─ Abdul (Abdul1)

Benjamin's Downlines:
└─ Lydia (Lydia001)

Abdul's Downlines:
├─ Isaac (isaac001)
├─ Trinity (TBD - to be added)
└─ Noah (TBD - to be added)
```

### Current Agent Licenses

| Agent    | AMAM | Aflac | Carriers | California | Texas | Florida | States |
|----------|------|-------|----------|------------|-------|---------|--------|
| Benjamin | ✅   | ❌    | 1        | ✅         | ✅    | ❌      | 2      |
| Abdul    | ✅   | ❌    | 1        | ❌         | ❌    | ❌      | 0      |
| Lydia    | ✅   | ❌    | 1        | ✅         | ❌    | ❌      | 1      |
| Isaac    | ✅   | ❌    | 1        | ✅         | ❌    | ❌      | 1      |

### Carriers with Override States (Require Upline License)

1. **AMAM** (17 override states): California, Florida, Georgia, Kentucky, Louisiana, Massachusetts, Mississippi, Montana, New Mexico, North Carolina, Pennsylvania, South Carolina, South Dakota, Texas, Virginia, West Virginia, Wisconsin

2. **Aetna** (28 override states): Alaska, Arkansas, Colorado, Connecticut, District of Columbia, Hawaii, Idaho, Indiana, Iowa, Kansas, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, New Jersey, New Mexico, North Carolina, Oklahoma, Oregon, South Carolina, South Dakota, Tennessee, Texas, Virginia, West Virginia

3. **SBLI** (13 override states): California, Florida, Georgia, Kansas, Kentucky, Louisiana, Massachusetts, New Mexico, Pennsylvania, South Carolina, Texas, Virginia, Wisconsin

4. **Royal Neighbors** (13 override states): California, Florida, Georgia, Kentucky, Montana, New Mexico, Pennsylvania, South Carolina, South Dakota, Texas, Virginia, West Virginia, Wisconsin

5. **TransAmerica** (11 override states): Georgia, Guam, Massachusetts, Mississippi, Montana, New Mexico, Pennsylvania, Puerto Rico, Virgin Islands, Virginia, West Virginia

6. **Liberty Bankers** (8 override states): Florida, Georgia, Massachusetts, Montana, South Dakota, Virginia, West Virginia, Wisconsin

7. **MOA** (7 override states): Georgia, Massachusetts, Mississippi, Montana, New Mexico, Pennsylvania, Virginia

8. **GTL** (5 override states): Iowa, Rhode Island, Tennessee, Vermont, Wisconsin

### Carriers WITHOUT Override States (No Upline Required)
- Aflac
- Americo
- Baltimore Life
- Chubb
- CICA
- CoreBridge
- Foresters
- Occidental
- Pioneer

---

## Test Scenarios

### 🟢 Test Category 1: Non-Override States (No Upline Required)

#### Test 1.1: Aflac in Any State (No Override States Exist)
**Carrier:** Aflac  
**State:** Any state (e.g., California)  
**Expected Behavior:** Upline licensing NOT required  
**Expected Results:**
- All agents licensed for Aflac + California should appear
- No upline checking performed
- `upline_required` = false for all results

**SQL Test:**
```sql
SELECT * FROM get_eligible_agents_with_upline_check('Aflac', 'California');
```

**Expected Agents:** Any agent with Aflac + California licenses (regardless of upline status)

---

#### Test 1.2: AMAM in Non-Override State
**Carrier:** AMAM  
**State:** New York (NOT an override state)  
**Expected Behavior:** Upline licensing NOT required even though AMAM has override states  
**Expected Results:**
- All agents licensed for AMAM + New York appear
- `upline_required` = false
- `upline_licensed` = true (default for non-override states)

**SQL Test:**
```sql
SELECT * FROM get_eligible_agents_with_upline_check('AMAM', 'New York');
```

---

### 🔴 Test Category 2: Override States with Upline Blocking

#### Test 2.1: AMAM in California - Isaac BLOCKED
**Carrier:** AMAM  
**State:** California (AMAM override state)  
**Expected Behavior:** Isaac should be BLOCKED  
**Reason:**
- ✅ Isaac has AMAM license
- ✅ Isaac has California license
- ⚠️ California is AMAM override state
- 🔍 Isaac's upline: Abdul
- ✅ Abdul has AMAM license
- ❌ Abdul does NOT have California license
- **Result:** Isaac BLOCKED

**Expected Agents:**
- ✅ Benjamin (no upline, passes)
- ✅ Lydia (upline Benjamin has both AMAM + California)
- ❌ Isaac (BLOCKED - upline Abdul missing California)

**SQL Test:**
```sql
SELECT 
  agent_name, 
  agent_code,
  upline_name,
  carrier_licensed,
  state_licensed,
  upline_licensed,
  upline_required
FROM get_eligible_agents_with_upline_check('AMAM', 'California')
ORDER BY agent_name;
```

**Expected Output:**
```
agent_name | agent_code | upline_name | carrier_licensed | state_licensed | upline_licensed | upline_required
-----------|------------|-------------|------------------|----------------|-----------------|----------------
Benjamin   | Ben001     | null        | true             | true           | true            | true
Lydia      | Lydia001   | Benjamin    | true             | true           | true            | true
```

---

#### Test 2.2: AMAM in Texas - All BLOCKED (Except Top-Level)
**Carrier:** AMAM  
**State:** Texas (AMAM override state)  
**Expected Behavior:** Most agents blocked due to no Texas licenses  
**Current Licenses:**
- Benjamin: ✅ AMAM, ✅ Texas
- Abdul: ✅ AMAM, ❌ Texas
- Lydia: ✅ AMAM, ❌ Texas (blocked - no Texas license herself)
- Isaac: ✅ AMAM, ❌ Texas (blocked - no Texas license)

**Expected Agents:**
- ✅ Benjamin only (has both AMAM + Texas, no upline)

**SQL Test:**
```sql
SELECT * FROM get_eligible_agents_with_upline_check('AMAM', 'Texas');
```

---

#### Test 2.3: SBLI in California - Upline Checking
**Carrier:** SBLI  
**State:** California (SBLI override state)  
**Setup Required:** Need to add SBLI licenses to test agents

**Pre-Test Setup:**
```sql
-- Add SBLI licenses to test agents
INSERT INTO agent_carrier_licenses (agent_user_id, carrier_id, is_licensed)
SELECT p.user_id, c.id, true
FROM profiles p
CROSS JOIN carriers c
WHERE p.display_name IN ('Benjamin', 'Abdul', 'Lydia', 'Isaac')
  AND c.carrier_name = 'SBLI'
ON CONFLICT (agent_user_id, carrier_id) DO UPDATE SET is_licensed = true;
```

**Expected Behavior:** Same blocking logic as AMAM

---

### 🟡 Test Category 3: Edge Cases

#### Test 3.1: Agent with No Upline in Override State
**Carrier:** AMAM  
**State:** California  
**Agent:** Benjamin (no upline)  
**Expected Behavior:** ELIGIBLE (top-level agents bypass upline check)  
**Reason:** When an agent has no upline, they are not blocked even in override states

**Expected:**
- `upline_required` = true (state requires it)
- `upline_licensed` = true (default/bypass for no upline)
- Agent appears in results

---

#### Test 3.2: Circular or Invalid Upline Relationship
**Scenario:** Agent has inactive upline relationship  
**Setup:**
```sql
UPDATE agent_upline_hierarchy 
SET is_active = false 
WHERE agent_user_id = (SELECT user_id FROM profiles WHERE display_name = 'Isaac');
```

**Carrier:** AMAM  
**State:** California  
**Expected Behavior:** Isaac treated as having no upline (should appear)

**Cleanup:**
```sql
UPDATE agent_upline_hierarchy 
SET is_active = true 
WHERE agent_user_id = (SELECT user_id FROM profiles WHERE display_name = 'Isaac');
```

---

#### Test 3.3: Agent Licensed, Upline Licensed in Different State
**Carrier:** AMAM  
**State:** Florida (AMAM override state)  
**Current Setup:**
- Isaac: ✅ AMAM, ❌ Florida
- Abdul: ✅ AMAM, ❌ Florida

**Expected:** Isaac should NOT appear (not licensed in Florida himself)

---

#### Test 3.4: Multiple Override States for Same Carrier
**Carrier:** AMAM  
**States to Test:** California, Texas, Florida (all AMAM override states)  
**Expected:** Same upline logic applies to all override states

**Test Each:**
```sql
SELECT agent_name FROM get_eligible_agents_with_upline_check('AMAM', 'California');
SELECT agent_name FROM get_eligible_agents_with_upline_check('AMAM', 'Texas');
SELECT agent_name FROM get_eligible_agents_with_upline_check('AMAM', 'Florida');
```

---

### 🔵 Test Category 4: Multi-Level Upline Hierarchy

#### Test 4.1: Three-Level Hierarchy
**Setup Required:** Add Trinity and Noah as Abdul's downlines

**Pre-Test Setup:**
```sql
-- Get user IDs
DO $$
DECLARE
  abdul_id UUID;
  trinity_id UUID;
  noah_id UUID;
BEGIN
  SELECT user_id INTO abdul_id FROM profiles WHERE display_name = 'Abdul';
  SELECT user_id INTO trinity_id FROM profiles WHERE display_name = 'Trinity';
  SELECT user_id INTO noah_id FROM profiles WHERE display_name = 'Noah';
  
  -- Add Trinity under Abdul
  INSERT INTO agent_upline_hierarchy (agent_user_id, upline_user_id, relationship_type, is_active)
  VALUES (trinity_id, abdul_id, 'downline', true)
  ON CONFLICT DO NOTHING;
  
  -- Add Noah under Abdul
  INSERT INTO agent_upline_hierarchy (agent_user_id, upline_user_id, relationship_type, is_active)
  VALUES (noah_id, abdul_id, 'downline', true)
  ON CONFLICT DO NOTHING;
END $$;
```

**Hierarchy:**
```
Abdul (Top)
├─ Isaac
├─ Trinity
└─ Noah
```

**Carrier:** AMAM  
**State:** California  
**Expected Behavior:**
- If Trinity/Noah have AMAM + California, but Abdul doesn't have California: ALL BLOCKED
- System only checks immediate upline (Abdul), not beyond

---

### 🟣 Test Category 5: Carrier Comparison

#### Test 5.1: Same State, Different Carriers
**State:** Massachusetts  
**Test Carriers:**
1. **AMAM** (Massachusetts is override state) - Requires upline
2. **Aflac** (No override states) - No upline required

**Expected:**
- AMAM in MA: Upline checking active
- Aflac in MA: No upline checking

**SQL Tests:**
```sql
-- Should show different result counts
SELECT COUNT(*) FROM get_eligible_agents_with_upline_check('AMAM', 'Massachusetts');
SELECT COUNT(*) FROM get_eligible_agents_with_upline_check('Aflac', 'Massachusetts');
```

---

#### Test 5.2: Multiple Carriers with Same Override State
**State:** Georgia (override state for AMAM, SBLI, Royal Neighbors, TransAmerica, Liberty Bankers, MOA)  
**Expected:** All should apply upline checking logic

---

### 🟠 Test Category 6: Performance & Data Integrity

#### Test 6.1: Missing Carrier
**Carrier:** InvalidCarrier  
**State:** California  
**Expected:** Empty result set (no error)

**SQL Test:**
```sql
SELECT * FROM get_eligible_agents_with_upline_check('InvalidCarrier', 'California');
```

---

#### Test 6.2: Missing State
**Carrier:** AMAM  
**State:** InvalidState  
**Expected:** Empty result set (no error)

**SQL Test:**
```sql
SELECT * FROM get_eligible_agents_with_upline_check('AMAM', 'InvalidState');
```

---

#### Test 6.3: Case Sensitivity
**Tests:**
```sql
-- Should all return same results
SELECT * FROM get_eligible_agents_with_upline_check('AMAM', 'California');
SELECT * FROM get_eligible_agents_with_upline_check('amam', 'california');
SELECT * FROM get_eligible_agents_with_upline_check('Amam', 'CALIFORNIA');
```

**Expected:** Function uses LOWER() - all should return identical results

---

## Automated Test Script

Run all tests at once:

```sql
-- ============================================
-- COMPREHENSIVE UPLINE LICENSE TEST SUITE
-- ============================================

-- Test 1: AMAM + California (Core Test)
SELECT 'Test 1: AMAM + California (Should show Benjamin & Lydia, NOT Isaac)' as test_name;
SELECT 
  agent_name, 
  agent_code,
  upline_name,
  upline_required,
  upline_licensed,
  CASE 
    WHEN agent_name = 'Isaac' THEN '❌ FAIL - Isaac should be blocked'
    WHEN agent_name IN ('Benjamin', 'Lydia') THEN '✅ PASS'
    ELSE '⚠️ Unexpected agent'
  END as test_result
FROM get_eligible_agents_with_upline_check('AMAM', 'California')
ORDER BY agent_name;

-- Test 2: AMAM + Texas (Should show only Benjamin)
SELECT 'Test 2: AMAM + Texas (Should show only Benjamin)' as test_name;
SELECT 
  agent_name,
  CASE 
    WHEN agent_name = 'Benjamin' THEN '✅ PASS'
    ELSE '❌ FAIL - Only Benjamin should appear'
  END as test_result
FROM get_eligible_agents_with_upline_check('AMAM', 'Texas');

-- Test 3: Aflac + California (No upline required)
SELECT 'Test 3: Aflac + California (Should show all Aflac+CA licensed agents)' as test_name;
SELECT 
  agent_name,
  upline_required,
  CASE 
    WHEN upline_required = false THEN '✅ PASS - No upline required'
    ELSE '❌ FAIL - Should not require upline'
  END as test_result
FROM get_eligible_agents_with_upline_check('Aflac', 'California');

-- Test 4: AMAM + New York (Non-override state)
SELECT 'Test 4: AMAM + New York (Non-override state, no upline required)' as test_name;
SELECT 
  agent_name,
  upline_required,
  CASE 
    WHEN upline_required = false THEN '✅ PASS - No upline required'
    ELSE '❌ FAIL - Should not require upline'
  END as test_result
FROM get_eligible_agents_with_upline_check('AMAM', 'New York');

-- Test 5: Case Insensitivity
SELECT 'Test 5: Case Insensitivity Check' as test_name;
WITH 
  uppercase AS (SELECT COUNT(*) as cnt FROM get_eligible_agents_with_upline_check('AMAM', 'CALIFORNIA')),
  lowercase AS (SELECT COUNT(*) as cnt FROM get_eligible_agents_with_upline_check('amam', 'california')),
  mixedcase AS (SELECT COUNT(*) as cnt FROM get_eligible_agents_with_upline_check('Amam', 'California'))
SELECT 
  CASE 
    WHEN uppercase.cnt = lowercase.cnt AND lowercase.cnt = mixedcase.cnt 
    THEN '✅ PASS - All cases return same count: ' || uppercase.cnt::text
    ELSE '❌ FAIL - Counts differ'
  END as test_result
FROM uppercase, lowercase, mixedcase;

-- Test 6: Invalid Carrier
SELECT 'Test 6: Invalid Carrier (Should return empty)' as test_name;
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - Returns empty set'
    ELSE '❌ FAIL - Should return empty'
  END as test_result
FROM get_eligible_agents_with_upline_check('InvalidCarrier', 'California');

-- Test 7: Invalid State
SELECT 'Test 7: Invalid State (Should return empty)' as test_name;
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - Returns empty set'
    ELSE '❌ FAIL - Should return empty'
  END as test_result
FROM get_eligible_agents_with_upline_check('AMAM', 'InvalidState');

-- Test Summary
SELECT 'TEST SUMMARY' as section;
SELECT 
  'Total Override States Configured' as metric,
  COUNT(*)::text as value
FROM carrier_override_states
WHERE requires_upline_license = true;

SELECT 
  'Carriers with Override States' as metric,
  COUNT(DISTINCT carrier_id)::text as value
FROM carrier_override_states
WHERE requires_upline_license = true;

SELECT 
  'Active Agent Upline Relationships' as metric,
  COUNT(*)::text as value
FROM agent_upline_hierarchy
WHERE is_active = true;
```

---

## Expected Test Results Summary

### ✅ Pass Criteria
- Test 1 (AMAM + CA): Returns 2 agents (Benjamin, Lydia) - NOT Isaac
- Test 2 (AMAM + TX): Returns 1 agent (Benjamin only)
- Test 3 (Aflac + CA): All agents with licenses appear, upline_required = false
- Test 4 (AMAM + NY): upline_required = false for all results
- Test 5: All case variations return same count
- Test 6: Returns 0 rows (empty set)
- Test 7: Returns 0 rows (empty set)

### ❌ Failure Indicators
- Isaac appears for AMAM + California
- Upline checking triggered for non-override states
- Case sensitivity affects results
- Errors on invalid inputs

---

## Manual Frontend Testing Checklist

1. ☐ Open `http://localhost:8080/agent-licensing`
2. ☐ Test AMAM + California → Should show 2 agents (Benjamin, Lydia)
3. ☐ Test AMAM + Texas → Should show 1 agent (Benjamin)
4. ☐ Test Aflac + California → Should show all Aflac-licensed agents
5. ☐ Verify upline badges appear correctly
6. ☐ Verify "Upline Missing" badge appears if needed
7. ☐ Check upline name displays under agent info
8. ☐ Refresh and retest to ensure consistency

---

## Cleanup/Reset Commands

```sql
-- Reset Isaac's upline if deactivated during testing
UPDATE agent_upline_hierarchy 
SET is_active = true 
WHERE agent_user_id = (SELECT user_id FROM profiles WHERE display_name = 'Isaac');

-- Remove test SBLI licenses if added
DELETE FROM agent_carrier_licenses 
WHERE carrier_id = (SELECT id FROM carriers WHERE carrier_name = 'SBLI')
  AND agent_user_id IN (
    SELECT user_id FROM profiles WHERE display_name IN ('Trinity', 'Noah')
  );
```
