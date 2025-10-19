# Google Sheets Column Mapping for New Callback Feature

## Your Sheet Structure
Based on your provided headers, here's how the data will be mapped:

| Column | Header | New Callback Value | Description |
|--------|--------|-------------------|-------------|
| A | Found in Carrier? | *(empty)* | Left blank for new callbacks |
| B | Updated in GHL? | `FALSE` | Set to FALSE for new callbacks |
| C | Client Phone Number | `phone_number` | Customer's phone number |
| D | Lead Vender | `lead_vendor` | Selected vendor from dropdown |
| E | Date | `M/d/yy format` | Current date in M/d/yy format (e.g., 7/15/25) |
| F | INSURED NAME | `customer_full_name` | Customer's full name |
| G | Buffer Agent | *(empty)* | Left blank, filled later in call result |
| H | Agent | *(empty)* | Left blank, filled later in call result |
| I | Licensed agent account | *(empty)* | Left blank, filled later in call result |
| J | Status | `New Callback` | Fixed status for identification |
| K | Call Result | *(empty)* | Filled after call result form |
| L | Carrier | *(empty)* | Filled after call result form |
| M | Product Type | *(empty)* | Filled after call result form |
| N | Draft Date | *(empty)* | Filled after call result form |
| O | MP | *(empty)* | Monthly Premium, filled after call result |
| P | Face amount | *(empty)* | Filled after call result form |
| Q | From Callback? | `TRUE` | Always TRUE for callback entries |
| R | Notes | *Combined data* | See details below |
| S | Policy Number | *(empty)* | Filled later if needed |
| T | Carrier Audit | *(empty)* | Filled later if needed |
| U | ProductTypeCarrier | *(empty)* | Filled later if needed |
| V | Level Or GI | *(empty)* | Filled later if needed |
| W | LeadCode | *(empty)* | Filled later if needed |
| X | SubmissionId | `CB{timestamp}{random}` | Unique identifier |

## Notes Column Details (Column R)
The Notes column combines all additional information from the callback form, separated by ` | `:

- Additional Notes (if provided)
- Email: {email} (if provided)
- Address: {street_address} (if provided)
- {city}, {state} (if provided)
- ZIP: {zip_code} (if provided)
- DOB: {date_of_birth} (if provided)
- Age: {age} (if provided)
- SSN: {social_security} (if provided)
- Health: {health_conditions} (if provided)

**Example Notes:**
```
Follow up needed | Email: john@example.com | Address: 123 Main St | Chicago, IL | ZIP: 60601 | DOB: 1980-01-15 | Age: 43 | Health: No major conditions
```

## Example Row Data
For a new callback entry, you would see:
```
| | FALSE | (555) 123-4567 | Everline solution | 7/15/25 | John Doe | | | | New Callback | | | | | | | TRUE | Follow up in 3 days \| Email: john@example.com | | | | | | CB17213567891234567 |
```

## Integration Points
1. **Database**: Data is first saved to the `leads` table
2. **Google Sheets**: New row is inserted at the top (after header)
3. **Call Result Form**: Updates the same row when call is processed
4. **Identification**: Use `From Callback? = TRUE` and `Status = New Callback` to identify callback entries

## Function Behavior
- Inserts new row at position 2 (top of data, after header)
- Preserves existing data by shifting it down
- Uses exact column mapping as specified
- Handles missing data gracefully (empty strings)
- Combines all optional information in Notes column
