export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    </main>
  );
}
