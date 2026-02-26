# Upline License Checking System

## Overview
This system implements upline-dependent licensing requirements for insurance carriers. Certain states (called "override states") require that an agent's upline must also be licensed in that state and carrier before the agent can submit applications.

## Database Structure

### New Tables

#### 1. `agent_upline_hierarchy`
Tracks the upline-downline relationships between agents.

**Columns:**
- `id` (UUID, Primary Key)
- `agent_user_id` (UUID, References auth.users) - The agent
- `upline_user_id` (UUID, References auth.users) - The agent's upline/manager
- `relationship_type` (TEXT) - Default: 'downline'
- `is_active` (BOOLEAN) - Default: true
- `notes` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)

**Current Relationships:**
- **Benjamin's Downlines:** Lydia
- **Abdul's Downlines:** Isaac, Trinity (to be added), Noah (to be added)

#### 2. `carrier_override_states`
Defines which states require upline licenses for specific carriers.

**Columns:**
- `id` (UUID, Primary Key)
- `carrier_id` (UUID, References carriers)
- `state_id` (UUID, References states)
- `requires_upline_license` (BOOLEAN) - Default: true
- `notes` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)

**Current Override States (AMAM):**
- New Mexico
- South Dakota
- Montana
- Virginia
- California
- Florida
- Georgia
- Kentucky
- Louisiana
- Massachusetts
- Mississippi
- North Carolina
- Pennsylvania
- South Carolina
- West Virginia
- Wisconsin
- Texas

## New Database Function

### `get_eligible_agents_with_upline_check(p_carrier_name TEXT, p_state_name TEXT)`

This function returns eligible agents considering:
1. Agent's own carrier license
2. Agent's own state license
3. **Upline's carrier license** (if required for that state/carrier)
4. **Upline's state license** (if required for that state/carrier)

**Returns:**
- `user_id` - Agent's user ID
- `agent_name` - Agent's display name
- `email` - Agent's email
- `agent_code` - Agent's code
- `carrier_licensed` - Agent has carrier license
- `state_licensed` - Agent has state license
- `upline_licensed` - Upline has required licenses (if applicable)
- `upline_required` - Whether this state requires upline license
- `upline_name` - Name of the upline (if any)

## New Edge Function

### `notify-eligible-agents-with-upline`
Located in: `supabase/functions/notify-eligible-agents-with-upline/index.ts`

This is a copy of the original `notify-eligible-agents` function but uses the new upline-aware logic.

**Key Differences:**
1. Calls `get_eligible_agents_with_upline_check()` instead of `get_eligible_agents()`
2. Shows upline names in Slack notifications when applicable
3. Adds context message for override states
4. Filters out agents whose uplines are not licensed

## Testing Scenarios

### Test Data Setup
The following test data has been created:

**Scenario 1: Isaac (downline of Abdul) - BLOCKED**
- Isaac has: AMAM carrier license ✓
- Isaac has: California state license ✓
- Abdul has: AMAM carrier license ✓
- Abdul has: California state license ✗ (NOT LICENSED)
- **Result:** Isaac will NOT appear as eligible for AMAM in California

**Scenario 2: Lydia (downline of Benjamin) - ALLOWED**
- Lydia has: AMAM carrier license ✓
- Lydia has: California state license ✓
- Benjamin has: AMAM carrier license ✓
- Benjamin has: California state license ✓
- **Result:** Lydia WILL appear as eligible for AMAM in California

### SQL Test Queries

```sql
-- Test the upline check function
SELECT 
  agent_name,
  carrier_licensed,
  state_licensed,
  upline_required,
  upline_licensed,
  upline_name
FROM get_eligible_agents_with_upline_check('AMAM', 'California')
ORDER BY agent_name;

-- Expected Result:
-- Benjamin (no upline, IS licensed)
-- Lydia (upline: Benjamin, IS licensed)
-- Isaac should NOT appear (upline: Abdul, NOT licensed in CA)
```

### Testing the Edge Function

```bash
# Test with curl (from command line)
curl -X POST https://[your-project].supabase.co/functions/v1/notify-eligible-agents-with-upline \
  -H "Authorization: Bearer [your-anon-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "carrier": "AMAM",
    "state": "California",
    "lead_vendor": "Test"
  }'
```

## Adding New Upline Relationships

```sql
-- Add Trinity as Abdul's downline
INSERT INTO agent_upline_hierarchy (agent_user_id, upline_user_id, relationship_type, notes)
SELECT 
  (SELECT user_id FROM profiles WHERE display_name = 'Trinity'),
  (SELECT user_id FROM profiles WHERE display_name = 'Abdul'),
  'downline',
  'Trinity reports to Abdul'
ON CONFLICT (agent_user_id, upline_user_id) DO NOTHING;

-- Add Noah as Abdul's downline
INSERT INTO agent_upline_hierarchy (agent_user_id, upline_user_id, relationship_type, notes)
SELECT 
  (SELECT user_id FROM profiles WHERE display_name = 'Noah'),
  (SELECT user_id FROM profiles WHERE display_name = 'Abdul'),
  'downline',
  'Noah reports to Abdul'
ON CONFLICT (agent_user_id, upline_user_id) DO NOTHING;
```

