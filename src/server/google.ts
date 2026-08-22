/**
 * Google sign-in, hand-rolled.
 *
 * The whole flow is three HTTPS calls, so pulling in an auth framework would
 * cost more in configuration than it saves. Standard authorization-code flow:
 * we never see the user's Google password, only a code we swap server-side.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

export const OAUTH_STATE_COOKIE = 'vyapar_oauth_state';
export const OAUTH_NEXT_COOKIE = 'vyapar_oauth_next';

/**
 * Only same-site paths may be redirected to after sign-in. Anything else — an
 * absolute URL, or a protocol-relative //evil.com — becomes '/'.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function credentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'Google sign-in is not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    );
  }
  return { clientId, clientSecret };
}

/**
 * Must match a redirect URI registered in the Google Cloud console exactly.
 * `APP_URL` wins when set, because a request's own origin can be a preview
 * deployment's URL, which will not be on that list.
 */
export function redirectUri(requestUrl: string): string {
  const base = process.env.APP_URL?.replace(/\/$/, '') ?? new URL(requestUrl).origin;
  return `${base}/api/auth/google/callback`;
}

export function authorizationUrl(state: string, requestUrl: string): string {
  const { clientId } = credentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(requestUrl),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // Always show the picker, so switching accounts does not need a sign-out.
    prompt: 'select_account',
  });
  return `${AUTH_ENDPOINT}?${params}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};

export async function exchangeCodeForProfile(
  code: string,
  requestUrl: string,
): Promise<GoogleProfile> {
  const { clientId, clientSecret } = credentials();

  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(requestUrl),
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Google rejected the sign-in code (${tokenRes.status}).`);
  }

  const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string };
  if (!accessToken) throw new Error('Google did not return an access token.');

  // Reading the profile from the userinfo endpoint rather than decoding the
  // id_token keeps us out of the business of verifying JWT signatures.
  const profileRes = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    throw new Error(`Could not read your Google profile (${profileRes.status}).`);
  }

  const profile = (await profileRes.json()) as Partial<GoogleProfile> & {
    email_verified?: boolean;
  };

  if (!profile.sub || !profile.email) {
    throw new Error('Google did not return an email address.');
  }
  if (profile.email_verified === false) {
    throw new Error('Your Google email address is not verified.');
  }

  return {
    sub: profile.sub,
    email: profile.email.toLowerCase(),
    name: profile.name?.trim() || profile.email.split('@')[0],
    picture: profile.picture,
  };
}
