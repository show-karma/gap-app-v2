import Link from "next/link";

export default function WhitelabelFundingPlatformsPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">Whitelabel Funding Platforms</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Whitelabel platforms let ecosystems run funding programs under their own brand using
            shared infrastructure.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Instead of building custom funding tools, ecosystems can deploy branded instances of a
            shared platform, reducing development costs while maintaining program identity.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why ecosystems choose whitelabel</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Faster time to launch</li>
            <li>Lower development and maintenance costs</li>
            <li>Access to proven tooling</li>
            <li>Consistent user experience</li>
            <li>Shared improvements across deployments</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What whitelabel enables</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Custom branding and domain</li>
            <li>Program-specific configurations</li>
            <li>Integrated evaluation, tracking, and payments</li>
            <li>Cross-ecosystem data visibility (when desired)</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related</h2>
          <p>
            <Link
              href="/knowledge/grant-lifecycle"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              → The grant lifecycle
            </Link>
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Karma's role</h2>
          <p className="text-gray-700 dark:text-gray-300">
            <a
              href="https://www.karmahq.xyz"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Karma
            </a>{" "}
            provides whitelabel funding infrastructure so ecosystems can run branded programs
            without building from scratch.
          </p>
        </section>
      </article>
    </main>
  );
}
