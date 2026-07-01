/** Public runtime configuration shared by every product app (NEXT_PUBLIC_*). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'; // pragma: allowlist secret
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000'; // pragma: allowlist secret

export const TRPC_HTTP_URL = `${API_URL}/trpc`;
export const TRPC_WS_URL = `${WS_URL}/trpc`;
