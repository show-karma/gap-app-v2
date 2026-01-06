import Link from "next/link";

export default function ProjectReputationPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">How Projects Build Reputation Through Funding</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Reputation is the accumulation of visible follow-through.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Projects build reputation by consistently documenting execution across funding cycles,
            not by winning individual grants.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How reputation compounds</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Commit to milestones</li>
            <li>Document progress over time</li>
            <li>Receive contextual review</li>
            <li>Build execution history</li>
            <li>Earn trust from future funders and users</li>
          </ol>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What weakens reputation</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Missing updates</li>
            <li>Overpromising milestones</li>
            <li>Lack of evidence</li>
            <li>Inconsistent communication</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related</h2>
          <p>
            <Link
              href="/knowledge/project-registry"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              → Public project registries
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
            provides the surface where execution history persists and compounds into reputation.
          </p>
        </section>
      </article>
    </main>
  );
}
