#!/bin/bash

echo "🔧 Fixing authentication issues..."

# Kill any running processes
echo "1. Stopping all dev servers..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "convex dev" 2>/dev/null || true
sleep 2

# Clear Next.js cache
echo "2. Clearing Next.js cache..."
rm -rf .next

# Clear browser data instruction
echo "3. ⚠️  IMPORTANT: Clear your browser cookies for localhost:3000"
echo "   - Open DevTools (F12)"
echo "   - Go to Application tab"
echo "   - Clear all cookies for localhost"
echo ""

# Start only Next.js (without Convex dev)
echo "4. Starting Next.js dev server (without Convex dev)..."
echo "   Your app will use the remote Convex deployment"
echo ""
npm run dev
