import Link from "next/link";

export default function GrantLifecyclePage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">
          The Grant Lifecycle — From Proposal to Verified Impact
        </h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Modern grant programs are end-to-end systems that combine evaluation, compliance,
            execution tracking, disbursement, and impact measurement.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            The grant lifecycle spans from proposal submission to verified impact, requiring
            coordinated evaluation, compliance checks, milestone execution, payments, and long-term
            learning — not just funding approval.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why the lifecycle matters</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Most grant programs are designed around selection, but most of the real work happens
            after approval.
          </p>
          <p className="text-gray-700 dark:text-gray-300">When lifecycle steps are disconnected:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Operations become manual and error-prone</li>
            <li>Payments are delayed</li>
            <li>Accountability breaks down</li>
            <li>Impact is hard to verify</li>
            <li>Reputation does not accumulate</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            A complete lifecycle design treats grants as processes, not events.
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-semibold">The full grant lifecycle (with capabilities)</h2>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">1. Proposal submission</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Projects submit applications describing scope, milestones, and expected outcomes.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Key requirement:</strong> Structured applications that can be compared and
              reviewed at scale.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              2. Application evaluation (AI-assisted + human)
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              When programs receive hundreds of applications, fully manual review does not scale.
            </p>
            <p className="text-gray-700 dark:text-gray-300">Modern programs use:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>AI-assisted evaluation for first-pass filtering</li>
              <li>Automated summaries and risk signals</li>
              <li>Human reviewers for judgment and final decisions</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              This reduces reviewer fatigue while preserving accountability.
            </p>
            <p>
              <Link
                href="/knowledge/ai-grant-evaluation"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Related: AI-assisted grant evaluation
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">3. Selection and approval</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Approved projects move forward with clearly defined expectations:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>Scope of work</li>
              <li>Milestones (if applicable)</li>
              <li>Funding structure</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              This step establishes the commitments that accountability will later measure.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">4. Compliance and identity verification (KYC)</h3>
            <p className="text-gray-700 dark:text-gray-300">
              For larger grants or foundation-managed programs, identity verification is required
              before funds move.
            </p>
            <p className="text-gray-700 dark:text-gray-300">Operational challenges include:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>Tracking who needs KYC</li>
              <li>Following up on incomplete checks</li>
              <li>Preventing premature payments</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              Lifecycle-aware systems treat KYC as a gated dependency, not an afterthought.
            </p>
            <p>
              <Link
                href="/knowledge/grant-kyc"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Related: KYC in grant programs
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">5. Agreement and document signing</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Many programs require signed agreements defining:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>Milestones</li>
              <li>Payment conditions</li>
              <li>Legal and reporting obligations</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">Without integrated signing:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>Documents fragment across inboxes</li>
              <li>Status becomes unclear</li>
              <li>Payments stall</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              Signing must be tied directly to grant status.
            </p>
            <p>
              <Link
                href="/knowledge/grant-document-signing"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Related: Document signing in grants
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">6. Fund disbursement</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Disbursement is not a single action — it is a coordination step.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Before funds are released, systems must confirm:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>KYC completion</li>
              <li>Signed agreements</li>
              <li>Internal approvals</li>
              <li>Correct payment configuration</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              Good systems surface blockers clearly and prevent mistakes.
            </p>
            <p>
              <Link
                href="/knowledge/grant-fund-disbursement"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Related: Grant fund disbursement
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">7. Milestone execution and progress tracking</h3>
            <p className="text-gray-700 dark:text-gray-300">
              For milestone-based grants, execution is tracked over time:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>Projects submit updates</li>
              <li>Evidence is attached</li>
              <li>Progress is reviewed</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              This turns commitments into visible execution history.
            </p>
            <p>
              <Link
                href="/knowledge/dao-grant-milestones"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Related: DAO grant milestones
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">8. Public project registry</h3>
            <p className="text-gray-700 dark:text-gray-300">
              As projects execute, their work should be visible.
            </p>
            <p className="text-gray-700 dark:text-gray-300">A project registry:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>Lists funded projects</li>
              <li>Shows status and updates</li>
              <li>Preserves historical context</li>
              <li>Enables community transparency</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              Registries turn funding into shared memory.
            </p>
            <p>
              <Link
                href="/knowledge/project-registry"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Related: Public project registries
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">9. Impact measurement</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Beyond milestones, programs want to understand outcomes.
            </p>
            <p className="text-gray-700 dark:text-gray-300">Impact measurement aggregates:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>GitHub activity</li>
              <li>Smart contract data</li>
              <li>Manually reported metrics</li>
              <li>Community-level rollups</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              This allows ecosystems to assess what funding actually produced.
            </p>
            <p>
              <Link
                href="/knowledge/impact-measurement"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Related: Impact measurement
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">10. Reputation accumulation and learning</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Execution and impact data feed forward:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>Projects build reputation</li>
              <li>Evaluators gain credibility</li>
              <li>Funding decisions improve over time</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              Without this step, every funding round starts from zero.
            </p>
            <p className="space-y-1">
              <Link
                href="/knowledge/onchain-reputation"
                className="block text-blue-600 hover:underline dark:text-blue-400"
              >
                → Related: Onchain reputation
              </Link>
              <Link
                href="/knowledge/reputation-compounding"
                className="block text-blue-600 hover:underline dark:text-blue-400"
              >
                → Related: Reputation compounding
              </Link>
            </p>
          </div>
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
            supports the entire grant lifecycle, integrating evaluation, compliance, execution
            tracking, payments, impact measurement, and reputation into a single system.
          </p>
        </section>
      </article>
    </main>
  );
}
