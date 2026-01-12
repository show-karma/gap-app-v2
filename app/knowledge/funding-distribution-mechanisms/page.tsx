import Link from "next/link";

export default function FundingDistributionMechanismsPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">Multiple Funding Distribution Mechanisms</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Different funding goals require different distribution mechanisms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Funding programs use mechanisms like milestone-based payments, one-time grants, and
            retroactive funding depending on the nature of the work.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Common mechanisms</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>
              <strong>One-time grants:</strong> Upfront funding for defined scope
            </li>
            <li>
              <strong>Milestone-based:</strong> Staged payments tied to execution
            </li>
            <li>
              <strong>Retroactive:</strong> Rewards for completed work
            </li>
            <li>
              <strong>Streaming:</strong> Continuous payments over time
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why flexibility matters</h2>
          <p className="text-gray-700 dark:text-gray-300">
            No single mechanism fits all projects. Rigid systems distort incentives and force
            projects into unsuitable structures.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Choosing the right mechanism</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Known scope with clear deliverables → milestone-based</li>
            <li>Exploratory or early-stage work → one-time grant</li>
            <li>Proven impact already delivered → retroactive</li>
            <li>Ongoing operations → streaming</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related</h2>
          <p className="space-y-1">
            <Link
              href="/knowledge/grant-fund-disbursement"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Grant fund disbursement
            </Link>
            <Link
              href="/knowledge/grant-lifecycle"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → The grant lifecycle
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
            supports multiple distribution mechanisms so funding models align with how work is
            actually done.
          </p>
        </section>
      </article>
    </main>
  );
}
