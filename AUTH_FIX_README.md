# Authentication Fix Guide

## Problems Fixed

1. ✅ Convex authentication error ("You don't have access to the selected project")
2. ✅ App loading without login (bypassing authentication)

## Quick Fix

### Option 1: Use the fix script (Recommended)

```bash
./fix-auth.sh
```

This will:
- Stop all running dev servers
- Clear Next.js cache
- Start the dev server without Convex dev

### Option 2: Manual steps

1. **Stop all processes:**
   ```bash
   pkill -f "next dev"
   pkill -f "convex dev"
   ```

2. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   ```

3. **Clear browser cookies:**
   - Open DevTools (F12)
   - Go to Application tab → Cookies
   - Delete all cookies for `localhost:3000`
   - Or use Incognito/Private mode

4. **Start dev server:**
   ```bash
   npm run dev
   ```

## Why This Happens

### Convex Authentication Error
- The `.env.local` file points to `dev:rosy-vulture-342` Convex project
- You don't have CLI access to this project
- **Solution**: Use `npm run dev` instead of `npm run dev:all`
- The app will connect to the remote Convex deployment (no local Convex dev needed)

### App Bypassing Login
- You have an old `auth_token` cookie in your browser
- The app reads this cookie and thinks you're logged in
- **Solution**: Clear browser cookies for localhost:3000

## Development Commands

```bash
# Start Next.js only (recommended for now)
npm run dev

# Start both Next.js and Convex dev (requires Convex CLI auth)
npm run dev:all

# Start with remote Convex (same as npm run dev)
npm run dev:remote
```

## Testing Login

1. Open http://localhost:3000
2. You should be redirected to `/login`
3. Use your credentials to login
4. You should be redirected to `/dashboard`

## If Login Still Doesn't Work

1. Check if the dev server is running on port 3000
2. Clear ALL browser data for localhost
3. Try in Incognito/Private mode
4. Check the browser console for errors
5. Check the terminal for server errors

## Convex Setup (Optional)

If you need to make changes to Convex functions, you'll need to:

1. Login to Convex CLI:
   ```bash
   npx convex login
   ```

2. Select or create a project:
   ```bash
   npx convex dev
   ```

3. Update `.env.local` with your project URL

For now, you can develop without running `convex dev` since the remote deployment is already configured.
