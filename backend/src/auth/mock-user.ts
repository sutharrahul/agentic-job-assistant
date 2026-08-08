// The fake "logged in" user injected by SupabaseAuthGuard when
// BYPASS_AUTH=true — mirrors frontend/src/lib/auth/mock-user.ts EXACTLY
// (same id, same email). They have to match: the frontend's UI renders
// as this user, and whatever it uploads/saves needs to land under a
// User row NestJS actually has (see main.ts bootstrap(), which upserts
// this row on startup when bypass is on).
export const MOCK_JWT_PAYLOAD = {
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'dev@example.com',
};
