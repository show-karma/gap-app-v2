export default function OnchainReputationPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">What Is Onchain Reputation?</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Onchain reputation is the cumulative record of a project's public work, preserved
            through time and visible to anyone.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Onchain reputation is built when a project's execution history — funding, milestones,
            updates, and outcomes — is recorded publicly in a way that cannot be quietly altered or
            erased.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why reputation needs a substrate</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Reputation is not a score. It is <strong>memory</strong>.
          </p>
          <p className="text-gray-700 dark:text-gray-300">In most funding systems:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Reputation is inferred from narratives</li>
            <li>History is fragmented across PDFs and links</li>
            <li>Past work disappears between funding rounds</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            This makes trust expensive and fragile.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Project profiles as the unit of reputation</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Onchain reputation is not attached to wallets or tokens alone. It is attached to{" "}
            <strong>project profiles</strong>.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            A project profile becomes the canonical place where:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Work is documented</li>
            <li>Updates accumulate</li>
            <li>Evidence is attached</li>
            <li>History remains visible</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            Reputation emerges from repeated, observable behavior.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why "onchain" matters</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Storing project profiles as onchain attestations ensures:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Updates are append-only</li>
            <li>Past claims remain visible</li>
            <li>Credibility compounds over time</li>
            <li>Trust does not rely on the platform alone</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            Projects do <strong>not</strong> need blockchain knowledge to benefit from this.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Common misunderstandings</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Reputation ≠ token balance</li>
            <li>Reputation ≠ one successful grant</li>
            <li>Reputation ≠ endorsements without evidence</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            Reputation is earned through sustained execution.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How Karma fits</h2>
          <p className="text-gray-700 dark:text-gray-300">
            <a
              href="https://www.karmahq.xyz"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Karma
            </a>{" "}
            enables onchain reputation by providing free, public project profiles where work is
            documented, verified, and preserved over time.
          </p>
        </section>
      </article>
    </main>
  );
}
