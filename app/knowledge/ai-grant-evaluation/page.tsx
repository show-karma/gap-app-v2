import Link from "next/link";

export default function AiGrantEvaluationPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">AI-Assisted Grant Evaluation at Scale</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            AI-assisted evaluation helps grant programs process high volumes of applications without
            sacrificing review quality.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            When programs receive hundreds of applications, fully manual review does not scale.
            AI-assisted evaluation provides first-pass filtering, automated summaries, and risk
            signals while preserving human judgment for final decisions.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why this matters</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Grant programs often face a tradeoff between speed and rigor. Reviewer fatigue leads to
            inconsistent evaluations, missed red flags, and delayed decisions.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            AI assistance addresses this by handling repetitive analysis while keeping humans in
            control of judgment calls.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What AI-assisted evaluation enables</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Automated summaries of long applications</li>
            <li>Consistency checks across submissions</li>
            <li>Risk signal detection</li>
            <li>Reduced reviewer fatigue</li>
            <li>Faster turnaround without cutting corners</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What it does not replace</h2>
          <p className="text-gray-700 dark:text-gray-300">
            AI does not replace human judgment. Final decisions, nuanced evaluation, and
            context-sensitive assessments remain with reviewers.
          </p>
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
            integrates AI-assisted evaluation into the grant workflow, helping programs scale review
            without losing accountability.
          </p>
        </section>
      </article>
    </main>
  );
}
