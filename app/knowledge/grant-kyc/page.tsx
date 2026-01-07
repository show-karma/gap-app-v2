export default function GrantKYCPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">KYC in Grant and Funding Programs</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            KYC is a compliance requirement for larger grants that must be coordinated without
            slowing down funding operations.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Know-Your-Customer (KYC) processes verify the identity of grantees for regulatory and
            compliance reasons, particularly for large or foundation-managed grants.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why KYC becomes painful</h2>
          <p className="text-gray-700 dark:text-gray-300">
            At scale, KYC creates operational friction:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Tracking who has completed it</li>
            <li>Coordinating follow-ups</li>
            <li>Blocking payments until resolved</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            Manual coordination quickly breaks down.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What good KYC handling requires</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Visibility into KYC status</li>
            <li>Clear requirements per grant</li>
            <li>Automated follow-ups</li>
            <li>Integration with disbursement workflows</li>
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
            tracks KYC requirements and completion status so compliance does not become a bottleneck
            for funding.
          </p>
        </section>
      </article>
    </main>
  );
}
