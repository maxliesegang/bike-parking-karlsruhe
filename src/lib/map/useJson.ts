import { useEffect, useState } from "react";

/**
 * Fetches a JSON endpoint, with abort-on-unmount cleanup and a `failed` flag.
 *
 * `enabled` gates the fetch: false → no request is sent, and a later transition
 * to true triggers it. Once `data` is populated it stays, so a component can
 * toggle `enabled` off without losing already-fetched data.
 */
export function useJson<T>(url: string, enabled: boolean) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: T) => {
        if (active) setData(json);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [url, enabled]);

  return { data, failed };
}
