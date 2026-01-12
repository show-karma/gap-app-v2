import Link from "next/link";

export default function GrantKycPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">KYC in Grant and Funding Programs</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            KYC ensures identity verification happens before funds move, without blocking the rest
            of the funding workflow.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            For larger grants or foundation-managed programs, identity verification is required
            before disbursement. Well-designed systems treat KYC as a gated dependency, not an
            afterthought.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Operational challenges</h2>
          <p className="text-gray-700 dark:text-gray-300">KYC coordination often involves:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Tracking who needs KYC</li>
            <li>Following up on incomplete checks</li>
            <li>Preventing premature payments</li>
            <li>Managing sensitive data securely</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What good KYC integration looks like</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>KYC status visible in grant workflow</li>
            <li>Automatic blocking of payments until complete</li>
            <li>Clear follow-up mechanisms</li>
            <li>Privacy-preserving verification</li>
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
              href="/knowledge/grant-fund-disbursement"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Grant fund disbursement
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
            integrates KYC into the grant workflow so verification happens seamlessly without
            delaying other operations.
          </p>
        </section>
      </article>
    </main>
  );
}
