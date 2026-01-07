export default function GrantDocumentSigningPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">Document Signing in Grant Programs</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Document signing formalizes grant commitments before funds are released.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Many grant programs require signed agreements that define milestones, obligations, and
            terms before disbursement.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why this matters</h2>
          <p className="text-gray-700 dark:text-gray-300">Without structured signing:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Agreements live in inboxes</li>
            <li>Status becomes unclear</li>
            <li>Payments are delayed</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            Signing is a coordination problem, not just a legal one.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What effective signing workflows need</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Clear document templates</li>
            <li>Status tracking</li>
            <li>Association with specific grants</li>
            <li>Visibility for program managers</li>
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
            simplifies document signing by tying agreements directly to grants and tracking
            completion status in the same system.
          </p>
        </section>
      </article>
    </main>
  );
}
