#!/bin/bash

# AntiGravity - Convex Fix & Deploy Script
# ----------------------------------------
# This script helps to resolve project access errors and deploy the fixes.

echo "🚀 AntiGravity - Convex Deployment Helper"
echo "----------------------------------------"

# 1. Login to Convex
echo "🔑 Step 1: Re-authenticating Convex CLI..."
npx convex login

# 2. Re-configure the project to match production
echo "📡 Step 2: Selecting the correct project (avid-grouse-395)..."
# This might fail if the user doesn't have permissions, but it verifies it.
npx convex dev --configure production

# 3. Deploy fixes to production
echo "📦 Step 3: Deploying server fixes (duplicates, limits, etc.)..."
npx convex deploy -y

echo ""
echo "✅ Finished! If Step 3 succeeded, your production 'Server Error' should be fixed."
echo "If it failed with 'Access Error', please ask the project owner to add your email"
echo "to the team at https://dashboard.convex.cloud for the project 'notion'."
