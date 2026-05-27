import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/src/components/navigation/Link";
import { NON_PROFITS_PAGES } from "@/utilities/pages";

const OPTIONS = [
  {
    provider: "Claude",
    href: NON_PROFITS_PAGES.CONNECT_CLAUDE,
    plans: "Free, Pro, Max, Team, Enterprise",
    summary:
      "Custom connectors via remote MCP. Works in claude.ai and the Claude desktop app. About 60 seconds end-to-end.",
  },
  {
    provider: "ChatGPT",
    href: NON_PROFITS_PAGES.CONNECT_CHATGPT,
    plans: "Plus, Pro, Business, Enterprise, Edu",
    summary:
      "MCP connectors via Developer mode. Read-only on Plus/Pro, read/write on Business/Enterprise/Edu.",
  },
];

export function ConnectIndex() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Link
        href={NON_PROFITS_PAGES.HOME}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Find Funders
      </Link>

      <article className="mt-6 space-y-8">
        <header className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Setup
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            Add Karma Find Funders to your AI tool
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Pick the tool you use. Each guide is a one-minute walkthrough with the exact menus, the
            real MCP URL, and troubleshooting if you get stuck.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {OPTIONS.map((option) => (
            <Link
              key={option.provider}
              href={option.href}
              className="group flex h-full flex-col gap-3 rounded-xl border border-gray-200 p-6 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-900/40"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                {option.provider}
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300">{option.summary}</p>
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {option.plans}
              </p>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 group-hover:underline dark:text-blue-400">
                Open the {option.provider} guide
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </article>
    </main>
  );
}
