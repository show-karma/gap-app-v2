export default function ManualVsPlatformGrantTrackingPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">Karma vs Manual Grant Tracking</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Manual tracking optimizes speed; platforms optimize trust.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Manual tools offer flexibility but fail at accountability and learning, while dedicated
            platforms trade flexibility for structure and memory.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Where manual tools work</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Small experiments</li>
            <li>One-off grants</li>
            <li>Early exploration</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Where they fail</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Standardization</li>
            <li>Persistence</li>
            <li>Discoverability</li>
            <li>Cross-round learning</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">When Karma is used</h2>
          <p className="text-gray-700 dark:text-gray-300">
            <a
              href="https://www.karmahq.xyz"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Karma
            </a>{" "}
            is used when ecosystems need repeatable funding decisions and durable execution history.
          </p>
        </section>
      </article>
    </main>
  );
}
