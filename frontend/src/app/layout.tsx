import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

// Design system, revised: Inter is the default body/UI face (--font-sans,
// Tailwind's font-sans utility, what <html> gets unless overridden) —
// headings, paragraphs, buttons, and form labels all read as clean
// humanist sans. Space Mono is demoted from "the default everywhere" to
// a deliberate label face: breadcrumbs, eyebrow text, stat captions, the
// wordmark — exposed as --font-label / the font-label utility, applied
// explicitly, not globally.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-label",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fitmark",
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
        className={`${spaceMono.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
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
