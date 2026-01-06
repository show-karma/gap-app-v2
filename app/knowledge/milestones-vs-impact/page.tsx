export default function MilestonesVsImpactPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">Grant Milestones vs Impact</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Milestones track work done; impact tracks change created.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Milestones measure execution against commitments, while impact measures outcomes
            produced by that execution.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Milestones</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Controlled by the team</li>
            <li>Time-bound</li>
            <li>Execution-focused</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Impact</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Often delayed</li>
            <li>Influenced by external factors</li>
            <li>Outcome-focused</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why confusing them causes problems</h2>
          <p className="text-gray-700 dark:text-gray-300">
            A project can meet milestones without impact, or create impact while missing milestones.
            Treating them as the same obscures performance.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Karma's model</h2>
          <p className="text-gray-700 dark:text-gray-300">
            <a
              href="https://www.karmahq.xyz"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Karma
            </a>{" "}
            separates milestone tracking from impact documentation so evaluation remains clear and
            honest.
          </p>
        </section>
      </article>
    </main>
  );
}
