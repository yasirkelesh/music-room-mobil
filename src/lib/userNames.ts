import { useEffect, useState } from 'react';
import { api } from '@/api/client';

const names = new Map<string, string>();
const inflight = new Map<string, Promise<void>>();

function load(id: string) {
  let p = inflight.get(id);
  if (!p) {
    p = api.users.get(id)
      .then((u) => { names.set(id, u.displayName); })
      .catch(() => {})
      .finally(() => inflight.delete(id));
    inflight.set(id, p);
  }
  return p;
}

/** Display names for account ids (cached). Unknown ids read as '…' until they arrive. */
export function useUserNames(ids: string[]): Record<string, string> {
  const [, bump] = useState(0);
  const key = [...new Set(ids)].sort().join(',');
  useEffect(() => {
    let live = true;
    const todo = key ? key.split(',').filter((id) => !names.has(id)) : [];
    if (todo.length) Promise.all(todo.map(load)).then(() => { if (live) bump((n) => n + 1); });
    return () => { live = false; };
  }, [key]);
  return Object.fromEntries(ids.map((id) => [id, names.get(id) ?? '…']));
}
