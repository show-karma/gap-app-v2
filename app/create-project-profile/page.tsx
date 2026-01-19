export default function CreateProjectProfilePage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <article className="space-y-8">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold">Create Your Project Profile</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            A public record of your work — free, shareable, and persistent.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What this is</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Your project profile is a public page where you document:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Funding you've received</li>
            <li>Milestones you've committed to</li>
            <li>Updates on your progress</li>
            <li>Evidence of what you've delivered</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">It works for:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Grantees</li>
            <li>Nonprofits</li>
            <li>Web3 projects</li>
            <li>Philanthropic initiatives</li>
            <li>Early-stage funded work</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why projects create profiles</h2>
          <p className="text-gray-700 dark:text-gray-300">Projects create profiles to:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Show funders what's actually happening</li>
            <li>Build credibility over time</li>
            <li>Avoid repeating the same reporting work</li>
            <li>Make progress visible to communities</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What you can add</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Project description</li>
            <li>Funding history (grants, retro funding, etc.)</li>
            <li>Milestones and status</li>
            <li>Public updates</li>
            <li>GitHub repositories (for software projects)</li>
            <li>Onchain contract addresses</li>
            <li>Impact metrics (for non-software projects)</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Onchain, without complexity</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Your profile is stored as onchain attestations:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>History is visible forever</li>
            <li>Updates can be added, not erased</li>
            <li>No blockchain knowledge required</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            You don't need a wallet to get started.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Who sees this</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Funders</li>
            <li>Grant programs</li>
            <li>Communities</li>
            <li>Anyone you share the link with</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">Your profile is public by default.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Cost</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Creating a project profile is <strong>free</strong>.
          </p>
        </section>

        <section className="pt-4">
          <a
            href="https://www.karmahq.xyz"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white hover:bg-blue-700"
          >
            Create your project profile
          </a>
        </section>
      </article>
    </main>
  );
}
