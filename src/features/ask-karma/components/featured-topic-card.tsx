import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/utilities/tailwind";
import type { AskKarmaTopic } from "../types";
import { TopicIcon } from "./topic-icon";

interface FeaturedTopicCardProps {
  topic: AskKarmaTopic;
}

export function FeaturedTopicCard({ topic }: FeaturedTopicCardProps) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border border-zinc-200 bg-white p-6",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:border-[rgb(var(--color-primary))]/30 hover:shadow-lg hover:shadow-[rgb(var(--color-primary))]/15",
        "dark:border-zinc-800 dark:bg-zinc-900",
        "dark:hover:border-[rgb(var(--color-primary-dark))]/30 dark:hover:shadow-[rgb(var(--color-primary-dark))]/20"
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px",
          "bg-gradient-to-r from-transparent via-[rgb(var(--color-primary))]/0 to-transparent",
          "transition-all duration-500 group-hover:via-[rgb(var(--color-primary))]/60"
        )}
      />

      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary-dark))]",
          "transition-all duration-300 ease-out",
          "group-hover:scale-110 group-hover:rotate-3",
          "dark:bg-[rgb(var(--color-primary-dark))]/30 dark:text-[rgb(var(--color-primary-light))]"
        )}
      >
        <TopicIcon name={topic.icon} className="h-5 w-5" />
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{topic.title}</h3>
        {topic.description && (
          <p className="text-sm text-[rgb(var(--color-primary-dark))] dark:text-[rgb(var(--color-primary-light))]">
            {topic.description}
          </p>
        )}
      </div>

      {topic.links && topic.links.length > 0 && (
        <ul className="flex flex-col gap-2">
          {topic.links.map((link) => (
            <li key={`${link.label}-${link.href}`}>
              <Link
                href={link.href}
                target={link.isExternal ? "_blank" : undefined}
                rel={link.isExternal ? "noopener noreferrer" : undefined}
                className={cn(
                  "inline-flex items-center text-sm font-medium text-[rgb(var(--color-primary-dark))]",
                  "underline-offset-4 transition-all duration-150",
                  "hover:underline hover:translate-x-0.5",
                  "dark:text-[rgb(var(--color-primary-light))]"
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {topic.cta && (
        <div className="mt-auto pt-1">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="transition-all duration-200 hover:scale-[1.02] active:scale-100"
          >
            <Link
              href={topic.cta.href}
              target={topic.cta.isExternal ? "_blank" : undefined}
              rel={topic.cta.isExternal ? "noopener noreferrer" : undefined}
            >
              {topic.cta.label}
            </Link>
          </Button>
        </div>
      )}
    </article>
  );
}
