import { Spinner } from "@/components/Utilities/Spinner";

/**
 * The preview route is `instant = false`, so it blocks on the draft fetch
 * rather than prerendering. This is what an editor sees while that resolves.
 * The public post route has no `loading.tsx` on purpose — it is crawlable, and
 * DEV-612 forbids a boundary above its content.
 */
export default function BlogPreviewLoading() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <Spinner />
    </div>
  );
}
