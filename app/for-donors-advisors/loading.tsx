export default function Loading() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background">
      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-2 py-24">
        <div className="w-full max-w-[820px] flex flex-col items-center gap-6 px-4">
          <div className="h-6 w-44 rounded-full bg-secondary animate-pulse" />
          <div className="h-12 w-full max-w-[760px] rounded-lg bg-secondary animate-pulse" />
          <div className="h-4 w-full max-w-[640px] rounded bg-secondary animate-pulse" />
          <div className="h-10 w-64 rounded-md bg-secondary animate-pulse" />
        </div>
      </div>
    </main>
  );
}
