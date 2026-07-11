import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth/auth-context";
import { Toaster } from "@/components/ui/sonner";

// Exposed as --font-sans, which globals.css maps to both the font-sans
// and font-heading utilities. Poppins isn't a variable font, so each
// weight used in the UI must be listed explicitly.
const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agentic Job Assistant",
  description: "AI-powered job application assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning is required by next-themes: it sets the
    // "dark" class on <html> via an inline script that runs before
    // React hydrates, so the class attribute React sees on first render
    // legitimately differs from the server-rendered markup. Without
    // this, React would log a hydration mismatch warning for something
    // that isn't actually a bug.
    <html
      lang="en"
      className={`${poppins.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster position="top-center" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
