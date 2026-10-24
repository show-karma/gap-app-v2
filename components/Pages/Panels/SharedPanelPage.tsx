"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { HtmlReportFrame } from "@/components/Pages/Community/PortfolioReports/HtmlReportFrame";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import { useSharedPanel } from "@/hooks/panels/usePanels";
import { formatDate } from "@/utilities/formatDate";

interface Props {
  token: string;
}

export function SharedPanelPage({ token }: Props) {
  const { data, isLoading, isError, refetch } = useSharedPanel(token);

  if (isLoading) {
    return (
      <output aria-label="Loading" className="flex min-h-screen items-center justify-center">
        <Spinner />
      </output>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden />
          <h1 className="font-semibold text-foreground text-xl">This panel is not available</h1>
          <p className="text-muted-foreground text-sm">
            The link may have been revoked or never existed.
          </p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="kp-studio min-h-screen" style={{ background: "var(--kp-ground)" }}>
      <header className="mx-auto flex w-full max-w-[920px] items-baseline justify-between gap-4 px-4 pt-6 sm:px-8">
        <h1 className="font-semibold text-sm tracking-tight" style={{ color: "var(--kp-ink)" }}>
          {data.title}
        </h1>
        {data.publishedAt ? (
          <span className="text-xs" style={{ color: "var(--kp-ink-faint)" }}>
            Published {formatDate(data.publishedAt)}
          </span>
        ) : null}
      </header>
      <main className="px-4 py-6 sm:px-8 sm:py-8">
        <div
          className="mx-auto w-full max-w-[920px] overflow-hidden rounded-xl"
          style={{
            background: "var(--kp-sheet)",
            color: "var(--kp-sheet-ink)",
            boxShadow: "var(--kp-sheet-shadow)",
          }}
        >
          <HtmlReportFrame html={data.html} title={data.title} />
        </div>
      </main>
    </div>
  );
}
