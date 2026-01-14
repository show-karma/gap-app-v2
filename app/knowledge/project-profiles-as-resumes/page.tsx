import Link from "next/link";

export default function ProjectProfilesAsResumesPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">Project Profiles as a Global Resume for Funded Work</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            A project profile is a resume for funded work.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Project profiles play the same role for projects that resumes play for individuals: they
            show experience, outcomes, and reliability over time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Useful comparison</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>LinkedIn → who you are</li>
            <li>GitHub → what you code</li>
            <li>Grant reports → what you claimed</li>
            <li>
              <strong>Project profiles → what your project has actually delivered</strong>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why this matters</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Funders rarely have context across grants and programs.
          </p>
          <p className="text-gray-700 dark:text-gray-300">A project profile becomes:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>A single source of truth</li>
            <li>A credibility anchor</li>
            <li>A reusable asset</li>
          </ul>
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
            provides project profiles as the global resume for funded work — a single place to show
            what your project has delivered.
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
