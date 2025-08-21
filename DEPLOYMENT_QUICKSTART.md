# Quick Deployment Guide - Well Rig Visualizer

## Option 1: Deploy to Vercel with Local Storage (FREE - Recommended)

This is the fastest option that works immediately without any database setup.

### Steps:

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Click "Deploy"
   - Done! Your app is live in under 2 minutes

### Features in Local Mode:
- ✅ Full offline functionality
- ✅ All data stored in browser (IndexedDB)
- ✅ Zero cost
- ✅ No configuration needed
- ❌ No multi-user support
- ❌ No cloud sync between devices

---

## Option 2: Deploy with Vercel Postgres ($10-15/month)

For multi-user support and cloud sync.

### Steps:

1. **Deploy to Vercel** (same as Option 1)

2. **Add Vercel Postgres**
   - In Vercel Dashboard, go to your project
   - Click "Storage" tab
   - Click "Create Database" → "Postgres"
   - Follow the setup wizard

3. **Set Environment Variable**
   - In Vercel Dashboard → Settings → Environment Variables
   - Add: `VITE_DATABASE_MODE` = `vercel`
   - Redeploy

4. **Initialize Database**
   ```sql
   -- Run these in Vercel Postgres query console
   CREATE TABLE equipment (...);
   CREATE TABLE jobs (...);
   -- etc (see schema in original Supabase)
   ```

---

## Option 3: Use Neon Database (FREE with 3GB)

Best free option for cloud database.

### Steps:

1. **Create Neon Account**
   - Go to [neon.tech](https://neon.tech)
   - Create free account
   - Create new project

2. **Get Connection String**
   - Copy your connection string from Neon dashboard

3. **Deploy to Vercel**
   - Set environment variable:
     - `DATABASE_URL` = your Neon connection string
     - `VITE_DATABASE_MODE` = `neon`

4. **Initialize Database**
   - Use Neon's SQL editor to create tables

---

## Quick Local Test

To test locally before deploying:

```bash
# Set to local mode (no database needed)
echo "VITE_DATABASE_MODE=local" > .env

# Start the app
npm run dev
```

---

## Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel account created
- [ ] Project imported to Vercel
- [ ] Environment variables set (if using cloud DB)
- [ ] Database initialized (if using cloud DB)
- [ ] Test deployment URL

---

## Troubleshooting

**App not loading?**
- Check browser console for errors
- Ensure all dependencies are installed

**Data not saving?**
- In local mode: Check if browser allows IndexedDB
- In cloud mode: Verify database connection

**Auth not working?**
- Local mode uses simple auth (any email/password works)
- For production, implement proper authentication

---

## Next Steps

1. **For Production:**
   - Implement proper authentication
   - Add backup/export functionality
   - Set up monitoring

2. **For Development:**
   - The app auto-detects database mode
   - Switch between modes with `VITE_DATABASE_MODE`
   - Local mode great for development/testing