#!/bin/bash

echo "🌱 Seeding test user to Convex..."
echo ""
echo "This will create/update the test user:"
echo "  Username: notion"
echo "  Password: notion@2026"
echo "  Role: manager"
echo ""

npx convex run setupUser:seedUser

echo ""
echo "✅ Done! Now try logging in at http://localhost:3000/login"
