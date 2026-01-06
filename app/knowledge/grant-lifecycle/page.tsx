export default function GrantLifecyclePage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">The Grant Lifecycle</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">Grants are processes, not events.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            The grant lifecycle spans from proposal to verified impact, with execution and learning
            occurring long after funds are disbursed.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">The full lifecycle</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Proposal submission</li>
            <li>Evaluation and selection</li>
            <li>Funding disbursement</li>
            <li>Milestone execution</li>
            <li>Progress updates</li>
            <li>Review and feedback</li>
            <li>Impact documentation</li>
            <li>Reputation accumulation</li>
            <li>Influence on future funding</li>
          </ol>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What's usually missing</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Most systems stop at step 3, losing execution data and learning.
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
            supports the entire lifecycle, turning grants into durable learning systems.
          </p>
        </section>
      </article>
    </main>
  );
}
