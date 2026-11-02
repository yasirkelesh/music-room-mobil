import { api, ApiError, clientContext } from '@/api/client';

let cached: string | null = null;

/**
 * This phone's device id. Registering twice is a 409 ("same owner, platform and model"), so on a
 * conflict we look the existing registration up instead.
 */
export async function ensureDevice(): Promise<string> {
  if (cached) return cached;
  try {
    cached = (await api.devices.register()).deviceId;
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 409)) throw e;
    const mine = (await api.devices.list()).find((d) => d.platform === clientContext.platform && d.model === clientContext.device);
    if (!mine) throw e;
    cached = mine.deviceId;
  }
  return cached;
}

/** Call on sign-out: a device id belongs to one account. */
export const forgetDevice = () => { cached = null; };
