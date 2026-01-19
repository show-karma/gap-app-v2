import Link from "next/link";

export default function ProjectProfilesSoftwareVsNonsoftwarePage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">
          Project Profiles for Software vs Non-Software Projects
        </h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            The same project profile works for software and non-software projects — only the
            evidence differs.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Project profiles adapt to different project types by allowing different forms of proof
            while preserving a common structure.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Software projects</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>GitHub repositories</li>
            <li>Commit and release activity</li>
            <li>Smart contract addresses</li>
            <li>Onchain usage metrics</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Non-software projects</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Impact metrics</li>
            <li>Outputs and outcomes</li>
            <li>Qualitative evidence</li>
            <li>Community reports</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why this matters</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Nonprofits and philanthropic projects often lack a shared place to show progress.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            Project profiles create parity between technical and non-technical work.
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
            provides project profiles that work for both software and non-software projects,
            allowing any type of evidence to build credibility.
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
