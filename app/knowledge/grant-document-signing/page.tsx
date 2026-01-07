import Link from "next/link";

export default function GrantDocumentSigningPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">Document Signing in Grant Programs</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Document signing formalizes grant commitments and must be tracked as part of the funding
            workflow.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Many programs require signed agreements defining milestones, payment conditions, and
            legal obligations. Signing must be tied directly to grant status to prevent operational
            chaos.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What agreements typically define</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Scope of work and milestones</li>
            <li>Payment conditions and schedule</li>
            <li>Legal and reporting obligations</li>
            <li>Termination clauses</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Problems without integrated signing</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Documents fragment across inboxes</li>
            <li>Signature status becomes unclear</li>
            <li>Payments stall waiting for confirmations</li>
            <li>No audit trail for agreements</li>
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
            integrates document signing into the grant workflow so signature status is always
            visible and tied to disbursement readiness.
          </p>
        </section>
      </article>
    </main>
  );
}
