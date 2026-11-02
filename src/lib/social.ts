// Sign in with Google: the app only obtains an authorization code; the API exchanges it with the client
// secret and validates the ID token (backend SPEC-041). The client here is the API's *Web* OAuth client,
// and Google allows a Web client nothing but https redirects — so Google redirects to a small static page
// (docs/oauth/index.html) that bounces the code into the app. Where to bounce is carried in `state`,
// which lets the same page serve the installed app (musicroom://) and Expo Go (exp://).

import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
export const OAUTH_REDIRECT = process.env.EXPO_PUBLIC_OAUTH_REDIRECT ?? 'https://yasirkelesh.github.io/music-room-mobil/oauth/';

/** False until a client id is configured: the buttons say so instead of opening a broken page. */
export const googleReady = CLIENT_ID.length > 0;

export type SocialCode = { provider: 'google'; code: string; codeVerifier: string; redirectUri: string };

const base64url = (b64: string) => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const bytesB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

/** Opens Google's consent page. Resolves null when the user closes it. */
export async function googleCode(): Promise<SocialCode | null> {
  if (!googleReady) throw new Error('google-not-configured');
  const codeVerifier = base64url(bytesB64(Crypto.getRandomBytes(32)));
  const challenge = base64url(await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, codeVerifier, { encoding: Crypto.CryptoEncoding.BASE64 }));
  const back = Linking.createURL('oauth');
  const nonce = base64url(bytesB64(Crypto.getRandomBytes(16)));
  const state = base64url(btoa(JSON.stringify({ r: back, n: nonce })));

  const q = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT,
    response_type: 'code',
    scope: 'openid email profile',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    prompt: 'select_account',
  });
  const res = await WebBrowser.openAuthSessionAsync(`https://accounts.google.com/o/oauth2/v2/auth?${q}`, back);
  if (res.type !== 'success') return null;

  const params = Linking.parse(res.url).queryParams ?? {};
  // a reply to some other request (or a forged one) is not ours to use
  if (params.state !== state) throw new Error('state-mismatch');
  if (params.error === 'access_denied') return null;
  if (typeof params.code !== 'string') throw new Error(String(params.error ?? 'no-code'));
  return { provider: 'google', code: params.code, codeVerifier, redirectUri: OAUTH_REDIRECT };
}
