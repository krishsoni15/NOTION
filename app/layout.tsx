import type { Metadata } from "next";
import "../styles/globals.css";
import { ConvexClientProvider } from "./convex-provider";
import { AuthProvider } from "./providers/auth-provider";
import { ThemeInitializer } from "./theme-initializer";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { PresenceProvider } from "@/components/chat/presence-provider";

export const metadata: Metadata = {
  title: "Notion App",
  description: "Notion app with secure custom authentication",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/fav.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: '/fav.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="theme-notion">
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <Providers>
            <ThemeInitializer />
            <AuthProvider>
              <ConvexClientProvider>
                <PresenceProvider>
                  {children}
                </PresenceProvider>
              </ConvexClientProvider>
            </AuthProvider>
            <Toaster />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
