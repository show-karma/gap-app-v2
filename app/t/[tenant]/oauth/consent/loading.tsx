export default function Loading() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-background px-4 py-16">
      <output
        aria-label="Loading authorization details"
        className="block h-48 w-full max-w-md animate-pulse rounded-2xl border border-border bg-card"
      />
    </main>
  );
}
