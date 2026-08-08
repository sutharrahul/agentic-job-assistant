import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
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
    // ClerkProvider wraps <html> rather than sitting inside <body>
    // because it also renders into <head> for its own scripts.
    //
    // suppressHydrationWarning (below) is required by next-themes: it
    // sets the "dark" class on <html> via an inline script that runs
    // before React hydrates, so the class attribute React sees on first
    // render legitimately differs from the server-rendered markup.
    // Without this, React would log a hydration mismatch warning for
    // something that isn't actually a bug.
    <ClerkProvider>
      <html
        lang="en"
        className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="flex min-h-full flex-col">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster position="top-center" />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
