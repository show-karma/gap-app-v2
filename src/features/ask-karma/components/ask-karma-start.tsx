"use client";

import { SearchIcon } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/utilities/tailwind";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";
import type { AskKarmaConfig } from "../types";
import { FeaturedTopicCard } from "./featured-topic-card";
import { FlyingChip, type FlyingChipRect } from "./flying-chip";

// Hard cap on free-text input. Roughly matches a generous tweet length and
// well below the LLM's prompt window — protects against accidental paste of
// a huge document into the search bar.
const INPUT_MAX_LENGTH = 500;

interface AskKarmaStartProps {
  config: AskKarmaConfig;
  onSubmit: (question: string) => void;
}

// Animation timing — tuned for a snappy ~1s click-to-chat handoff while
// still reading as deliberate motion. Exported for tests so they can advance
// fake timers by exactly the right amount.
export const ASK_KARMA_ANIMATION = {
  FLY_DURATION_MS: 350,
  TYPE_SPEED_MS: 18,
  POST_TYPE_PAUSE_MS: 150,
} as const;

type ChipAnimationPhase = "idle" | "flying" | "typing";

// Stagger constants for the initial cascade — keep tight (~40-60ms per item)
// so the introduction reads as one motion.
const CHIP_STAGGER_MS = 40;
const TOPIC_STAGGER_MS = 60;
const SECTION_BASE_DELAY = {
  heading: 0,
  input: 80,
  examplesIntro: 160,
  chipsBase: 200,
  featuredHeading: 280,
  topicsBase: 340,
} as const;

