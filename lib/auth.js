/**
 * Shared-token gate.
 *
 * Every API route runs this first. The token is passed as ?token= in the URL
 * (so the app can be deep-linked from an LMS or an email) and compared against
 * APP_ACCESS_TOKEN.
 *
 * Because the token rides in the URL, it lands in browser history, in any link
 * that gets pasted, and in screenshots. Treat those links as credentials. If
 * one leaks, rotate APP_ACCESS_TOKEN in Vercel and redeploy.
 *
 * The token alone does not identify anyone. It says "this request came from
 * someone with the link", nothing more. Identity comes from the passcode.
 */

export function tokenGuard(request) {
  const expected = process.env.APP_ACCESS_TOKEN;

  if (!expected) {
    console.error('[auth] APP_ACCESS_TOKEN is not set');
    return Response.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const url = new URL(request.url);
  const provided = url.searchParams.get('token') || request.headers.get('x-app-token') || '';

  if (provided !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // null = allowed through
}
