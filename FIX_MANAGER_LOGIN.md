# 🔧 Fix Manager Login - Step by Step

## Problem: "Invalid password" error

This means the user exists in Clerk but the password doesn't match.

---

## ✅ Solution: Reset Password in Clerk

### Step 1: Go to Clerk Dashboard

1. Open [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **Users** tab

### Step 2: Find the Manager User

1. Search for username: `manager`
2. Click on the user to open details

### Step 3: Reset Password

1. In the user details page, scroll to **Password** section
2. Click **Reset Password** or **Set Password**
3. Enter new password: `Manager@2024!`
4. Click **Save** or **Update**

**OR** use the **Actions** menu:
1. Click **Actions** (three dots menu)
2. Select **Reset Password**
3. Set password to: `Manager@2024!`
4. Save

### Step 4: Verify Public Metadata

1. In the same user page, go to **Metadata** tab
2. Check **Public Metadata**
3. Make sure it has:
   ```json
   {
     "role": "manager"
   }
   ```
4. If missing, add it and save

### Step 5: Verify Convex User

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project: **fine-setter-221**
3. Go to **Data** → **users** table
4. Find the user with username: `manager`
5. Verify:
   - `clerkUserId` matches the Clerk User ID (starts with `user_...`)
   - `username` is `manager`
   - `role` is `manager`
   - `isActive` is `true`

### Step 6: Test Login

1. Go to your app login page
2. Enter:
   - Username: `manager`
   - Password: `Manager@2024!`
3. Click **Login**

---

## 🔍 Troubleshooting

### Still getting "Invalid password"?

1. **Check Clerk User ID matches:**
   - Clerk Dashboard → User → Copy User ID
   - Convex Dashboard → users table → Check `clerkUserId` field
   - They must match exactly!

2. **Try resetting password again:**
   - In Clerk, use "Send password reset email" (if email is set)
   - Or manually set password again

3. **Check password requirements:**
   - Clerk might have password requirements
   - The password `Manager@2024!` should meet all requirements

4. **Verify authentication method:**
   - Clerk Dashboard → **User & Authentication**
   - Make sure **Username** is enabled
   - Make sure **Password** is enabled

### User not found in Convex?

1. Copy the Clerk User ID from Clerk Dashboard
2. Go to Convex Dashboard → users table
3. Click **Add Document**
4. Paste this JSON (replace `user_YOUR_ID` with actual Clerk ID):

```json
{
  "clerkUserId": "user_YOUR_ID",
  "username": "manager",
  "fullName": "Manager",
  "phoneNumber": "+1234567890",
  "address": "Admin Office",
  "role": "manager",
  "assignedSites": [],
  "isActive": true,
  "createdBy": null,
  "createdAt": 1734739200000,
  "updatedAt": 1734739200000
}
```

Replace `1734739200000` with current timestamp (run `Date.now()` in browser console).

---

## ✅ Quick Checklist

- [ ] User exists in Clerk with username `manager`
- [ ] Password is set to `manager` in Clerk
- [ ] Public metadata has `{"role": "manager"}`
- [ ] User exists in Convex with matching `clerkUserId`
- [ ] Convex user has `role: "manager"` and `isActive: true`
- [ ] `.env.local` has correct Convex URL: `https://fine-setter-221.convex.cloud`

---

**After completing these steps, login should work!** 🎉

