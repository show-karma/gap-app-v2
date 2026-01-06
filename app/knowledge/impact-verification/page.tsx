export default function ImpactVerificationPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">How to Verify Impact Without Centralized Auditors</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Trust emerges from repeated, visible verification.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Impact can be verified through transparent documentation, peer review, and repeated
            public evidence rather than centralized audits alone.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Limitations of centralized audits</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Expensive</li>
            <li>Infrequent</li>
            <li>Opaque</li>
            <li>Difficult to scale</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Alternative verification primitives</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Public progress updates</li>
            <li>Evidence-linked claims</li>
            <li>Peer attestations</li>
            <li>Historical consistency</li>
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
            supports impact as a living record rather than a one-time report.
          </p>
        </section>
      </article>
    </main>
  );
}
