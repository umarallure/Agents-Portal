# Discover Monday.com Board Columns

Use this GraphQL query to discover all columns in your Monday.com board:

## Query to Get All Columns

```graphql
query {
  boards(ids: YOUR_BOARD_ID_HERE) {
    id
    name
    columns {
      id
      title
      type
      settings_str
    }
  }
}
```

## How to Use:

1. Replace `YOUR_BOARD_ID_HERE` with your actual board ID
2. Go to https://monday.com/developers/v2/try-it-yourself
3. Paste the query and run it
4. Copy the column IDs you want to use

## Example Response:

```json
{
  "data": {
    "boards": [
      {
        "id": "8595002703",
        "name": "Your Board Name",
        "columns": [
          {
            "id": "name",
            "title": "Name",
            "type": "name"
          },
          {
            "id": "text_mkq268v3",
            "title": "Phone Number",
            "type": "text"
          },
          {
            "id": "status",
            "title": "Status",
            "type": "color"
          }
          // ... more columns
        ]
      }
    ]
  }
}
```

## Next Steps:

Once you have the column IDs, we can:
1. Update the board_id in both edge functions
2. Update the column_values IDs to fetch
3. Update the MONDAY_COLUMN_MAP in the frontend
4. Determine which column to use for phone number search
5. Determine which column to use for name search (likely the item "name" field)
