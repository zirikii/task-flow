import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@taskflow/api';

/** Typed tRPC React hooks bound to the API's AppRouter. */
export const trpc = createTRPCReact<AppRouter>();
