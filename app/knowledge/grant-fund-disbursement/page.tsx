import Link from "next/link";

export default function GrantFundDisbursementPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">Grant Fund Disbursement Coordination</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Grant disbursement requires coordinating compliance, approvals, and execution before
            funds move.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Fund disbursement is the operational step where grants move from approval to payment,
            often gated by KYC, signed documents, and milestone conditions.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why disbursement is complex</h2>
          <p className="text-gray-700 dark:text-gray-300">Disbursement often depends on:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Completed KYC</li>
            <li>Signed agreements</li>
            <li>Internal approvals</li>
            <li>Correct transaction execution</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            Each dependency introduces delays if tracked manually.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What good disbursement systems do</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Surface blocking requirements</li>
            <li>Prevent premature payments</li>
            <li>Reduce manual coordination</li>
            <li>Create auditability</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related</h2>
          <p className="space-y-1">
            <Link
              href="/knowledge/grant-kyc"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → KYC in grant programs
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
            coordinates KYC, signing, and grant status so program managers can confidently trigger
            payments without operational chaos.
          </p>
        </section>
      </article>
    </main>
  );
}
