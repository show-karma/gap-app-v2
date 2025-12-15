import { MessageCircleMore } from "lucide-react";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FAQAccordion } from "@/src/components/shared/faq-accordion";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

const faqItems = [
  {
    id: "what-is-karma",
    question: "What is Karma and how can it help my project?",
    answer:
      "Karma is a modular funding and impact platform that helps you **showcase your work, attract funding, and build your onchain reputation**. You can share progress, complete milestones, and receive endorsements that boost your credibility across ecosystems.",
  },
  {
    id: "program-requirement",
    question: "Do I need to be part of a specific program or community to use Karma?",
    answer:
      "No, you can create your project profile anytime. Think of your project profile as a resume. If your project is part of a grant program, hackathon, or ecosystem that partners with Karma, it will appear automatically. If not, you can easily add your grant by following the steps in our [guide](https://docs.gap.karmahq.xyz/how-to-guides/for-builders/add-grant-to-project).",
  },
  {
    id: "project-profile-info",
    question: "What kind of information should I include in my project profile?",
    answer: `Your profile is your public, onchain portfolio. Include:

- A clear description of your project and goals

- Milestones or deliverables you plan to achieve

- Updates on your progress (with links, screenshots, or metrics)

- Any impact results or endorsements you receive

The more complete your profile, the easier it is for funders and collaborators to discover and trust your work.`,
  },
  {
    id: "track-verify-progress",
    question: "How does Karma track and verify project progress?",
    answer:
      "Karma lets you post **updates, complete milestones, and attach evidence** (documents, links, metrics, attestations). These are reviewed or automatically verified depending on your program setup. Verified milestones strengthen your project’s credibility and onchain impact record.",
  },
  {
    id: "receive-funding",
    question: "Can I receive funding or donations directly through Karma?",
    answer: `**Yes.** You can log in and enable donations to accept **fiat or crypto** across multiple networks.
        <br />
        <br />
        Karma also functions as a **funding platform**. If your project is part of a program hosted on Karma, you can receive **direct payments** from that program or community.
        `,
  },
  {
    id: "data-reputation",
    question: "What happens to my data and reputation after my program ends?",
    answer:
      "Your project’s profile and verified impact remain **permanently available onchain**. This means your history travels with you, helping you qualify faster for future funding, collaborations, or opportunities across other ecosystems using Karma.",
  },
  {
    id: "metrics-display",
    question: "How do I make my metrics show up on my profile impact page?",
    answer:
      "Once you create your profile, you can link your github and onchain contracts. We will automatically fetch and display those metrics. You can also input your metrics manually.",
  },
  {
    id: "gas-fees",
    question: "Do I need to pay gas fees to update my project or post progress?",
    answer: `**Yes, for now.** Since all project data is stored onchain, you’ll need to pay a small gas fee when updating your project or posting progress.
<br />
<br />
We’re actively working on **gasless transactions**, so soon you’ll be able to update your project **without paying gas or holding crypto** in your wallet.`,
  },
];

export function FAQ() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 w-full")}>
      <SectionContainer>
        <div className="flex flex-col items-start gap-4 mb-10 max-w-4xl mx-auto">
          <Badge variant="secondary">FAQs</Badge>
          <h2 className="section-title text-foreground">Frequently asked questions</h2>
          <p className="text-xl font-normal text-muted-foreground leading-[30px] tracking-normal">
            Everything you need to know about the product.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-12">
          <FAQAccordion items={faqItems} />
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-secondary rounded-2xl px-8 py-10 flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <h3 className="text-xl font-medium text-foreground text-center leading-[30px] tracking-normal">
                Still have questions?
              </h3>
              <p className="font-normal text-muted-foreground text-center leading-7 tracking-normal">
                Can't find the answer you're looking for? Please reach out to our team.
              </p>
            </div>

            <div className="flex items-center md:flex-row flex-col gap-4">
              <ExternalLink href={SOCIALS.TELEGRAM}>
                <Button
                  variant="default"
                  className="px-4 py-2.5 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 border-0 shadow"
                >
                  <MessageCircleMore className="w-4 h-4" />
                  Ask in Telegram
                </Button>
              </ExternalLink>
              <ExternalLink href={SOCIALS.DISCORD}>
                <Button
                  variant="default"
                  className="px-4 py-2.5 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 border-0 shadow"
                >
                  <MessageCircleMore className="w-4 h-4" />
                  Ask in Discord
                </Button>
              </ExternalLink>
            </div>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
