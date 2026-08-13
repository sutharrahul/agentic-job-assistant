// Where each auth outcome lands, kept in one place so /login and
// /signup can't drift apart — each screen sets four redirect values
// (its own success path plus both OAuth-callback fallbacks) and they
// have to agree.
//
// The two differ on purpose. Someone signing IN has been here before, so
// the dashboard — pipeline, upcoming interviews, follow-ups — is the
// useful view. Someone signing UP has no applications for it to show;
// every AI feature is gated on a CONFIRMED resume, so the resume page is
// the only screen that does anything for them yet.
export const AFTER_SIGN_IN = "/dashboard";
export const AFTER_SIGN_UP = "/resume";
