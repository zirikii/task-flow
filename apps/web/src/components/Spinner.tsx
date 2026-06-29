export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center gap-3 text-muted">
      <span
        className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden
      />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}
