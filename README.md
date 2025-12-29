# NOTION CRM

Enterprise-grade CRM system with material request management, cost comparison, and purchase workflow.

## 🎯 Features

### Authentication & User Management
- **Username + Password Authentication** (NO social login, NO email login)
- **Role-Based Access Control** (Site Engineer, Manager, Purchase Officer)
- **User Management** (Manager-only user creation and management)
- **Site Assignment** (Managers can assign sites to users)

### Material Request System
- **Create Material Requests** (Site Engineers can create requests with site location, items, quantity, photos)
- **Request Approval Workflow** (Managers approve/reject requests)
- **Direct PO Option** (Managers can bypass cost comparison for urgent requests)
- **Request Tracking** (View all requests with status badges and filters)

### Cost Comparison & Purchase Workflow
- **Cost Comparison** (Purchase Officers create vendor quotes for manager review)
- **Manager Review** (Managers approve/reject cost comparisons and select vendors)
- **Purchase Orders** (Create POs after cost comparison approval)
- **Delivery Challans** (Track deliveries with vehicle and driver information)
- **Inventory Integration** (Automatic stock updates on delivery)

### Additional Features
- **Real-time Chat** (One-on-one messaging with online status and read receipts)
- **Sticky Notes** (Create, assign, and manage notes with reminders)
- **Inventory Management** (Track items with photos, stock levels, and units)
- **Vendor Management** (Manage vendor information and details)
- **Professional UI** (shadcn/ui components, light/dark mode)
- **Fully Responsive** (Mobile-first design)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env.local` file:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Convex Database
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
CONVEX_DEPLOYMENT=dev:your-deployment

# Cloudinary (for image uploads - recommended)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Cloudflare R2 (alternative for image uploads)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

### 3. Configure Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Disable all authentication methods except **Username + Password**
3. Copy API keys to `.env.local`

### 4. Configure Convex

```bash
# Login to Convex
npx convex login

# Start Convex dev server
npx convex dev
```

The Convex URL will be displayed. Add it to `.env.local`.

### 5. Create First Manager

**IMPORTANT**: You must create the first manager manually.

1. Create user in Clerk Dashboard with username and password
2. Add `role: "manager"` to Clerk public metadata
3. Create matching user in Convex with same `clerkUserId`:

```javascript
// In Convex dashboard or via mutation
{
  clerkUserId: "user_xxx",
  fullName: "Manager Name",
  username: "manager",
  role: "manager",
  isActive: true
}
```

### 6. Run Development Server

```bash
# Run both Next.js and Convex
npm run dev:all

# Or separately:
npm run dev          # Next.js (port 3000)
npm run dev:convex   # Convex dev server
```

### 7. Access Application

Open http://localhost:3000 → Login with your manager credentials → Start managing!

## 👥 User Roles

### Site Engineer
- Create material requests
- View own requests
- Mark deliveries
- **Routes**: `/dashboard/site`, `/dashboard/site/requests`

### Manager (Admin)
- View all requests
- Approve/reject requests
- Review cost comparisons
- Create and manage users
- Assign sites to users
- **Routes**: `/dashboard/manager`, `/dashboard/manager/requests`, `/dashboard/manager/users`, `/dashboard/manager/cost-comparisons`

### Purchase Officer
- View approved requests
- Create cost comparisons
- Create purchase orders
- Create delivery challans
- Manage vendors
- **Routes**: `/dashboard/purchase`, `/dashboard/purchase/requests`, `/dashboard/purchase/vendors`

## 📋 Material Request Workflow

1. **Site Engineer** creates a material request
2. **Manager** reviews and:
   - Approves → Goes to "Ready for CC" (Cost Comparison)
   - Direct PO → Goes directly to "Ready for PO" (bypasses CC)
   - Rejects → Request is rejected with reason
3. **Purchase Officer** creates cost comparison with vendor quotes
4. **Manager** reviews cost comparison and selects vendor
5. **Purchase Officer** creates Purchase Order
6. **Purchase Officer** creates Delivery Challan
7. **Site Engineer** marks request as delivered (updates inventory)

## 🏗️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Theme**: next-themes (light/dark mode with smooth transitions)
- **Auth**: Clerk (username + password ONLY)
- **Database**: Convex (real-time database)
- **Storage**: Cloudinary (for images)
- **State**: Convex React Queries

## 📁 Project Structure

```
/app
  /(auth)/login         # Login page
  /dashboard
    /site               # Site Engineer routes
    /manager            # Manager routes
    /purchase           # Purchase Officer routes
  /api                  # API routes (upload, delete, admin)
