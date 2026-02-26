# Implementation Plan: Remove Clerk → Custom JWT Auth

## Overview
Replace Clerk authentication with a fully custom JWT-based auth system.
- **Password hashing**: bcryptjs
- **JWT signing/verification**: jose (Edge-compatible)
- **Session management**: httpOnly cookies + Convex sessions table
- **Convex auth**: Custom OIDC provider served from Convex HTTP actions

## Architecture

### Auth Flow
1. User submits username/password → `POST /api/auth/login`
2. Server verifies password hash from Convex
3. Server generates JWT (signed with RSA private key)
4. JWT stored in httpOnly cookie
5. JWT passed to Convex via custom `ConvexProviderWithAuth`
6. Convex verifies JWT via JWKS endpoint (served from Convex HTTP actions)

### Files to Create (New)
- `scripts/generate-keys.mjs` - Generate RSA key pair
- `lib/auth/jwt.ts` - JWT sign/verify utilities
- `lib/auth/password.ts` - Password hash/verify
- `app/api/auth/login/route.ts` - Login endpoint
- `app/api/auth/logout/route.ts` - Logout endpoint
- `app/api/auth/me/route.ts` - Get current session
- `app/providers/auth-provider.tsx` - Custom auth context + Convex provider

### Files to Modify
- `convex/schema.ts` - Add passwordHash to users
- `convex/users.ts` - Add password-based login query
- `convex/auth.ts` - Add OIDC/JWKS HTTP actions
- `convex/auth.config.ts` - Point to custom OIDC
- `app/layout.tsx` - Remove ClerkProvider
- `app/convex-provider.tsx` - Custom auth instead of Clerk
- `middleware.ts` - Custom JWT verification
- `lib/auth/get-user-role.ts` - Read from JWT cookie
- `hooks/use-user-role.ts` - Read from custom auth context
- `components/auth/login-form.tsx` - Use custom API
- `components/auth/user-sync.tsx` - Remove Clerk dependency
- `components/layout/user-menu.tsx` - Remove Clerk hooks
- `app/api/admin/create-user/route.ts` - Hash password, no Clerk
- `app/api/admin/delete-user/route.ts` - No Clerk
- `app/api/admin/update-user-password/route.ts` - Use bcrypt
- `app/api/auth/change-password/route.ts` - Use bcrypt
- `app/api/upload/image/route.ts` - Custom auth check
- `app/api/upload/chat-file/route.ts` - Custom auth check
- `app/api/upload/chat-image/route.ts` - Custom auth check
- `app/api/delete/image/route.ts` - Custom auth check
- `app/dashboard/layout.tsx` - Custom auth
- `app/dashboard/profile/page.tsx` - Custom auth
- `app/dashboard/chat/layout.tsx` - Custom auth
- `app/dashboard/settings/page.tsx` - Custom auth
- `components/profile/profile-content.tsx` - Remove Clerk
- `components/user-management/*.tsx` - Remove Clerk
- `components/inventory/inventory-management.tsx` - Remove Clerk
- `components/locations/location-management.tsx` - Remove Clerk
- `components/vendors/vendor-management.tsx` - Remove Clerk
- `app/(auth)/login/page.tsx` - Remove Clerk
- `app/page.tsx` - Remove Clerk
- `.env` - Add JWT keys, remove Clerk keys

### Dependencies
- Add: `jose`, `bcryptjs`, `@types/bcryptjs`
- Remove: `@clerk/nextjs`, `convex/react-clerk`

## Phases
1. Install deps & generate keys
2. Create core auth utilities
3. Create OIDC/JWKS on Convex HTTP actions
4. Update Convex schema & functions
5. Create auth API routes
6. Create custom auth provider
7. Update middleware
8. Update all components
9. Remove Clerk
10. Test
