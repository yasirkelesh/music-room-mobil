import { useEffect } from 'react';
import { router } from 'expo-router';

/**
 * Where Google's sign-in returns (musicroom://oauth?code=…). The code is read by src/lib/social.ts from
 * the browser session; on Android the same link also reaches the router, which lands here — so step
 * straight back to the screen that asked.
 */
export default function OAuthReturn() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);
  return null;
}
