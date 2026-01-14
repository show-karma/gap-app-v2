import Link from "next/link";

export default function OnchainProjectProfilesPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">
          Onchain Project Profiles (Without Blockchain Complexity)
        </h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Onchain project profiles provide credibility and persistence without requiring
            blockchain knowledge.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Onchain project profiles store updates as attestations, making history tamper-resistant
            and publicly verifiable while remaining easy to use.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What "onchain" actually means here</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Updates cannot be silently deleted</li>
            <li>History is transparent</li>
            <li>Trust does not depend on the platform alone</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What it does not mean</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>No wallets required</li>
            <li>No crypto expertise needed</li>
            <li>No technical setup</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why this matters</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Onchain storage ensures that credibility is earned through time, not presentation.
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
            provides onchain project profiles that are simple to use — no blockchain expertise
            required — while preserving the benefits of tamper-resistant history.
          </p>
          <p className="pt-2">
            <Link
              href="/create-project-profile"
              className="text-blue-600 hover:underline dark:text-blue-400 font-semibold"
            >
              → Create your project profile
            </Link>
          </p>
        </section>
      </article>
    </main>
  );
}
