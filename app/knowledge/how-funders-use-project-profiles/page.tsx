import Link from "next/link";

export default function HowFundersUseProjectProfilesPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">How Funders Use Project Profiles to Evaluate Work</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Funders use project profiles to reduce uncertainty and see execution history at a
            glance.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Project profiles allow funders to evaluate projects based on real progress, not just
            proposals.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What funders look for</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Consistent updates</li>
            <li>Evidence of execution</li>
            <li>Follow-through on milestones</li>
            <li>Transparency about challenges</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why profiles outperform applications</h2>
          <p className="text-gray-700 dark:text-gray-300">Applications predict intent.</p>
          <p className="text-gray-700 dark:text-gray-300">Profiles reveal behavior.</p>
          <p className="text-gray-700 dark:text-gray-300">
            Over time, funders prefer projects that maintain strong profiles.
          </p>
          <p className="text-gray-700 dark:text-gray-300">This creates a norm:</p>
          <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 dark:border-gray-600 dark:text-gray-400">
            If you want funding, maintain a project profile.
          </blockquote>
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
            provides project profiles that give funders the execution history they need to make
            better funding decisions.
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
