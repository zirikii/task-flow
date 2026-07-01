export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted">
      <span
        className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden
      />
      {label ? <p className="text-sm">{label}</p> : null}
    </div>
  );
}
