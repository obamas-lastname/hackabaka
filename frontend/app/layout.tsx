import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ui/theme-provider"
import { TransactionProvider } from "@/lib/transaction-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fraud Detection Dashboard",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    title: "GPF",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} >
         <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TransactionProvider>
              <div className="flex flex-col min-h-screen">
                {children}
                
                {/* Footer */}
                <footer className="border-t border-border bg-background/40 backdrop-blur-sm">
                  <div className="px-4 md:px-8 py-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Made with <span className="text-red-500">❤️</span> by <span className="font-semibold">Git Push Force Team</span> during <span className="font-semibold">EESTEC Olympics 13</span>
                    </p>
                  </div>
                </footer>
              </div>
            </TransactionProvider>
          </ThemeProvider>
      </body>
    </html>
  );
}
