# 👤 Manager Login Credentials

## Login Information

**Username:** `manager`  
**Password:** `Manager@2024!`

---

## ✅ Current Setup Status

Based on your Convex data, your manager user is configured as:

```json
{
  "clerkUserId": "user_36ruQkdJuXPuqVQN0hvWqvvvHlP",
  "username": "manager",
  "fullName": "manager",
  "role": "manager",
  "isActive": true
}
```

---

## 🔧 To Make Login Work

### Step 1: Set Password in Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Find user with Clerk ID: `user_36ruQkdJuXPuqVQN0hvWqvvvHlP`
   - Or search for username: `manager`
3. Open the user → Go to **Password** section
4. Set password to: `Manager@2024!`
5. Save

### Step 2: Verify Public Metadata

1. In Clerk user page → **Metadata** tab
2. Check **Public Metadata** has:
   ```json
   {
     "role": "manager"
   }
   ```
3. If missing, add it and save

### Step 3: Verify Convex User

Your Convex user looks correct:
- ✅ `clerkUserId` matches: `user_36ruQkdJuXPuqVQN0hvWqvvvHlP`
- ✅ `username`: `manager`
- ✅ `role`: `manager`
- ✅ `isActive`: `true`

### Step 4: Login

1. Go to your app login page
2. Enter:
   - **Username:** `manager`
   - **Password:** `Manager@2024!`
3. Click **Login**

---

## 📝 Notes

- The password is stored in **Clerk**, not Convex
- Convex only stores user metadata (name, role, etc.)
- Make sure the `clerkUserId` in Convex matches the Clerk User ID exactly
- Your Convex URL should be: `https://fine-setter-221.convex.cloud`

---

## 🔒 Security

**Important:** Change this password after first login for security!

1. Login with `Manager@2024!`
2. Go to **Profile** → **Change Password**
3. Set a new secure password

---

**After setting the password in Clerk, login should work!** ✅

