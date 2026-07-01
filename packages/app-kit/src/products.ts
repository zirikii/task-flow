/**
 * The registry of every product in the suite. Each product is a separate Next.js
 * app served on its own port, but they share one API + one session cookie, so the
 * app switcher can jump between them as plain cross-origin links.
 *
 * URLs come from NEXT_PUBLIC_<PRODUCT>_URL (inlined per app at build time) with
 * localhost defaults for development.
 */
export interface Product {
  id: string;
  /** Full display name, e.g. "Confluence". */
  name: string;
  /** One-line description shown in the launcher. */
  tagline: string;
  /** Short glyph shown in the app-switcher tile (1-2 chars). */
  short: string;
  /** Origin the app is served from. */
  url: string;
  /** Accent colour for the tile. */
  accent: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 'home',
    name: 'Home',
    tagline: 'Your work across the suite',
    short: 'H',
    url: process.env.NEXT_PUBLIC_HOME_URL ?? 'http://localhost:3010',
    accent: '#1868db',
  },
  {
    id: 'jira',
    name: 'Jira',
    tagline: 'Track issues on a kanban board',
    short: 'J',
    url: process.env.NEXT_PUBLIC_JIRA_URL ?? 'http://localhost:3000', // pragma: allowlist secret
    accent: '#2684ff',
  },
  {
    id: 'confluence',
    name: 'Confluence',
    tagline: 'Docs, wikis and knowledge',
    short: 'C',
    url: process.env.NEXT_PUBLIC_CONFLUENCE_URL ?? 'http://localhost:3001',
    accent: '#1868db',
  },
  {
    id: 'trello',
    name: 'Trello',
    tagline: 'Boards, lists and cards',
    short: 'T',
    url: process.env.NEXT_PUBLIC_TRELLO_URL ?? 'http://localhost:3002',
    accent: '#0c66e4',
  },
  {
    id: 'servicedesk',
    name: 'Service Management',
    tagline: 'Requests, queues and support',
    short: 'SM',
    url: process.env.NEXT_PUBLIC_SERVICEDESK_URL ?? 'http://localhost:3003',
    accent: '#1868db',
  },
  {
    id: 'discovery',
    name: 'Product Discovery',
    tagline: 'Ideas, insights and prioritization',
    short: 'PD',
    url: process.env.NEXT_PUBLIC_DISCOVERY_URL ?? 'http://localhost:3004',
    accent: '#8270db',
  },
  {
    id: 'statuspage',
    name: 'Statuspage',
    tagline: 'Communicate real-time status',
    short: 'SP',
    url: process.env.NEXT_PUBLIC_STATUSPAGE_URL ?? 'http://localhost:3005',
    accent: '#22a06b',
  },
  {
    id: 'opsgenie',
    name: 'Opsgenie',
    tagline: 'Alerts and on-call response',
    short: 'OG',
    url: process.env.NEXT_PUBLIC_OPSGENIE_URL ?? 'http://localhost:3006',
    accent: '#e2483d',
  },
  {
    id: 'compass',
    name: 'Compass',
    tagline: 'Catalog every component',
    short: 'CO',
    url: process.env.NEXT_PUBLIC_COMPASS_URL ?? 'http://localhost:3007',
    accent: '#e56910',
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    tagline: 'Repositories and pull requests',
    short: 'B',
    url: process.env.NEXT_PUBLIC_BITBUCKET_URL ?? 'http://localhost:3008',
    accent: '#0c66e4',
  },
  {
    id: 'atlas',
    name: 'Atlas',
    tagline: 'Teams, goals and project updates',
    short: 'A',
    url: process.env.NEXT_PUBLIC_ATLAS_URL ?? 'http://localhost:3009',
    accent: '#ff7452',
  },
];

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === id);
}
