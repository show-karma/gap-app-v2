import Link from "next/link";

export default function ReputationCompoundingPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">How Reputation Compounds in Open Funding Systems</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Reputation is cumulative memory for funding decisions.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            In open funding systems, reputation reduces uncertainty and improves capital allocation
            over time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Without reputation</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Each funding round resets trust to zero.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">With reputation</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Past execution becomes predictive context, lowering evaluation cost and improving
            outcomes.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related</h2>
          <p>
            <Link
              href="/knowledge/impact-measurement"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              → Impact measurement
            </Link>
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Karma's thesis</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Capital should follow credibility, and credibility should be earned through work.{" "}
            <a
              href="https://www.karmahq.xyz"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Learn more about Karma
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
