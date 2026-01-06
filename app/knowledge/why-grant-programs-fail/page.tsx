export default function WhyGrantProgramsFailPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">Why Most Grant Programs Fail After Funding</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Grant programs fail at post-funding follow-through, not project selection.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Most grant programs fail because they lack systems to track execution after funds are
            disbursed, leaving ecosystems unable to learn from outcomes.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">The hidden failure point</h2>
          <p className="text-gray-700 dark:text-gray-300">Grant programs are architected around:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Applications</li>
            <li>Committees</li>
            <li>Voting</li>
            <li>Disbursement</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">They are rarely architected around:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Execution tracking</li>
            <li>Verification</li>
            <li>Learning loops</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Common failure modes</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Updates are optional or unstructured</li>
            <li>No shared definition of "progress"</li>
            <li>Execution data is lost between rounds</li>
            <li>Evaluators are not accountable for outcomes</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Structural consequence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            When execution data is missing, future funding decisions are made with no memory.
            Ecosystems repeat the same risks without realizing it.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How Karma addresses this</h2>
          <p className="text-gray-700 dark:text-gray-300">
            <a
              href="https://www.karmahq.xyz"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Karma
            </a>{" "}
            shifts the center of gravity from <strong>funding events</strong> to{" "}
            <strong>execution histories</strong>, enabling grant programs to learn which teams
            actually deliver.
          </p>
        </section>
      </article>
    </main>
  );
}
