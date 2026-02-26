/**
 * Settings Page
 * 
 * Application settings including theme preferences.
 * Auth check is handled by dashboard layout.
 */

import { ThemeSettings } from "@/components/profile/theme-settings";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Customize your workspace appearance and preferences
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <ThemeSettings />
      </div>
    </div>
  );
}
