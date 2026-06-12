/** Clerk session token provider — registered from AuthContext. */
let clerkGetToken: (() => Promise<string | null>) | null = null;

export function registerClerkGetToken(
  fn: () => Promise<string | null>,
): void {
  clerkGetToken = fn;
}

export function clearClerkGetToken(): void {
  clerkGetToken = null;
}

function headersToRecord(
  headers: HeadersInit | undefined,
): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
}

async function resolveClerkToken(): Promise<string | null> {
  if (!clerkGetToken) return null;
  const delaysMs = [0, 80, 200];
  for (const delay of delaysMs) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    try {
      const token = await clerkGetToken();
      if (token) return token;
    } catch {
      // retry
    }
  }
  return null;
}

/** Merges Clerk Bearer token into request headers when a session exists. */
export async function withApiAuthHeaders(
  headers?: HeadersInit,
): Promise<Record<string, string>> {
  const merged = headersToRecord(headers);
  const token = await resolveClerkToken();
  if (token) {
    merged.Authorization = `Bearer ${token}`;
  }
  return merged;
}

/** `fetch` with Clerk Bearer merged in (for blob/binary responses). */
export async function fetchWithApiAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = await withApiAuthHeaders(init?.headers);
  return fetch(input, { ...init, headers });
}
