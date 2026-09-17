# FoodSave — Vercel & Supabase Deployment Guide

Your FoodSave project is now fully configured for **Supabase PostgreSQL** and **Vercel Serverless Deployment**!

---

## 1. Cloud Database (Supabase) — Already Configured & Seeded!

Your tables and initial seed data have already been deployed to your Supabase project:
- **Host**: `aws-0-ap-northeast-1.pooler.supabase.com` (Port 6543, Transaction pooler)
- **Database**: `postgres`
- **Tables created**: `donors`, `ngos`, `listings`
- **Seed NGOs**: All 8 NGOs for Bhopal, Indore, and Sehore are seeded and active.

---

## 2. Deploying to Vercel

You can deploy using either **Option A (Vercel Website + GitHub)** or **Option B (Vercel CLI in Terminal)**.

---

### Option A: Via Vercel Dashboard + GitHub (Recommended)

1. Push your `Foodsave` folder to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial FoodSave commit for Vercel & Supabase"
   git branch -M main
   git remote add origin <YOUR_GITHUB_REPO_URL>
   git push -u origin main
   ```
2. Go to **[vercel.com](https://vercel.com)** and log in.
3. Click **"Add New Project"** $\rightarrow$ select your GitHub repository.
4. In the **"Environment Variables"** section on Vercel, add:
   - `PGHOST`: `aws-0-ap-northeast-1.pooler.supabase.com`
   - `PGPORT`: `6543`
   - `PGDATABASE`: `postgres`
   - `PGUSER`: `postgres.yetorvhjkycpmrxsmykf`
   - `PGPASSWORD`: `Sattu@9739patel`
   - `DATABASE_URL`: `postgresql://postgres.yetorvhjkycpmrxsmykf:Sattu%409739patel@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`
5. Click **"Deploy"**!
   - In ~30 seconds, Vercel gives you your live URL (e.g. `https://foodsave.vercel.app`).

---

### Option B: Via Vercel CLI (Instant from Terminal)

1. Open your terminal in `c:\Users\satan\OneDrive\Desktop\Foodsave`:
   ```powershell
   npx vercel
   ```
2. Follow the prompt to log in and select your Vercel account.
3. Add the environment variables using Vercel CLI or on the Vercel dashboard.
4. Deploy to production:
   ```powershell
   npx vercel --prod
   ```

---

## 3. Running Locally with Supabase

If you want to run the project locally connected to Supabase:
```powershell
cd c:\Users\satan\OneDrive\Desktop\Foodsave
npm start
```
Or double-click `start-server.bat`!
Then open `http://localhost:3000`.


Created By - Satanand Patel (24BCE10738)
            Sehaj Jain (24BCE10977) 
            Vidhisha Deo (24BCE10196)
            Shreya Ramesh (24BCE10042)
