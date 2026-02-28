# Notion ERP Dashboard

A high-performance modern web application built with Next.js, React, and Convex to manage business operations including users, inventory, requests, purchase orders, deliveries, and more.

## Tech Stack
- **Frontend Framework**: [Next.js](https://nextjs.org) (React)
- **Backend & Database**: [Convex](https://convex.dev/) (Real-time schema-enforced DB)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Mapping**: Leaflet & React-Leaflet
- **File Storage**: Cloudflare R2
- **Email**: Resend
- **Auth**: Custom JWT-based Authentication System

## Environment Variables
Create a `.env.local` containing your API keys, Convex deployment links, database configurations, and cryptographic JWT keys.
```bash
# Convex Configuration
CONVEX_DEPLOYMENT=[your-convex-deployment]
NEXT_PUBLIC_CONVEX_URL=[your-convex-url]
CONVEX_SITE_URL=[your-convex-site]

# 3rd Party Assets
R2_ACCOUNT_ID=[...]
R2_ACCESS_KEY_ID=[...]
RESEND_API_KEY=[...]
NEXT_PUBLIC_GEOAPIFY_API_KEY=[...]

# JWT Auth
JWT_PRIVATE_KEY=[...]
JWT_PUBLIC_KEY=[...]
```

## Running Locally
1. Install node dependencies:
```bash
npm install
```

2. Start the development server (automatically handles both your Next.js application & Convex connection configuration):
```bash
npm run dev:all
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Core Features
1. **Real-time Database**: Integrated natively via the Convex SDK
2. **Role-Based Authentication**: Custom, high-speed encrypted JWT authentication without locking you into expensive proprietary libraries (Supports Admin, Site Engineer, Manager, and PO managers)
3. **Dashboards**: Responsive custom dashboards for each specific engineering user group
4. **Operations Management**: Manage request approvals, delivery dispatching (DCs), purchase orders (POs) and sub-contracts securely over the cloud. 
