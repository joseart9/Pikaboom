/**
 * Request header set by `src/proxy.ts` to the requested path + query, so server layouts (which receive neither)
 * can send a signed-out visitor back to the exact page after login. Always pass its value through `safeNext`.
 */
export const REQUEST_PATH_HEADER = "x-pikaboom-path";

/** Where auth flows land when no (valid) `next` is given. */
export const DEFAULT_NEXT = "/cards";

const BASE = "http://local.invalid";

/**
 * Returns `next` only when it is a same-origin relative path (query strings allowed), otherwise `fallback`.
 * Prevents open redirects through `?next=` (§21 Phase 2 H): `//evil.com`, `/\evil.com`, absolute URLs and
 * `javascript:` are all rejected.
 */
export function safeNext(next: string | null | undefined, fallback: string = DEFAULT_NEXT): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (next[0] !== "/" || next[1] === "/" || next[1] === "\\") return fallback;
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return fallback;
  }
  // The URL parser strips tabs/newlines and normalizes backslashes, so re-check the origin after parsing.
  if (url.origin !== BASE) return fallback;
  return url.pathname + url.search + url.hash;
}
