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
    <section className={cn(marketingLayoutTheme.padding, "py-16 w-full bg-muted/30")}>
      <SectionContainer>
        {/* Section Header */}
        <div className="flex flex-col items-center gap-4 mb-12 text-center">
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
          >
            FAQs for Projects
          </Badge>
          <h2 className="section-title text-foreground">Frequently asked questions</h2>
          <p className="text-xl font-normal text-muted-foreground leading-[30px] tracking-normal">
            Common questions about launching Seeds for your project.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <FAQAccordion items={launchFAQs} />
        </div>

        {/* Contact Section */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-lg bg-card border border-border">
            <div className="text-center sm:text-left">
              <h3 className="font-semibold text-foreground">Still have questions?</h3>
              <p className="text-sm text-muted-foreground">
                Reach out to us and we'll help you get started.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                className="border-green-600 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-950/50"
              >
                <Link href={SOCIALS.TELEGRAM} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" />
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
