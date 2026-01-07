import Link from "next/link";

export default function DaoGrantMilestonesPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">How DAOs Track Grant Milestones</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Milestone tracking determines whether execution data compounds or disappears.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            DAOs track grant milestones using tools ranging from documents and spreadsheets to
            dedicated funding platforms, each with tradeoffs around structure, visibility, and
            learning.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Common approaches</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Docs / Notion / Sheets
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                <li>Fast and flexible</li>
                <li>Low upfront cost</li>
                <li>No standardization</li>
                <li>Poor long-term memory</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Custom dashboards</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                <li>Powerful and tailored</li>
                <li>Expensive to build</li>
                <li>High maintenance</li>
                <li>Ecosystem silos</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Modular funding platforms
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                <li>Standard milestone schemas</li>
                <li>Ongoing updates</li>
                <li>Review workflows</li>
                <li>Cross-round visibility</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What good milestone tracking enables</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Clear expectations</li>
            <li>Transparent progress</li>
            <li>Comparable outcomes</li>
            <li>Better future funding decisions</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related</h2>
          <p>
            <Link
              href="/knowledge/ai-grant-evaluation"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              → AI-assisted grant evaluation
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
            provides milestone tracking as shared infrastructure rather than ad-hoc reporting
            artifacts.
          </p>
        </section>
      </article>
    </main>
  );
}
