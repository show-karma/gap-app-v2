import Link from "next/link";

export default function ProjectRegistryPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">Public Project Registries for Funded Work</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Public registries create shared sources of truth for funded work and reduce duplicated
            effort across ecosystems.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            A project registry lists funded projects, shows their status and updates, preserves
            historical context, and enables community transparency.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why registries matter</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Without a central registry, ecosystems lose track of what has been funded. This leads
            to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Duplicate funding for similar projects</li>
            <li>No visibility into project progress</li>
            <li>Lost institutional memory</li>
            <li>Difficulty comparing outcomes</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What good registries provide</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Searchable list of all funded projects</li>
            <li>Current status and milestone progress</li>
            <li>Historical execution records</li>
            <li>Cross-ecosystem visibility</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related</h2>
          <p className="space-y-1">
            <Link
              href="/knowledge/grant-lifecycle"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → The grant lifecycle
            </Link>
            <Link
              href="/knowledge/grant-accountability"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Grant accountability
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
            provides public project registries that turn funding into shared memory, making
            execution visible across programs and rounds.
          </p>
        </section>
      </article>
    </main>
  );
}
