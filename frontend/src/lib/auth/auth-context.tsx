"use client";

// ============================================================================
// DEV-ONLY AUTH BYPASS
// ============================================================================
// Set NEXT_PUBLIC_BYPASS_AUTH=true (in .env.local) to skip real Supabase auth
// entirely — every page renders as MOCK_USER instead of checking a real
// session. Built so UI/pages can be reviewed before auth is fully wired up.
//
// This flag also short-circuits the redirect in src/proxy.ts (search
// NEXT_PUBLIC_BYPASS_AUTH there) — with it on, protected routes render with
// no session check at all, client OR server side.
//
// !! MUST be "false" or unset in any shared/deployed environment !!
// There is no other gate — this env var IS the switch.
// ============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { MOCK_USER } from "./mock-user";

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

type AuthUser = User | typeof MOCK_USER;

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isBypassed: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isBypassed: BYPASS_AUTH,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(
    BYPASS_AUTH ? MOCK_USER : null,
  );
  const [isLoading, setIsLoading] = useState(!BYPASS_AUTH);

  useEffect(() => {
    if (BYPASS_AUTH) return;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isBypassed: BYPASS_AUTH }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
