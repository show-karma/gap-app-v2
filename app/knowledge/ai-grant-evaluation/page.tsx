export default function AIGrantEvaluationPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">AI-Assisted Grant Evaluation at Scale</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            AI evaluation enables grant programs to scale application review by filtering,
            summarizing, and prioritizing proposals before human judgment.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            AI-assisted grant evaluation uses machine analysis to reduce reviewer workload by
            identifying low-quality applications, extracting key insights, and enabling humans to
            focus on high-signal proposals.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why this exists</h2>
          <p className="text-gray-700 dark:text-gray-300">
            When programs receive hundreds of applications, fully manual evaluation becomes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Slow</li>
            <li>Inconsistent</li>
            <li>Exhausting for reviewers</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            This creates pressure to either rush decisions or reduce rigor.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How AI fits into evaluation workflows</h2>
          <p className="text-gray-700 dark:text-gray-300">AI is most effective when used for:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>First-pass filtering of low-quality or incomplete applications</li>
            <li>Normalizing information across proposals</li>
            <li>Highlighting risks, overlaps, and missing data</li>
            <li>Producing structured summaries for reviewers</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">Final decisions remain human.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Common misunderstandings</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>AI evaluation ≠ automated grant decisions</li>
            <li>AI evaluation ≠ replacing evaluators</li>
            <li>AI evaluation ≠ removing accountability</li>
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
            uses AI to support evaluators by accelerating analysis, improving consistency, and
            allowing human reviewers to spend time where judgment matters most.
          </p>
        </section>
      </article>
    </main>
  );
}
