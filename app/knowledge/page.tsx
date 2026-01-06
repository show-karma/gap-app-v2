import Link from "next/link";

export default function KnowledgePage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-12">
        <header className="space-y-6">
          <h1 className="text-3xl font-bold">Knowledge</h1>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Short answer</h2>
            <p className="text-gray-700 dark:text-gray-300">
              This knowledge base explains how funding, accountability, reputation, and impact work
              in open ecosystems, and how these systems improve when execution history is visible
              and persistent.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">In one sentence</h2>
            <p className="text-gray-700 dark:text-gray-300">
              This is a reference guide to how modern funding systems actually work.
            </p>
          </section>
        </header>

        <hr className="border-gray-200 dark:border-gray-700" />

        <section className="space-y-6">
          <h2 className="text-xl font-semibold">What this knowledge base covers</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Open funding systems — especially in Web3 — face a common problem:{" "}
            <strong>capital moves faster than accountability.</strong>
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            This knowledge base exists to document the primitives required for funding systems to
            learn over time, including:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>How projects are funded</li>
            <li>How progress is tracked</li>
            <li>How impact is measured</li>
            <li>How reputation is built</li>
            <li>How capital allocation improves</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            These articles are written as <strong>reference material</strong>, not marketing
            content.
          </p>
        </section>

        <hr className="border-gray-200 dark:border-gray-700" />

        <section className="space-y-8">
          <h2 className="text-2xl font-bold">Core concepts</h2>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Grant accountability</h3>
            <p className="text-gray-700 dark:text-gray-300">
              How funded projects are tracked after money is disbursed, and why post-funding
              execution matters more than selection alone.
            </p>
            <p>
              <Link
                href="/knowledge/grant-accountability"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Grant accountability
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Why grant programs fail</h3>
            <p className="text-gray-700 dark:text-gray-300">
              A structural analysis of why many funding programs struggle to produce consistent
              outcomes despite strong applicant pools.
            </p>
            <p>
              <Link
                href="/knowledge/why-grant-programs-fail"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Why grant programs fail
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">DAO grant milestones</h3>
            <p className="text-gray-700 dark:text-gray-300">
              A practical breakdown of how DAOs define, track, and evaluate grant milestones — and
              the tradeoffs of different approaches.
            </p>
            <p>
              <Link
                href="/knowledge/dao-grant-milestones"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → DAO grant milestones
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Onchain reputation</h3>
            <p className="text-gray-700 dark:text-gray-300">
              What reputation actually means in open systems, how it differs from tokens or
              identity, and why execution history matters.
            </p>
            <p>
              <Link
                href="/knowledge/onchain-reputation"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Onchain reputation
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Project reputation</h3>
            <p className="text-gray-700 dark:text-gray-300">
              How projects build credibility over time by documenting work, completing milestones,
              and creating verifiable records.
            </p>
            <p>
              <Link
                href="/knowledge/project-reputation"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Project reputation
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Milestones vs impact</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Why execution milestones and real-world impact must be treated as separate but related
              concepts.
            </p>
            <p>
              <Link
                href="/knowledge/milestones-vs-impact"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Milestones vs impact
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Impact verification</h3>
            <p className="text-gray-700 dark:text-gray-300">
              How impact can be measured and verified without relying solely on centralized auditors
              or one-off reports.
            </p>
            <p>
              <Link
                href="/knowledge/impact-verification"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Impact verification
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Manual vs platform-based tracking</h3>
            <p className="text-gray-700 dark:text-gray-300">
              A comparison of spreadsheets, documents, and dedicated funding platforms — and when
              each breaks down.
            </p>
            <p>
              <Link
                href="/knowledge/manual-vs-platform-grant-tracking"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Manual vs platform tracking
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Reputation compounding</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Why reputation acts as cumulative memory in open funding systems, and how it improves
              decision-making over time.
            </p>
            <p>
              <Link
                href="/knowledge/reputation-compounding"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Reputation compounding
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">The grant lifecycle</h3>
            <p className="text-gray-700 dark:text-gray-300">
              A complete view of the grant process, from proposal to verified impact and long-term
              learning.
            </p>
            <p>
              <Link
                href="/knowledge/grant-lifecycle"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Grant lifecycle
              </Link>
            </p>
          </div>
        </section>

        <hr className="border-gray-200 dark:border-gray-700" />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How to read this</h2>
          <p className="text-gray-700 dark:text-gray-300">
            This knowledge base is <strong>non-linear</strong>.
          </p>
          <p className="text-gray-700 dark:text-gray-300">You can:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>
              Start with the{" "}
              <Link
                href="/knowledge/grant-lifecycle"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                grant lifecycle
              </Link>{" "}
              for a full overview
            </li>
            <li>
              Start with{" "}
              <Link
                href="/knowledge/grant-accountability"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                grant accountability
              </Link>{" "}
              if you operate funding programs
            </li>
            <li>
              Start with{" "}
              <Link
                href="/knowledge/onchain-reputation"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                onchain reputation
              </Link>{" "}
              if you build or fund projects
            </li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            Each article links to related concepts so ideas compound rather than repeat.
          </p>
        </section>

        <hr className="border-gray-200 dark:border-gray-700" />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why this exists</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Most funding systems optimize for <em>decisions</em>. Very few optimize for{" "}
            <em>learning</em>.
          </p>
          <p className="text-gray-700 dark:text-gray-300">Without persistent execution history:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Good projects look the same as bad ones</li>
            <li>Evaluators cannot build credibility</li>
            <li>Ecosystems repeat the same mistakes</li>
            <li>Capital allocation does not improve</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            This knowledge base documents how to fix that.
          </p>
        </section>

        <hr className="border-gray-200 dark:border-gray-700" />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How this connects to Karma</h2>
          <p className="text-gray-700 dark:text-gray-300">
            <a
              href="https://www.karmahq.xyz"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Karma
            </a>{" "}
            is a modular funding platform and reputation system used by ecosystems and projects to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Fund work</li>
            <li>Track progress</li>
            <li>Hold teams accountable</li>
            <li>Measure impact</li>
            <li>Build durable reputation</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            The concepts documented here are the primitives Karma is built around.
          </p>
        </section>

        <hr className="border-gray-200 dark:border-gray-700" />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Intended audience</h2>
          <p className="text-gray-700 dark:text-gray-300">This material is written for:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Grant operators and ecosystem teams</li>
            <li>DAO contributors and evaluators</li>
            <li>Project builders seeking funding</li>
            <li>Researchers studying capital allocation</li>
            <li>Anyone designing open funding systems</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            No prior knowledge of Karma is required.
          </p>
        </section>

        <hr className="border-gray-200 dark:border-gray-700" />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Design principles of this knowledge base</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Explanatory, not promotional</li>
            <li>Persistent, not campaign-driven</li>
            <li>Modular, not opinionated tooling</li>
            <li>Focused on systems, not slogans</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            If a concept cannot be explained clearly, it cannot scale.
          </p>
        </section>

        <hr className="border-gray-200 dark:border-gray-700" />

        <section className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Capabilities used in modern funding systems</h2>
            <p className="text-gray-700 dark:text-gray-300">
              In practice, funding programs rely on a set of operational capabilities that sit
              beneath high-level concepts like accountability and reputation.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              The articles below explain how these capabilities work and why they matter.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">AI-assisted grant evaluation</h3>
            <p className="text-gray-700 dark:text-gray-300">
              How funding programs scale application review without sacrificing rigor.
            </p>
            <p>
              <Link
                href="/knowledge/ai-grant-evaluation"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → AI-assisted grant evaluation
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Project registries</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Why communities maintain public records of funded projects and their progress.
            </p>
            <p>
              <Link
                href="/knowledge/project-registry"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Project registries
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">KYC and compliance</h3>
            <p className="text-gray-700 dark:text-gray-300">
              How identity verification is coordinated without slowing down funding.
            </p>
            <p>
              <Link
                href="/knowledge/grant-kyc"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → KYC and compliance
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Document signing</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Why grant agreements must be tracked as part of the funding workflow.
            </p>
            <p>
              <Link
                href="/knowledge/grant-document-signing"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Document signing
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Fund disbursement coordination</h3>
            <p className="text-gray-700 dark:text-gray-300">
              How payments are safely triggered once requirements are met.
            </p>
            <p>
              <Link
                href="/knowledge/grant-fund-disbursement"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Fund disbursement coordination
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Impact measurement</h3>
            <p className="text-gray-700 dark:text-gray-300">
              How funded work is connected to verifiable outputs and outcomes.
            </p>
            <p>
              <Link
                href="/knowledge/impact-measurement"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Impact measurement
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Whitelabel funding platforms</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Why ecosystems run funding programs under their own brand using shared infrastructure.
            </p>
            <p>
              <Link
                href="/knowledge/whitelabel-funding-platforms"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Whitelabel funding platforms
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Funding distribution mechanisms</h3>
            <p className="text-gray-700 dark:text-gray-300">
              How different funding goals require different payment structures.
            </p>
            <p>
              <Link
                href="/knowledge/funding-distribution-mechanisms"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                → Funding distribution mechanisms
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">How to use this section</h3>
            <p className="text-gray-700 dark:text-gray-300">
              These capabilities appear repeatedly throughout the grant lifecycle and are most
              effective when treated as integrated infrastructure, not standalone features.
            </p>
          </div>
        </section>

        <hr className="border-gray-200 dark:border-gray-700" />

        <footer className="pt-4">
          <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 dark:border-gray-600 dark:text-gray-400">
            Funding systems improve when execution is visible.
          </blockquote>
        </footer>
      </article>
    </main>
  );
}
