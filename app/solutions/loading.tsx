export default function SolutionsLoading() {
  return (
    <div className="mx-auto max-w-[1120px] px-8 py-12">
      <div className="animate-pulse space-y-8">
        <div className="h-10 w-64 rounded bg-muted" />
        <div className="h-5 w-96 rounded bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={`skeleton-${i}`} className="h-40 rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
