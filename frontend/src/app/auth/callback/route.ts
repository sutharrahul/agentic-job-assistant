import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google OAuth (and email-confirmation links) redirect here with a `code`
// query param. Exchanging it for a session has to happen server-side so
// the resulting cookies land in the response before the browser is sent
// to a protected route.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/resume`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
