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
            Impact measurement tracks what funded projects actually produce by aggregating evidence
            such as code activity, onchain data, and reported metrics.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why impact is hard to measure</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Outputs live across platforms</li>
            <li>Metrics are inconsistent</li>
            <li>Evidence is scattered</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            This makes comparison and learning difficult.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What effective impact measurement includes</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>GitHub integrations</li>
            <li>Smart contract activity</li>
            <li>Manually reported metrics</li>
            <li>Aggregated community-level views</li>
          </ul>
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
            makes impact measurement easy by allowing projects to connect technical data sources and
            manually input metrics, all rolled up into a shared community view.
          </p>
        </section>
      </article>
    </main>
  );
}
