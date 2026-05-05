"use client";

/**
 * Convex Connection Test Page
 * Visit /test-convex to check if Convex is working
 */

import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/providers/auth-provider";

export default function TestConvexPage() {
  const { user: authUser, isAuthenticated } = useAuth();
  const { isAuthenticated: isConvexAuthed, isLoading: isConvexLoading } = useConvexAuth();
  
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isConvexAuthed ? undefined : "skip"
  );

  // Test a public query (if available) or skip if not authenticated
  const allUsers = useQuery(
    api.users.getAllUsers,
    isConvexAuthed ? undefined : "skip"
  );

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Convex Connection Test</h1>

        {/* Auth Status */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2">
            <p><strong>JWT Auth:</strong> {isAuthenticated ? "✅ Authenticated" : "❌ Not Authenticated"}</p>
            <p><strong>Convex Auth:</strong> {isConvexAuthed ? "✅ Authenticated" : "❌ Not Authenticated"}</p>
            <p><strong>Convex Loading:</strong> {isConvexLoading ? "⏳ Loading..." : "✅ Ready"}</p>
            {authUser && (
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded">
                <p><strong>JWT User:</strong></p>
                <pre className="text-sm">{JSON.stringify(authUser, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Current User from Convex */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Current User (from Convex)</h2>
          {currentUser === undefined ? (
            <p className="text-yellow-600">⏳ Loading...</p>
          ) : currentUser === null ? (
            <p className="text-red-600">❌ No user found in Convex</p>
          ) : (
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded">
              <pre className="text-sm">{JSON.stringify(currentUser, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* All Users Query Test */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">All Users Query Test</h2>
          {allUsers === undefined ? (
            <p className="text-yellow-600">⏳ Loading...</p>
          ) : allUsers === null || allUsers.length === 0 ? (
            <p className="text-red-600">❌ No users found</p>
          ) : (
            <div>
              <p className="text-green-600 mb-2">✅ Found {allUsers.length} users</p>
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded max-h-96 overflow-auto">
                <pre className="text-sm">{JSON.stringify(allUsers, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Convex URL */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Convex Configuration</h2>
          <p><strong>Convex URL:</strong> {process.env.NEXT_PUBLIC_CONVEX_URL || "❌ Not set"}</p>
        </div>
      </div>
    </div>
  );
}