/components
  /ui                   # shadcn/ui components
  /layout               # Sidebar, Header
  /auth                 # Login form, user sync
  /requests             # Material request components
  /purchase             # Purchase workflow components
  /inventory             # Inventory management
  /chat                  # Real-time chat
  /sticky-notes          # Notes and reminders
  /user-management       # User CRUD components
/convex
  schema.ts              # Database schema
  requests.ts            # Material request functions
  costComparisons.ts     # Cost comparison functions
  users.ts               # User CRUD functions
  inventory.ts           # Inventory functions
  vendors.ts             # Vendor functions
/lib
  /auth                  # Role helpers, permissions, redirects
  /r2                    # Cloudflare R2 client
```

## 🔒 Security

- ✅ Username + password authentication ONLY
- ✅ NO public signup (manager creates all users)
- ✅ Server-side role validation on every request
- ✅ Middleware protects all dashboard routes
- ✅ Convex functions check permissions
- ✅ Session management by Clerk

## 🧪 Testing

Quick test workflow:
1. Login as manager
2. Create a site engineer user
3. Create a site and assign it to the site engineer
4. Logout and login as site engineer
5. Create a material request
6. Logout and login as manager
7. Approve the request
8. Logout and login as purchase officer
9. Create cost comparison
10. Logout and login as manager
11. Review and approve cost comparison
12. Continue workflow...

## 🚢 Deployment

### Deploy Convex

```bash
npx convex deploy
```

Update `.env.local` with production Convex URL.

### Deploy Next.js

Deploy to Vercel, Netlify, or your preferred host.

### Environment Variables (Production)

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=prod:your-deployment
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start Next.js dev server
npm run dev:convex   # Start Convex dev server
npm run dev:all      # Start both servers
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Adding New Features

1. Define types in `/types/index.ts`
2. Create Convex schema in `/convex/schema.ts`
3. Add Convex functions in `/convex/*.ts`
4. Create UI components in `/components`
5. Add pages in `/app/dashboard`
6. Update permissions in `/lib/auth/permissions.ts`

## 📚 Documentation

- **[Chat Documentation](./docs/CHAT.md)** - Real-time chat system
- **[Notifications](./docs/NOTIFICATIONS.md)** - Notification system
- **[Theme System](./docs/THEME.md)** - Theming architecture

## 🐛 Troubleshooting

### "Unauthorized" on login
- Check user has `role` in Clerk `publicMetadata`
- Verify user exists in both Clerk and Convex

### Cannot create users
- Verify you're logged in as a manager
- Check Clerk API keys in `.env.local`
- Check browser console for errors

### Images not uploading
- Verify Cloudinary credentials in `.env.local`
- Check Cloudinary dashboard for API keys
- Verify cloud name, API key, and API secret

### Redirects not working
- Clear browser cache and cookies
- Verify middleware is running
- Check role in Clerk `publicMetadata`

## 📄 License

Proprietary - NOTION CRM © 2024

## 🤝 Support

For issues or questions:
1. Check documentation in this repository
2. Review [Clerk Documentation](https://clerk.com/docs)
3. Review [Convex Documentation](https://docs.convex.dev)
4. Contact your system administrator

---

**Built with ❤️ for enterprise CRM needs**
