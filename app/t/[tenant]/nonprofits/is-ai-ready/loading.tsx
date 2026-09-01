export default function ScannerLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-col items-center px-6 py-20">
      <output
        className="flex w-full max-w-[820px] animate-pulse flex-col items-center gap-4"
        aria-label="Loading scanner"
        aria-busy="true"
      >
        <div className="h-12 w-3/4 rounded-lg bg-secondary" />
        <div className="h-4 w-2/3 rounded bg-secondary" />
        <div className="mt-4 h-[60px] w-full max-w-[620px] rounded-xl bg-secondary" />
        <div className="mt-8 h-56 w-full max-w-[720px] rounded-2xl bg-secondary" />
      </output>
    </main>
  );
}
