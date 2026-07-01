'use client';

import ReactMarkdown, { type Components } from 'react-markdown';

const components: Components = {
  h1: (props) => <h1 className="mt-6 text-3xl font-bold" {...props} />,
  h2: (props) => <h2 className="mt-5 border-b border-border pb-1 text-2xl font-semibold" {...props} />,
  h3: (props) => <h3 className="mt-4 text-lg font-semibold" {...props} />,
  p: (props) => <p className="mt-3 leading-7 text-fg/90" {...props} />,
  ul: (props) => <ul className="mt-3 list-disc space-y-1 pl-6" {...props} />,
  ol: (props) => <ol className="mt-3 list-decimal space-y-1 pl-6" {...props} />,
  li: (props) => <li className="leading-7" {...props} />,
  a: (props) => <a className="text-accent hover:underline" {...props} />,
  code: (props) => (
    <code className="rounded bg-border/50 px-1.5 py-0.5 font-mono text-sm" {...props} />
  ),
  blockquote: (props) => (
    <blockquote className="mt-3 border-l-4 border-border pl-4 italic text-muted" {...props} />
  ),
  hr: () => <hr className="my-6 border-border" />,
  table: (props) => <table className="mt-3 w-full border-collapse text-sm" {...props} />,
  th: (props) => <th className="border border-border bg-border/30 px-2 py-1 text-left" {...props} />,
  td: (props) => <td className="border border-border px-2 py-1" {...props} />,
};

export function Markdown({ children }: { children: string }) {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
}