function rectFromDOMRect(rect: DOMRect): FlyingChipRect {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

export function AskKarmaStart({ config, onSubmit }: AskKarmaStartProps) {
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<ChipAnimationPhase>("idle");
  const [flyText, setFlyText] = useState("");
  const [flyRects, setFlyRects] = useState<{ start: FlyingChipRect; end: FlyingChipRect } | null>(
    null
  );
  const [typedValue, setTypedValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Drive the auto-type effect. Owns its own setInterval and a follow-up
  // setTimeout for the post-type pause. Both are cleaned up on unmount or
  // phase change so a stale interval can't keep ticking after the user has
  // navigated away.
  useEffect(() => {
    if (phase !== "typing") return;
    let index = 0;
    setTypedValue("");
    const interval = setInterval(() => {
      index += 1;
      setTypedValue(flyText.slice(0, index));
      if (index >= flyText.length) {
        clearInterval(interval);
        submitTimerRef.current = setTimeout(() => {
          submitTimerRef.current = null;
          setPhase("idle");
          onSubmit(flyText);
        }, ASK_KARMA_ANIMATION.POST_TYPE_PAUSE_MS);
      }
    }, ASK_KARMA_ANIMATION.TYPE_SPEED_MS);
    return () => {
      clearInterval(interval);
      if (submitTimerRef.current) {
        clearTimeout(submitTimerRef.current);
        submitTimerRef.current = null;
      }
    };
  }, [phase, flyText, onSubmit]);

  // Focus the input as soon as the typing phase begins so the native caret
  // is visible while characters appear.
  useEffect(() => {
    if (phase === "typing") {
      inputRef.current?.focus();
    }
  }, [phase]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (phase !== "idle") return;
      const trimmed = value.trim();
      if (!trimmed) return;
      onSubmit(trimmed);
    },
    [onSubmit, phase, value]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (phase !== "idle") return;
        const trimmed = value.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
      }
    },
    [onSubmit, phase, value]
  );

  const handleChipClick = useCallback(
    (question: string, event: ReactMouseEvent<HTMLButtonElement>) => {
      if (phase !== "idle") return;
      // Vestibular-safety: skip the fly+type animation entirely for users who
      // have opted into reduced motion. The chip-fly is a 300ms+ viewport
      // translation which is exactly the kind of motion `prefers-reduced-
      // motion: reduce` is meant to suppress. Submit directly instead.
      if (prefersReducedMotion) {
        onSubmit(question);
        return;
      }
      const chipEl = event.currentTarget;
      const inputEl = inputRef.current;
      // Defensive fallback: if we can't measure either rect (e.g. JSDOM in
      // an old test environment), short-circuit the animation and submit
      // immediately rather than getting stuck in a half-state.
      if (!inputEl) {
        onSubmit(question);
        return;
      }
      setFlyText(question);
      setFlyRects({
        start: rectFromDOMRect(chipEl.getBoundingClientRect()),
        end: rectFromDOMRect(inputEl.getBoundingClientRect()),
      });
      setTypedValue("");
      setPhase("flying");
    },
    [onSubmit, phase, prefersReducedMotion]
  );

  const handleFlyArrive = useCallback(() => {
    setPhase("typing");
  }, []);

  // What renders in the input across phases:
  //   idle    → user-controlled value
  //   flying  → empty (the chip clone is still in flight)
  //   typing  → progressively populated from typedValue
  const displayValue = phase === "idle" ? value : phase === "flying" ? "" : typedValue;
  const inputDisabled = phase !== "idle";
  const submitDisabled = phase !== "idle" || displayValue.trim().length === 0;

  return (
    <div className="flex flex-col gap-10" data-animation-phase={phase}>
      <section
        className="animate-in fade-in slide-in-from-bottom-1 duration-500 flex flex-col gap-3"
        style={{ animationDelay: `${SECTION_BASE_DELAY.heading}ms`, animationFillMode: "both" }}
      >
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {config.heading}
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-300">{config.subheading}</p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="animate-in fade-in slide-in-from-bottom-1 duration-500 relative"
        style={{ animationDelay: `${SECTION_BASE_DELAY.input}ms`, animationFillMode: "both" }}
      >
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(event) => {
            if (phase === "idle") setValue(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          readOnly={inputDisabled}
          maxLength={INPUT_MAX_LENGTH}
          placeholder={config.inputPlaceholder}
          aria-label="Ask Karma Assistant a question"
          data-testid="ask-karma-search-input"
          className={cn(
            "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-12 text-sm",
            "text-zinc-900 placeholder:text-zinc-400",
            "shadow-sm transition-all duration-200",
            "hover:border-zinc-300 hover:shadow-md",
            "focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200/60",
            "focus:shadow-[0_0_0_4px_rgba(167,243,208,0.15)]",
            phase === "typing" && "border-emerald-400 ring-2 ring-emerald-200/60",
            "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50",
            "dark:placeholder:text-zinc-500 dark:hover:border-zinc-700",
            "dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
          )}
        />
        <button
          type="submit"
          aria-label="Ask the Karma Assistant"
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2",
            "flex h-8 w-8 items-center justify-center rounded-full",
            "transition-all duration-200 ease-out",
            "hover:scale-110 active:scale-90",
            "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100",
            !submitDisabled
              ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md dark:bg-emerald-500 dark:hover:bg-emerald-400"
              : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
          )}
          disabled={submitDisabled}
        >
          <SearchIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <p
          className="animate-in fade-in slide-in-from-bottom-1 duration-500 text-sm text-zinc-600 dark:text-zinc-300"
          style={{
            animationDelay: `${SECTION_BASE_DELAY.examplesIntro}ms`,
            animationFillMode: "both",
          }}
        >
          {config.examplesIntro}
        </p>
        <ul className="flex flex-wrap gap-2">
          {config.exampleQuestions.map((question, idx) => (
            <li
              key={question}
              className="animate-in fade-in zoom-in-95 slide-in-from-bottom-1 duration-300"
              style={{
                animationDelay: `${SECTION_BASE_DELAY.chipsBase + idx * CHIP_STAGGER_MS}ms`,
                animationFillMode: "both",
              }}
            >
              <button
                type="button"
                onClick={(event) => handleChipClick(question, event)}
                disabled={phase !== "idle"}
                className={cn(
                  "rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-sm",
                  "text-zinc-800 transition-all duration-200 ease-out",
                  "hover:-translate-y-0.5 hover:scale-[1.02]",
                  "hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900 hover:shadow-sm",
                  "active:translate-y-0 active:scale-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
                  "disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:bg-zinc-50 disabled:hover:border-zinc-200 disabled:hover:text-zinc-800 disabled:hover:shadow-none",
                  "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
                  "dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-100",
                  "dark:disabled:hover:bg-zinc-900 dark:disabled:hover:border-zinc-800 dark:disabled:hover:text-zinc-200"
                )}
              >
                {question}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2
          className="animate-in fade-in slide-in-from-bottom-1 duration-500 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          style={{
            animationDelay: `${SECTION_BASE_DELAY.featuredHeading}ms`,
            animationFillMode: "both",
          }}
        >
          {config.featuredTopicsHeading}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {config.featuredTopics.map((topic, idx) => (
            <div
              key={topic.title}
              className="animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{
                animationDelay: `${SECTION_BASE_DELAY.topicsBase + idx * TOPIC_STAGGER_MS}ms`,
                animationFillMode: "both",
              }}
            >
              <FeaturedTopicCard topic={topic} />
            </div>
          ))}
        </div>
      </section>

      {phase === "flying" && flyRects && (
        <FlyingChip
          text={flyText}
          startRect={flyRects.start}
          endRect={flyRects.end}
          durationMs={ASK_KARMA_ANIMATION.FLY_DURATION_MS}
          onArrive={handleFlyArrive}
        />
      )}
    </div>
  );
}
