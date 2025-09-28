# Personal Sales Portal Notification System

## Overview
This feature automatically posts call result notes to the appropriate licensed agent's personal sales portal when a call result is saved or updated.

## When Notes Are Posted
- **Trigger**: When a call result is saved/updated via CallResultForm
- **Condition 1**: Must have a licensed agent assigned (not "N/A")
- **Condition 2**: Must have verification items with checkmarks (is_verified = true)
- **Condition 3**: Buffer-only updates without LA don't trigger notifications

## Portal Mapping
The system maps licensed agents to their personal Slack channels:

```typescript
const licensePortalMapping = {
  "Lydia": "#lydia-personal-sales-portal",
  "Benjamin": "#benjamin-personal-sales-portal", 
  "Isaac": "#isaac-personal-sales-portal",
  "Claudia": "#tatumn-personal-sales-portal",
  "Noah": "#juan-personal-sales-portal",
  "Trinity": "#angy-personal-sales-portal"
};
```

## Message Format
The notification includes two main sections:

### Client Information (from verified items)
- customer_full_name
- Address (street, city, state, zip)
- Beneficiary Information
- Billing and mailing address status
- Date of Birth
- Birth State
- Age
- Phone Number
- Call phone/landline status
- Social Security

### Call Results
- Customer Name
- Status
- Reason
- Notes

## Implementation Details

### Edge Function: `personal-sales-portal-notification`
**Location**: `supabase/functions/personal-sales-portal-notification/index.ts`

**Input Parameters**:
```typescript
{
  callResultData: {
    submission_id: string;
    customer_full_name: string;
    status: string;
    status_reason: string;
    notes: string;
    licensed_agent_account: string;
  },
  verificationItems: VerificationItem[] // Only verified items
}
```

**Response**:
```typescript
{
  success: boolean;
  messageTs?: string;
  channel?: string;
  licensedAgent?: string;
  verifiedItemsCount?: number;
}
```

### Frontend Integration
**Location**: `src/components/CallResultForm.tsx`

The notification is triggered in the `handleSubmit` function after successful call result saving:

1. Checks if licensed agent exists and is not "N/A"
2. Fetches verification items where `is_verified = true`
3. Calls the edge function with call result data and verified items
4. Handles errors gracefully without failing the main process

### Data Flow
1. User saves call result in CallResultForm
2. Call result is processed and saved to database
3. System checks for licensed agent
4. If LA exists, fetch verified verification items
5. Send notification to personal sales portal
6. Display success message to user

## Error Handling
- Portal notification failures don't break the main call result save process
- All errors are logged for debugging
- Users see success message even if portal notification fails
- Missing portal channels are logged as errors

## Example Message Output
```
Notes Posted:

Client Information:
customer_full_name:BERTHA L LEE
Address: 1205 Sylvia Dr, Madison, TN 37115 Madison, TN 37115
Beneficiary Information: DAUGHTER: TONIA LEE HAYES 06-14-1961 , DAUGHTER : CHERYL WINSTON  09-01-1957
Billing and mailing address is the same: (Y/N)
Date of Birth: 1940-08-27
Birth State: TN
Age: 85
Number: (615) 860-5872
Call phone/landline:
Social: 410607570
---------------------------------------
Call Results:
Customer Name: Jose P Quiroga
Status: Needs callback
Reason: No specific reason provided
Notes: Client requested a callback
---------------------------------------------------------------------------------------------------
```

## Environment Requirements
- `SLACK_BOT_TOKEN` must be configured in Supabase environment
- Bot must have permissions to post to personal sales portal channels
- Personal sales portal channels must exist in Slack workspace

## Security Considerations
- Only verified (checked) verification items are included
- Personal information is only sent to assigned agent's portal
- Function validates licensed agent mapping before posting
- CORS headers properly configured for security