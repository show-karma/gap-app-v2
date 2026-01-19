import Link from "next/link";

export default function ProjectProfilesPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">What Is a Project Profile?</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            A project profile is a public, persistent record of what a project has done, not just
            what it promises to do.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            A project profile is a free, public, shareable page where a project documents its work
            over time — including funding received, milestones, updates, and outcomes — creating a
            durable execution history that funders and communities can trust.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why project profiles exist</h2>
          <p className="text-gray-700 dark:text-gray-300">Most projects rely on:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Grant applications</li>
            <li>Reports</li>
            <li>Slide decks</li>
            <li>PDFs</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            These are <strong>episodic</strong>. They capture a moment, then disappear.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            Project profiles exist because funded work is <strong>continuous</strong>, and
            credibility comes from showing progress over time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What makes a project profile different</h2>
          <p className="text-gray-700 dark:text-gray-300">A project profile is:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>
              <strong>Public</strong> — visible to anyone
            </li>
            <li>
              <strong>Cumulative</strong> — grows over time
            </li>
            <li>
              <strong>Update-driven</strong> — not a one-time report
            </li>
            <li>
              <strong>Shareable</strong> — one link, everywhere
            </li>
            <li>
              <strong>Persistent</strong> — history doesn't reset
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What goes into a project profile</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Basic project description</li>
            <li>Funding received (grants, retro, etc.)</li>
            <li>Milestones and status</li>
            <li>Public progress updates</li>
            <li>Evidence and metrics</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Onchain, without complexity</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Project profiles are stored as onchain attestations:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Updates are append-only</li>
            <li>History is always visible</li>
            <li>Credibility compounds</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            Projects do <strong>not</strong> need to know anything about blockchain to benefit.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How Karma fits</h2>
          <p className="text-gray-700 dark:text-gray-300">
            <a
              href="https://www.karmahq.xyz"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Karma
            </a>{" "}
            provides project profiles as onchain, execution-based records that are free to create,
            public by default, and designed for funded work.
          </p>
          <p className="pt-2">
            <Link
              href="/create-project-profile"
              className="text-blue-600 hover:underline dark:text-blue-400 font-semibold"
            >
              → Create your project profile
            </Link>
          </p>
        </section>
      </article>
    </main>
  );
}
