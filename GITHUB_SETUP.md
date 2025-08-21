# GitHub Data Repository Setup

Your GitHub storage is now configured! Here's how to complete the setup:

## Quick Setup for shearfrac-data repository

1. Go to: https://github.com/aandrewmolt/shearfrac-data

2. Click the "Create new file" button

3. In the filename field, type: `data/contacts.json`

4. Paste this initial content:
```json
{
  "version": "1.0.0",
  "lastModified": "2024-01-01T00:00:00.000Z",
  "contacts": [],
  "customTypes": ["Coldbore"],
  "columnSettings": {}
}
```

5. Commit message: "Initial contacts database"

6. Click "Commit new file"

## That's it! 🎉

Your contacts system will now:
- Store all data in GitHub (not localStorage)
- Create a commit for every change
- Provide full audit trail for compliance
- Work offline (caches locally)
- Sync when back online

## Testing

1. Start your dev server: `npm run dev`
2. Go to the Contacts page
3. Add a new contact
4. Check your GitHub repo - you'll see the JSON file updated!

## For Production (Vercel)

Add these same environment variables to your Vercel project:
1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Add all the VITE_GITHUB_* variables from your .env file
3. Redeploy

## Troubleshooting

If you see "GitHub storage not configured" in the console:
- Make sure all VITE_GITHUB_* variables are set in .env
- Restart your dev server after changing .env