## Adding Override States for Other Carriers

```sql
-- Example: Add override states for another carrier
INSERT INTO carrier_override_states (carrier_id, state_id, requires_upline_license, notes)
SELECT 
  (SELECT id FROM carriers WHERE carrier_name = 'Liberty Bankers'),
  s.id,
  true,
  'Liberty Bankers override state'
FROM states s
WHERE s.state_name IN ('Florida', 'Texas', 'California')
ON CONFLICT (carrier_id, state_id) DO UPDATE 
SET requires_upline_license = EXCLUDED.requires_upline_license,
    updated_at = NOW();
```

## How It Works

### Logic Flow

1. **Agent Query**: System receives request to find eligible agents for a carrier/state
2. **Standard Check**: Verifies agent has carrier and state licenses
3. **Override State Check**: Checks if this carrier/state requires upline license
4. **Upline Lookup**: If required, looks up agent's upline from `agent_upline_hierarchy`
5. **Upline License Check**: Verifies upline has both carrier and state licenses
6. **Filter Results**: Only returns agents who pass ALL checks

### Example: Isaac trying to submit AMAM in California

```
Step 1: Isaac has AMAM carrier license? ✓ YES
Step 2: Isaac has California state license? ✓ YES
Step 3: Is California an override state for AMAM? ✓ YES
Step 4: Who is Isaac's upline? → Abdul
Step 5: Does Abdul have AMAM carrier license? ✓ YES
Step 6: Does Abdul have California state license? ✗ NO
Result: Isaac is FILTERED OUT (not eligible)
```

### Example: Lydia trying to submit AMAM in California

```
Step 1: Lydia has AMAM carrier license? ✓ YES
Step 2: Lydia has California state license? ✓ YES
Step 3: Is California an override state for AMAM? ✓ YES
Step 4: Who is Lydia's upline? → Benjamin
Step 5: Does Benjamin have AMAM carrier license? ✓ YES
Step 6: Does Benjamin have California state license? ✓ YES
Result: Lydia is ELIGIBLE ✓
```

## Slack Notification Differences

### Original Function
```
🔔 New Lead Available

Call Center: Test
Carrier: AMAM
State: California

Agents who can take this call:
• @Isaac
• @Lydia
• @Benjamin

3 eligible agent(s)
```

### New Function (with upline check)
```
🔔 New Lead Available

Call Center: Test
Carrier: AMAM
State: California

⚠️ This is an override state - upline licenses verified

Agents who can take this call:
• @Lydia (upline: Benjamin)
• @Benjamin

2 eligible agent(s) (upline licenses verified)
```

## Maintenance

### View Current Upline Relationships
```sql
SELECT 
  p1.display_name as agent,
  p2.display_name as upline,
  h.is_active
FROM agent_upline_hierarchy h
JOIN profiles p1 ON p1.user_id = h.agent_user_id
JOIN profiles p2 ON p2.user_id = h.upline_user_id
ORDER BY p2.display_name, p1.display_name;
```

### View Override States by Carrier
```sql
SELECT 
  c.carrier_name,
  s.state_name,
  cos.requires_upline_license
FROM carrier_override_states cos
JOIN carriers c ON c.id = cos.carrier_id
JOIN states s ON s.id = cos.state_id
WHERE cos.requires_upline_license = true
ORDER BY c.carrier_name, s.state_name;
```

### Deactivate an Upline Relationship
```sql
UPDATE agent_upline_hierarchy
SET is_active = false, updated_at = NOW()
WHERE agent_user_id = (SELECT user_id FROM profiles WHERE display_name = 'Isaac')
  AND upline_user_id = (SELECT user_id FROM profiles WHERE display_name = 'Abdul');
```

## Benefits

1. **Automated Compliance**: System automatically enforces carrier override state rules
2. **Clear Communication**: Slack notifications show which agents can take calls considering upline requirements
3. **Flexible Configuration**: Easy to add/remove override states and upline relationships
4. **Audit Trail**: All relationships and override states are tracked in the database
5. **Scalable**: Can handle complex hierarchies with multiple levels

## Future Enhancements

1. Support for multi-level hierarchies (upline's upline)
2. Temporary upline assignments for coverage
3. Override state expiration dates
4. Email notifications for license requirement gaps
5. Dashboard to view upline license coverage
