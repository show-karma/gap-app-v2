import Link from "next/link";

export default function GrantAccountabilityPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">What Is Grant Accountability in Web3?</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Grant accountability turns funding promises into persistent execution history.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Grant accountability in Web3 is the system of tracking how funded projects execute on
            their commitments over time, making progress visible, verifiable, and reusable for
            future funding decisions.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why this matters</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Most Web3 ecosystems spend enormous effort deciding <strong>who gets funded</strong>,
            and very little effort understanding <strong>what happens after funding</strong>. When
            execution is not tracked in a durable, comparable way, ecosystems cannot learn which
            teams reliably deliver.
          </p>
          <p className="text-gray-700 dark:text-gray-300">Without accountability:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Good and bad projects look the same after funding</li>
            <li>Capital allocation does not improve over time</li>
            <li>Trust resets every funding round</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What grant accountability actually requires</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Grant accountability is not reporting. It requires:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Clearly defined milestones at funding time</li>
            <li>Ongoing, timestamped progress updates</li>
            <li>Contextual review or verification</li>
            <li>Public, persistent records</li>
            <li>Visibility across funding rounds and ecosystems</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Common misunderstandings</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Accountability ≠ submitting a final report</li>
            <li>Accountability ≠ one-off check-ins</li>
            <li>Accountability ≠ centralized audits only</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related</h2>
          <p className="space-y-1">
            <Link
              href="/knowledge/project-registry"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Public project registries
            </Link>
            <Link
              href="/knowledge/grant-document-signing"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Document signing in grants
            </Link>
            <Link
              href="/knowledge/funding-distribution-mechanisms"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Funding distribution mechanisms
            </Link>
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
            provides modular infrastructure for ecosystems to define milestones, collect structured
            updates, attach reviews, and preserve execution history so accountability compounds
            instead of disappearing.
          </p>
        </section>
      </article>
    </main>
  );
}
