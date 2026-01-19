import Link from "next/link";

export default function ProjectUpdatesAndReputationPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">How Projects Build Reputation Through Public Updates</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Reputation is built through consistent public updates, not perfect outcomes.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Projects build reputation by showing up regularly, documenting progress, explaining
            setbacks, and sharing evidence over time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why updates matter more than outcomes</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Outcomes are often delayed</li>
            <li>Updates show intent and execution</li>
            <li>Transparency builds trust</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            A missed milestone explained publicly often builds more trust than silent success.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What good updates include</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>What was done</li>
            <li>What changed</li>
            <li>What was learned</li>
            <li>What comes next</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How profiles enable this</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Project profiles provide a permanent home for updates so reputation compounds instead of
            resetting.
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
            provides the infrastructure where project updates become lasting reputation signals.
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
