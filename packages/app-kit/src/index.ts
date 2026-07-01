// @taskflow/app-kit — shared web runtime for every product app in the suite:
// tRPC client, providers, auth views/guard, workspace context and the
// Atlassian-style top bar + app switcher.
export { trpc } from './trpc';
export { API_URL, WS_URL, TRPC_HTTP_URL, TRPC_WS_URL } from './env';
export { Providers } from './Providers';
export { Spinner } from './Spinner';
export { useMe, LoginView, SignupView } from './auth';
export { useActiveWorkspace, type ActiveWorkspace } from './workspace';
export { ProductChrome, AppSwitcher } from './ProductChrome';
export { PRODUCTS, productById, type Product } from './products';
