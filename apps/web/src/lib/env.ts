/** Public runtime configuration (exposed to the browser via NEXT_PUBLIC_*). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';

export const TRPC_HTTP_URL = `${API_URL}/trpc`;
export const TRPC_WS_URL = `${WS_URL}/trpc`;
