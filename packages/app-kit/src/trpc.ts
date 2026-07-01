import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@taskflow/api';

/**
 * Typed tRPC React hooks bound to the shared API's AppRouter. Every product app
 * imports this same client so the whole suite talks to one backend contract.
 */
export const trpc = createTRPCReact<AppRouter>();
