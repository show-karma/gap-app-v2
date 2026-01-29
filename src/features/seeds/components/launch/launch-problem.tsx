import { Ban, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

const whatProjectsWant = [
  { text: "Raise a bit of money" },
  { text: "Build a small but aligned community" },
  { text: "Stay focused on building" },
];

const whatProjectsDontWant = [
  { text: "Launch a token on day one" },
  { text: "Price speculation and charts" },
  { text: "Volatility and emotional whiplash" },
  { text: "Managing markets before product-market fit" },
];

const currentOptions = [
  {
    title: "Donations",
    problem: "Feel one-way and invisible",
  },
  {
    title: "Tokens",
    problem: "Feel premature and risky",
  },
  {
    title: "Grants",
    problem: "Are slow and gated",
  },
];

export function LaunchProblem() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 md:py-24 w-full")}>
      <SectionContainer>
        {/* Section Header */}
        <div className="flex flex-col items-center gap-5 mb-16 text-center">
          <Badge
            variant="secondary"
            className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-700/50 px-4 py-1.5 text-sm font-medium"
          >
            The Problem
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight max-w-3xl">
            You want to raise funds, not launch a token
          </h2>
          <p className="text-lg md:text-xl font-normal text-muted-foreground leading-relaxed max-w-3xl">
            There are thousands of projects—especially early-stage non-VC scale projects and open
            source projects—that don't need too much funding. What they really need is users,
            product feedback, and evangelists, without the stress of token price fluctuation.
          </p>
        </div>

        {/* Two Columns: What you want vs What you don't want */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* What you want */}
          <div className="group relative p-8 rounded-3xl overflow-hidden seeds-card-hover">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/80 via-green-50/60 to-emerald-100/40 dark:from-emerald-950/50 dark:via-green-950/30 dark:to-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-3xl" />

            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-200/50 to-transparent dark:from-emerald-800/30 rounded-tr-3xl rounded-bl-[60px]" />

            <div className="relative">
              <h3 className="text-2xl font-bold text-foreground mb-6">What you want</h3>
              <ul className="space-y-4">
                {whatProjectsWant.map((item) => (
                  <li key={item.text} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg text-foreground font-medium">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* What you don't want */}
          <div className="group relative p-8 rounded-3xl overflow-hidden seeds-card-hover">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-100/80 via-rose-50/60 to-red-100/40 dark:from-red-950/50 dark:via-rose-950/30 dark:to-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-3xl" />

            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-200/50 to-transparent dark:from-red-800/30 rounded-tr-3xl rounded-bl-[60px]" />

            <div className="relative">
              <h3 className="text-2xl font-bold text-foreground mb-6">What you don't want</h3>
              <ul className="space-y-4">
                {whatProjectsDontWant.map((item) => (
                  <li key={item.text} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                      <Ban className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg text-foreground font-medium">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Current Options */}
        <div className="text-center mb-12">
          <p className="text-xl text-muted-foreground mb-8">Today, your options are awkward:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {currentOptions.map((option, index) => (
              <div
                key={option.title}
                className="relative p-6 rounded-2xl bg-gradient-to-br from-white/60 to-white/30 dark:from-white/5 dark:to-white/[0.02] border border-gray-200/50 dark:border-gray-800/30 backdrop-blur-sm"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="font-bold text-xl text-foreground mb-2">{option.title}</div>
                <div className="text-muted-foreground">{option.problem}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Conclusion */}
        <div className="text-center">
          <div className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-green-50/60 to-emerald-50/80 dark:from-emerald-950/40 dark:via-green-950/20 dark:to-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/30">
            <p className="text-xl md:text-2xl text-foreground font-semibold seeds-gradient-text">
              We think there's room for something simpler.
            </p>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
