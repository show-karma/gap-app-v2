import { USE_CASES } from "../content";

export function CapabilitiesSection() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-12">
      <header className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">What agents can do</h2>
        <p className="text-base text-muted-foreground">
          Three concrete examples — the kind of work a Karma-connected agent can do in minutes.
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {USE_CASES.map((useCase) => (
          <li
            key={useCase.title}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6"
          >
            <h3 className="text-lg font-semibold text-foreground">{useCase.title}</h3>
            <p className="text-sm text-muted-foreground">{useCase.description}</p>
            <blockquote className="mt-auto rounded-md bg-muted px-3 py-2 text-sm italic text-foreground">
              {useCase.example}
            </blockquote>
          </li>
        ))}
      </ul>
    </section>
  );
}
