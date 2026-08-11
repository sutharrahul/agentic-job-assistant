"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

// A direct toggle, not a menu — flips between light and dark in one
// click rather than requiring "open menu, then pick an option." No
// "system" option: once someone has clicked this at all, they've
// expressed a preference, and next-themes persists it, so there's
// nothing "system" would add back.
export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* Both icons render unconditionally, every time, on server and
          client alike — CSS dark: variants pick which one shows, reading
          the "dark" class next-themes stamps onto <html> via an inline
          script that runs before hydration. That's the point: there is
          no client-only branch here for the two renders to disagree on.
          A JS conditional on resolvedTheme was tried and reverted — with
          enableSystem on, next-themes resolves the real theme
          SYNCHRONOUSLY on the client's very first render (it reads
          localStorage in a lazy useState initializer, not an effect),
          while the server has no such access and is always "undefined".
          That guarantees a mismatch on the very first paint, every time,
          in any non-default theme — not a rare edge case to shrug off. */}
      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
