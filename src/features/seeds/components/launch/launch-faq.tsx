import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FAQAccordion, type FAQItem } from "@/src/components/shared/faq-accordion";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

const launchFAQs: FAQItem[] = [
  {
    id: "what-are-seeds-projects",
    question: "What exactly are Karma Seeds?",
    answer:
      "Karma Seeds are ERC-20 tokens that represent $1 contributions to your project. For every dollar a supporter contributes, they receive one Seed. The funds go directly to your treasury address. Seeds are designed as receipts of support—not speculative tokens with price expectations.",
  },
  {
    id: "how-do-seeds-show-in-wallet",
    question: "How do these seeds show up in buyer's wallet?",
    answer:
      "Karma Seeds are regular ERC-20 tokens. The name will be Karma Seeds - <Project Name> and code will be KSEED-<code>. You choose the name and code while creating Karma Seeds for your project.",
  },

  {
    id: "fees",
    question: "What are the fees?",
    answer:
      "There's a small platform fee that goes to Karma. The rest goes directly to your treasury address. No hidden costs, no ongoing fees.",
  },
  {
    id: "treasury",
    question: "How do I receive the funds?",
    answer:
      "When you launch Seeds, you specify a treasury wallet address. All contributions go directly to that address—you have full control. You can use any wallet address you control, including a multisig or DAO treasury.",
  },
  {
    id: "obligations",
    question: "Do I have any obligations to Seed holders?",
    answer:
      "Seeds come with no built-in obligations. They're receipts of support, not governance tokens or equity. However, many projects choose to reward their Seed holders with early access, rev share, or token allocations later. What you do is entirely up to you.",
  },
  {
    id: "token-later",
    question: "What if I want to launch a real token later?",
    answer:
      "Seeds are designed to be compatible with future token launches. You can use your Seed holder list to reward early supporters—whether that's through early access, rev share, or token allocations. Seeds keep your options open without forcing a decision.",
  },
  {
    id: "price-change",
    question: "Can I change the price per Seed?",
    answer:
      "Seeds are fixed at $1 by design. This simplicity is intentional—it removes the speculation and price discovery that comes with variable pricing. One dollar, one Seed, always.",
  },
  {
    id: "multiple-projects",
    question: "Can I launch Seeds for multiple projects?",
    answer:
      "Each project on Karma can have its own Seeds. If you have multiple projects, each gets its own token with its own treasury. Supporters can choose which specific project they want to back.",
  },
  {
    id: "remove-seeds",
    question: "Can I stop accepting Seeds?",
    answer:
      "Yes, you can pause or disable Seeds for your project at any time through your dashboard. Existing Seeds remain valid—they're tokens in your supporters' wallets. But new purchases can be stopped.",
  },
];

export function LaunchFAQ() {
  return (
    <section
      className={cn(marketingLayoutTheme.padding, "py-16 md:py-24 w-full relative overflow-hidden")}
    >
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-seeds-300/10 to-transparent dark:via-seeds-300/5" />

      <SectionContainer className="relative z-10">
        {/* Section Header */}
        <div className="flex flex-col items-center gap-5 mb-16 text-center">
          <Badge
            variant="secondary"
            className="bg-gradient-to-r from-seeds-300/10 to-seeds-300/5 dark:from-seeds-300/20 dark:to-seeds-300/10 text-seeds-400 dark:text-seeds-300 border border-seeds-300/30 px-4 py-1.5 text-sm font-medium"
          >
            FAQs for Projects
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Frequently asked questions
          </h2>
          <p className="text-lg md:text-xl font-normal text-muted-foreground leading-relaxed">
            Common questions about launching Seeds for your project.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <FAQAccordion items={launchFAQs} />
        </div>

        {/* Contact Section */}
        <div className="mt-16 text-center">
          <div className="relative inline-flex flex-col sm:flex-row items-center gap-6 p-8 rounded-3xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/40 dark:from-white/5 dark:to-white/[0.02] border border-seeds-300/30 dark:border-seeds-300/20 rounded-3xl" />

            <div className="relative text-center sm:text-left">
              <h3 className="font-bold text-xl text-foreground mb-1">Still have questions?</h3>
              <p className="text-muted-foreground">
                Reach out to us and we'll help you get started.
              </p>
            </div>
            <div className="relative">
              <Button
                asChild
                className="bg-gradient-to-r from-seeds-300 to-seeds-400 hover:from-seeds-200 hover:to-seeds-300 text-seeds-600 rounded-xl font-medium px-6 py-5 seeds-glow group"
              >
                <Link href={SOCIALS.TELEGRAM} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
                  Ask in Telegram
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
