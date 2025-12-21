# 🚀 Deployment Guide

Simple step-by-step guide to deploy NOTION CRM on Vercel.

## Prerequisites

- GitHub account
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Clerk account (sign up at [clerk.com](https://clerk.com))
- Convex account (sign up at [convex.dev](https://convex.dev))

---

## Step 1: Setup Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Go to **API Keys** → Copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_...`)
   - `CLERK_SECRET_KEY` (starts with `sk_live_...`)
4. Go to **User & Authentication** → **Email, Phone, Username**
   - **Disable** Email and Phone
   - **Enable** Username only
   - **Disable** all social logins

---

## Step 2: Setup Convex

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Create a new project
3. Copy your **Convex URL** (looks like `https://xxx.convex.cloud`)
4. Copy your **Deployment Name** (looks like `prod:xxx`)

---

## Step 3: Setup Cloudflare R2 (for images)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **R2** → Create bucket
3. Create API token with read/write permissions
4. Copy:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
5. Get your **Public URL** (e.g., `https://xxx.r2.dev`)

---

## Step 4: Deploy to Vercel

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **Add New Project**
4. Import your GitHub repository
5. Click **Deploy** (we'll add environment variables next)

---

## Step 5: Add Environment Variables in Vercel

Go to your project in Vercel → **Settings** → **Environment Variables**

Add these variables (copy from your `.env.local`):

### Clerk
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

### Convex
```
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
CONVEX_DEPLOYMENT=prod:xxx
```

### Cloudflare R2
```
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://xxx.r2.dev
```

**Important:** Select **Production**, **Preview**, and **Development** for all variables.

---

## Step 6: Deploy Convex Functions

1. In your local project, run:
   ```bash
   npx convex deploy --prod
   ```
2. This will deploy your Convex functions to production

---

## Step 7: Create First Manager User

1. Go to **Clerk Dashboard** → **Users** → **Create User**
2. Set username and password
3. Go to **Metadata** → **Public Metadata** → Add:
   ```json
   {
     "role": "manager"
   }
   ```
4. Go to **Convex Dashboard** → **Data** → **users** table
5. Click **Add Document** → Paste:
   ```json
   {
     "clerkUserId": "user_xxx",
     "username": "manager",
     "fullName": "System Manager",
     "phoneNumber": "+1234567890",
     "address": "Admin Office",
     "role": "manager",
     "isActive": true,
     "assignedSites": [],
     "createdAt": 1234567890000,
     "updatedAt": 1234567890000
   }
   ```
   (Replace `user_xxx` with actual Clerk User ID, update timestamp)

---

## Step 8: Redeploy on Vercel

After adding environment variables:

1. Go to **Vercel Dashboard** → Your project
2. Click **Deployments** → Click **⋯** on latest deployment
3. Click **Redeploy**

Or push a new commit to trigger automatic deployment.

---

## ✅ Verify Deployment

1. Visit your Vercel URL (e.g., `https://your-project.vercel.app`)
2. You should be redirected to `/login`
3. Login with your manager credentials
4. You should see the dashboard

---

## 🔧 Troubleshooting

### "Unauthorized" error
- Check user has `role: "manager"` in Clerk public metadata
- Verify user exists in both Clerk and Convex

### Images not uploading
- Check R2 environment variables in Vercel
- Verify R2 bucket permissions

### Convex errors
- Verify `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` are correct
- Make sure you ran `npx convex deploy --prod`

### Build fails
- Check all environment variables are set in Vercel
- Verify all variables are enabled for Production, Preview, and Development

---

## 📝 Quick Reference

**Your `.env.local` should have:**
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Convex
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
CONVEX_DEPLOYMENT=prod:xxx

# R2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=xxx
R2_PUBLIC_URL=https://xxx.r2.dev
```

**Copy these exact values to Vercel Environment Variables!**

---

**That's it! Your app is now live! 🎉**

