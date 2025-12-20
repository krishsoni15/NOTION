import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import { ConvexClientProvider } from "./convex-provider";
import { ThemeInitializer } from "./theme-initializer";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";

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
      { url: '/images/logos/Notion_Favicon-removebg-preview.png', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: '/images/logos/Notion_Favicon-removebg-preview.png',
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
          <Providers>
            <ThemeInitializer />
            <ConvexClientProvider>{children}</ConvexClientProvider>
            <Toaster />
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
