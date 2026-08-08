// The fake "logged in" user used when NEXT_PUBLIC_BYPASS_AUTH=true.
// See auth-context.tsx for where this actually gets used.
export const MOCK_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "dev@example.com",
} as const;
