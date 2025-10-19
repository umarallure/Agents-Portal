# Center Lead Creation Feature

## Overview
Centers can now create leads directly from their Center Lead Portal. This feature allows lead vendors to add new leads when they can't find an existing lead in the system.

## Implementation Details

### Files Created/Modified

#### New Component: `CenterCreateLeadModal.tsx`
- **Location**: `/src/components/CenterCreateLeadModal.tsx`
- **Purpose**: Modal dialog for creating new leads with comprehensive form fields
- **Features**:
  - Organized into 5 tabs for better UX: Basic Info, Personal, Insurance, Health, Banking
  - All fields from the `leads` table are included
  - Automatic submission ID generation with "CBB" prefix
  - Automatic lead_vendor assignment from logged-in center user
  - Form validation for required fields

#### Modified: `CenterLeadPortal.tsx`
- **Location**: `/src/pages/CenterLeadPortal.tsx`
- **Changes**:
  - Added "Create Lead" button in the leads list header
  - Integrated `CenterCreateLeadModal` component
  - Added state management for modal open/close
  - Added callback function to refresh leads after creation

### Key Features

#### 1. Automatic Submission ID Generation
```typescript
const generateSubmissionId = () => {
  const randomNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
  return `CBB${randomNumber}`;
};
```
- Format: `CBB` + 10 random digits
- Example: `CBB1234567890`
- Unique for each lead creation

#### 2. Required Fields
Only three fields are required (marked with *):
- **Customer Full Name** - Must be provided
- **Phone Number** - Must be provided
- **Lead Vendor** - Automatically set from logged-in center (cannot be edited)

All other fields are optional.

#### 3. Pre-filled Defaults
- `lead_vendor`: Auto-filled from center's information
- `existing_coverage`: "NO"
- `previous_applications`: "NO"
- `tobacco_use`: "NO"
- `account_type`: "Checking"
- `is_callback`: false
- `submission_date`: Current timestamp

#### 4. Form Organization (Tabs)

**Tab 1: Basic Info**
- Customer Full Name *
- Phone Number *
- Email
- Date of Birth
- Age
- Social Security Number
- Street Address
- City, State, Zip Code

**Tab 2: Personal**
- Birth State
- Driver License
- Height
- Weight
- Beneficiary Information
- Additional Notes

**Tab 3: Insurance**
- Carrier
- Product Type
- Coverage Amount
- Monthly Premium
- Draft Date
- Future Draft Date
- Existing Coverage (YES/NO)
- Previous Applications (YES/NO)

**Tab 4: Health**
- Health Conditions
- Medications
- Doctor's Name
- Tobacco Use (YES/NO)

**Tab 5: Banking**
- Bank Name
- Account Type (Checking/Savings)
- Routing Number
- Account Number

### User Interface

#### Create Lead Button
- **Location**: Top-right of leads list, next to pagination
- **Color**: Green (bg-green-600)
- **Icon**: Plus icon
- **Text**: "Create Lead"

#### Modal Dialog
- **Size**: Large (max-w-4xl)
- **Max Height**: 90vh with scrollable content
- **Layout**: Tabbed interface for organized data entry
- **Footer**: Cancel and Create Lead buttons

### Data Flow

1. **User clicks "Create Lead"** button
2. **Modal opens** with empty form (except defaults)
3. **User fills in** required fields (name, phone) and optional fields
4. **User clicks "Create Lead"** button
5. **System validates** required fields
6. **System generates** unique CBB submission ID
7. **System inserts** lead into `leads` table with:
   - Generated submission ID
   - Auto-filled lead_vendor from center
   - Current timestamp
   - All form data
8. **Success toast** shows with new submission ID
9. **Leads list refreshes** automatically
10. **Modal closes** and form resets

### Security Features

1. **Lead Vendor Lock**
   - Cannot be edited by user
   - Automatically set from authenticated center user
   - Ensures centers can only create leads for themselves

2. **RLS Policy Compliance**
   - All leads created follow existing Row Level Security policies
   - Centers can only view/edit their own leads

3. **Data Validation**
   - Required fields enforced client-side
   - Type validation for numbers and dates
   - Database constraints enforced server-side

### Example Usage

1. **Center User Login**: Lead vendor "Test" logs into portal
2. **Browse Leads**: User searches but can't find a specific lead
3. **Create New Lead**:
   - Clicks "Create Lead" button
   - Fills in customer name: "Jane Test Doe"
   - Fills in phone: "(555) 444-4444"
   - Optionally fills other fields
   - Clicks "Create Lead"
4. **Lead Created**: 
   - Submission ID: `CBB4567890123`
   - Lead Vendor: "Test" (auto-filled)
   - Appears in leads list immediately

### Database Schema

All fields from the `leads` table are supported:

```sql
CREATE TABLE leads (
  id uuid PRIMARY KEY,
  submission_id text,
  submission_date timestamptz,
  customer_full_name text,
  phone_number text,
  street_address text,
  city text,
  state text,
  zip_code text,
  email text,
  date_of_birth date,
  age integer,
  social_security text,
  health_conditions text,
  carrier text,
  product_type text,
  coverage_amount numeric,
  monthly_premium numeric,
  draft_date text,
  future_draft_date text,
  beneficiary_routing text,
  beneficiary_account text,
  additional_notes text,
  lead_vendor text,
  -- ... more fields
  created_at timestamptz,
  updated_at timestamptz
);
```

### Benefits

1. **Reduced Support Tickets**: Centers can create missing leads themselves
2. **Faster Workflow**: No need to contact admin to add leads
3. **Data Accuracy**: Centers input their own data directly
4. **Audit Trail**: All created leads tracked with timestamps
5. **Self-Service**: Empowers centers to manage their leads

### Future Enhancements (Optional)

- [ ] Bulk lead upload via CSV
- [ ] Lead templates for quick entry
- [ ] Duplicate detection before creation
- [ ] Email notification on lead creation
- [ ] Lead validation against external sources

## Testing

### Test the Feature

1. **Login as center user** at `/center-auth`
2. **Navigate to Center Portal** at `/center-lead-portal`
3. **Click "Create Lead"** button
4. **Fill required fields**:
   - Customer name
   - Phone number
5. **Optional**: Fill other fields
6. **Click "Create Lead"**
7. **Verify**:
   - Success toast appears
   - Lead shows in list
   - Submission ID starts with "CBB"
   - Lead vendor matches your center

### Test Data Available

Three test leads already exist with lead_vendor = "Test":
- TEST001: John Test Smith
- TEST002: Mary Test Johnson
- TEST003: Robert Test Williams

## Notes

- Submission IDs are generated client-side (not ideal for production - consider moving to database trigger or function)
- All fields except name, phone, and vendor are optional
- Modal resets after successful creation
- Lead vendor is read-only and automatically assigned
- No duplicate checking is performed (future enhancement)

## Support

For issues or questions:
1. Check browser console for errors
2. Verify RLS policies allow inserts for center users
3. Ensure center user is properly authenticated
4. Check that lead_vendor in centers table matches expected value
