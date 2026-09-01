export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="space-y-4">
        <div className="h-8 w-72 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted" />
        <div className="mt-8 h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
