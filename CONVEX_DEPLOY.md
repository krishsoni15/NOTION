# Convex Deploy Guide

Quick reference for logging in, running dev, and deploying Convex functions.

---

## 1. Login to Convex

```bash
npx convex login
```

This opens a browser window. Sign in with your Convex account.  
Your team: **krish1506soni**

---

## 2. Run Convex Dev (local / watch mode)

Syncs functions to the **dev** deployment in real-time as you edit.

```bash
npx convex dev
```

> This watches `convex/` for changes and pushes them automatically.  
> Keep this running alongside `npm run dev` during development.

To run both together in two terminals:

**Terminal 1:**
```bash
npx convex dev
```

**Terminal 2:**
```bash
npm run dev
```

---

## 3. Deploy to Production

### Step 1 — Switch `.env.local` to production

In `.env.local`, comment out the dev lines and uncomment the production lines:

```env
# DEV (comment this out)
# CONVEX_DEPLOYMENT=dev:rosy-peacock-841
# NEXT_PUBLIC_CONVEX_URL=https://rosy-peacock-841.convex.cloud

# PRODUCTION (uncomment this)
CONVEX_DEPLOYMENT=production:insightful-monitor-731
NEXT_PUBLIC_CONVEX_URL=https://insightful-monitor-731.convex.cloud
CONVEX_SITE_URL=https://insightful-monitor-731.convex.site
```

### Step 2 — Deploy Convex functions to production

```bash
npx convex deploy --prod
```

This pushes all functions in `convex/` to the production deployment.

### Step 3 — Build and deploy the Next.js app (Vercel)

```bash
npm run build
```

Then push to your git branch — Vercel auto-deploys on push.

---

## 4. Deploy only Convex (without switching env)

If you want to push Convex functions to a specific deployment directly:

```bash
# Push to dev
npx convex deploy

# Push to production explicitly
npx convex deploy --prod
```

---

## 5. Check deployment status

```bash
npx convex dashboard
```

Opens the Convex dashboard in your browser for the current deployment.

---

## Current Deployments

| Environment | Deployment Name            | URL                                          |
|-------------|----------------------------|----------------------------------------------|
| Dev         | `dev:rosy-peacock-841`     | https://rosy-peacock-841.convex.cloud        |
| Production  | `production:insightful-monitor-731` | https://insightful-monitor-731.convex.cloud |

---

## Why the error happened

The error `[CONVEX Q(requests:getUserAssignedProjects)] Server Error` means the **production Convex backend** has outdated functions — the `getUserAssignedProjects` query (or the schema changes like `assignedProjects`, `projects` table) haven't been deployed yet.

**Fix:** Run `npx convex deploy --prod` to push the latest functions and schema to production.
