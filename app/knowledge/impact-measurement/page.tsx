import Link from "next/link";

export default function ImpactMeasurementPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">Impact Measurement for Funded Projects</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Impact measurement connects funded work to verifiable outputs and outcomes.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Beyond milestones, programs want to understand what funding actually produced. Impact
            measurement aggregates data from multiple sources to assess outcomes at the project and
            ecosystem level.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What impact measurement aggregates</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>GitHub activity and code contributions</li>
            <li>Smart contract data and onchain metrics</li>
            <li>Manually reported metrics</li>
            <li>Community-level rollups</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why this matters</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Milestones track execution, but impact tracks change. Without measuring impact,
            ecosystems cannot learn which types of funding produce the best outcomes.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Challenges</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Impact is often delayed</li>
            <li>Attribution is difficult</li>
            <li>Metrics can be gamed</li>
            <li>Qualitative outcomes are hard to capture</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related</h2>
          <p className="space-y-1">
            <Link
              href="/knowledge/milestones-vs-impact"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Milestones vs impact
            </Link>
            <Link
              href="/knowledge/grant-lifecycle"
              className="block text-blue-600 hover:underline dark:text-blue-400"
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
            aggregates impact data from multiple sources, allowing ecosystems to assess what funding
            actually produced.
          </p>
        </section>
      </article>
    </main>
  );
}
