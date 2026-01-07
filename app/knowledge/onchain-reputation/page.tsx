export default function OnchainReputationPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">What Is Onchain Reputation?</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Reputation reflects what you have delivered, not what you hold.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Onchain reputation is a persistent, composable record of demonstrated work and
            reliability, distinct from tokens, capital, or identity.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why tokens don't capture reputation</h2>
          <p className="text-gray-700 dark:text-gray-300">Tokens represent:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Ownership</li>
            <li>Financial stake</li>
            <li>Speculation</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">They do not represent:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Execution quality</li>
            <li>Follow-through</li>
            <li>Reliability over time</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What reputation is built from</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Completed milestones</li>
            <li>Consistent progress updates</li>
            <li>Verified outcomes</li>
            <li>Endorsements and reviews</li>
            <li>Longitudinal execution history</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why onchain matters</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Onchain reputation is portable, difficult to erase, and usable across ecosystems.
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
            enables projects to turn execution into visible, reusable reputation.
          </p>
        </section>
      </article>
    </main>
  );
}
