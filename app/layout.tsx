import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import { ConvexClientProvider } from "./convex-provider";
import { ThemeInitializer } from "./theme-initializer";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Notion App",
  description: "Notion app with Convex and Clerk authentication",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClerkProvider
          signInUrl="/login"
          signUpUrl="/login"
          afterSignOutUrl="/login"
          appearance={{
            variables: {
              colorPrimary: "#1F4E79",
              borderRadius: "0.75rem",
            },
          }}
        >
          <ErrorBoundary>
            <Providers>
              <ThemeInitializer />
              <ConvexClientProvider>{children}</ConvexClientProvider>
              <Toaster />
            </Providers>
          </ErrorBoundary>
        </ClerkProvider>
      </body>
    </html>
  );
}
