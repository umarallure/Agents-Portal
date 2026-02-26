# Monday.com Board Migration Summary

## Migration Details
**Date**: 2025-01-31  
**Old Board**: 8595002703  
**New Board**: 18027763264 (Deal Tracker New)

## Changes Made

### 1. Discovery Function
**Created**: `discover-monday-columns` edge function
- **Purpose**: Fetch all columns and structure from Monday.com boards
- **Deployment Status**: ✅ Deployed (v1)
- **Usage**: Call without parameters to get full board schema

### 2. Phone Search Function
**Updated**: `get-monday-policy-info` edge function
- **Version**: v3
- **Board ID**: Changed from 8595002703 → 18027763264
- **Column Changes**: Updated from 17 columns to 22 columns
- **Phone Column**: `text_mkq268v3` (unchanged)

### 3. Name Search Function
**Updated**: `get-monday-policy-by-name` edge function
- **Version**: v2
- **Board ID**: Changed from 8595002703 → 18027763264
- **Column Changes**: Updated from 17 columns to 22 columns

### 4. Frontend Component
**Updated**: `PolicyLookupSection.tsx`
- **MONDAY_COLUMN_MAP**: Updated with 21 new column mappings

## New Board Structure (18027763264)

### Total Columns: 23

| Column ID | Title | Type | Description |
|-----------|-------|------|-------------|
| `name` | Name | name | Customer name (Monday.com standard) |
| `subitems` | Tasks | subtasks | Subtasks/tasks for the deal |
| `text_mkw44vx` | GHL Name | text | GoHighLevel contact name |
| `text_mkwjexhw` | GHL Stage | text | GoHighLevel pipeline stage |
| `status` | Policy Status | status | Overall policy status (Issued Paid, Chargeback, etc.) |
| `date1` | Deal creation date | date | When the deal was created |
| `text_mkpx3j6w` | Policy Number | text | Insurance policy number |
| `color_mknkq2qd` | Carrier | status | Insurance carrier (Liberty, SBLI, MOH, etc.) |
| `numbers` | Deal Value | numbers | Dollar value of the deal |
| `numeric_mkw47t5d` | CC Value | numbers | Credit card/chargeback value |
| `text_mknk5m2r` | Notes | text | General notes about the deal |
| `color_mkp5sj20` | Status | status | Payment status (Paid, Not Yet Paid, etc.) |
| `pulse_updated_mknkqf59` | Last updated | last_updated | Last modification timestamp |
| `color_mkq0rkaw` | Sales Agent | status | Agent who sold the policy |
| `text_mkwwrq3b` | Writing # | text | Agent writing number |
| `text_mkq196kp` | Commission Type | text | Type of commission structure |
| `date_mkq1d86z` | Effective Date | date | Policy effective date |
| `dropdown_mkq2x0kx` | Call Center | dropdown | Lead vendor/call center (84 options) |
| `text_mkq268v3` | Phone Number | text | **SEARCH COLUMN** - Customer phone |
| `date_mkw9tyc9` | CC PMT WS | date | Credit card payment worksheet date |
| `date_mkw94jj0` | CC CB WS | date | Credit card chargeback worksheet date |
| `text_mkw9mq04` | Carrier Status | text | Status from carrier system |
| `text_mkxdrsg2` | Policy Type | text | Type of policy (Non GI, etc.) |

## Key Differences from Old Board

### Added Columns (New to Deal Tracker New)
- `text_mkw44vx` - GHL Name
- `text_mkwjexhw` - GHL Stage
- `numeric_mkw47t5d` - CC Value
- `text_mkwwrq3b` - Writing #
- `date_mkw9tyc9` - CC PMT WS
- `date_mkw94jj0` - CC CB WS
- `text_mkw9mq04` - Carrier Status
- `text_mkxdrsg2` - Policy Type

### Removed Columns (From Old Board)
- `link_to_contacts_` - Contact links
- `person` - Person field
- `long_text_mksd6zg1` - Deal Summary

### Renamed/Changed
- `status` - Changed from "Stage" → "Policy Status"
- `text_mkq196kp` - Changed from "Policy Type" → "Commission Type"

## Search Functionality

### Phone Search
- **Column**: `text_mkq268v3` (Phone Number)
- **Format**: Normalized as `1 + 10 digits` (e.g., "12093274381")
- **Query Type**: `items_page_by_column_values` (direct search)

### Name Search
- **Column**: `name` (standard Monday.com name field)
- **Format**: "LAST, FIRST" or "First Last" with fuzzy matching
- **Query Type**: `items_page` (fetch all, filter client-side)

## Testing

### Test Phone Number
- **Sample**: 12093274381
- **Customer**: RICHARD HEAD
- **Policy**: FEX435127 (Transamerica)
- **Status**: Pending / Not Yet Paid

### Test Query
```bash
Invoke-RestMethod -Uri "https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/get-monday-policy-info" `
  -Method POST `
  -Headers @{"Authorization"="Bearer YOUR_ANON_KEY";"Content-Type"="application/json"} `
  -Body '{"phone":"2093274381"}'
```

## Call Centers Available (84 Options)
Reliant, HYF-TEL, Libra, Maverick Communications, TechVated, Vize, ArkTech, ECH09X, VYN, GrowthOnics, Cyberleads, Corebiz, Ambition, Wolf Innovations, Digicon, Plexi, Progressive, Everline Solution, TM Global, Optimum, Crafting Leads, Cerberus, Quotes, Zupax Marketing, Avenue Consultancy, Trust Link, Rock, Crown Connect, NanoTech, Poshenee Tech, CoreBiz, Techvated, Vyn, Leads, Pro Solutions, Helix, AJ, Exito, Networkize, Pro Solution, Emperor, Netowrkize, Argon Comm, Pro Soliutions, Ãxito, CrossNotch, Peggy S Daniels, Cyber Leads, Stratix, TechPlanet, StratiX, Win, TechPlaneet, DownTown, SellerZ, Sellerz

## Deployment Status

✅ **All components updated and deployed**
- `discover-monday-columns` (v1)
- `get-monday-policy-info` (v3)
- `get-monday-policy-by-name` (v2)
- `PolicyLookupSection.tsx` (local update)

## Next Steps

1. Test phone search with real data
2. Test name search functionality
3. Verify UI displays new columns correctly (GHL Name, GHL Stage, CC Value, etc.)
4. Monitor edge function logs for any errors
5. Update any other components that reference Monday.com column IDs
