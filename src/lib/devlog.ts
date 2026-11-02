import Constants from 'expo-constants';

// Dev-only: ships a line to a tiny HTTP listener on port 8099 of the Mac running Metro, because React
// Native console output no longer reaches the Metro terminal. Remove when done debugging.
// The Mac is wherever the bundle came from (hostUri "192.168.1.36:8081"), not the API, which may be remote.
const host = `http://${(Constants.expoConfig?.hostUri ?? 'localhost:8081').split(':')[0]}`;
export const devlog = (...a: unknown[]) => {
  if (!__DEV__) return;
  fetch(`${host}:8099/log`, { method: 'POST', body: a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ') }).catch(() => {});
};

/** Dev-only: mirror console warnings/errors to the Mac listener (LogBox only says "open debugger"). */
export function forwardConsole() {
  if (!__DEV__) return;
  for (const level of ['warn', 'error'] as const) {
    const orig = console[level];
    console[level] = (...a: unknown[]) => { devlog(`[${level}]`, ...a.map((x) => (x instanceof Error ? x.message : x))); orig(...a); };
  }
}
