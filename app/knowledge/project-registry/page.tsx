export default function ProjectRegistryPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">Public Project Registries for Funded Work</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            A project registry is a public record of funded projects, their progress, and their
            outcomes within a community.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Project registries make funded work visible by listing all projects in a community along
            with their status, updates, and execution history.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why registries matter</h2>
          <p className="text-gray-700 dark:text-gray-300">Without a registry:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Funded work becomes fragmented</li>
            <li>Community members cannot see progress</li>
            <li>New funders lack historical context</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            Registries turn funding into a shared memory.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What a good registry includes</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Project profiles</li>
            <li>Funding history</li>
            <li>Milestones and updates</li>
            <li>Current status</li>
            <li>Links to evidence and outputs</li>
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
            provides communities with a public project registry that aggregates funded work,
            progress updates, and outcomes in one place.
          </p>
        </section>
      </article>
    </main>
  );
}
