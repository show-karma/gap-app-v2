export default function OnboardingLoading() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
      <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-200" />
      <div className="mt-8 space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: pure skeleton
          <div key={i}>
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="mt-1 h-9 animate-pulse rounded border bg-gray-100" />
          </div>
        ))}
        <div className="h-10 animate-pulse rounded bg-gray-200" />
      </div>
    </main>
  );
}
