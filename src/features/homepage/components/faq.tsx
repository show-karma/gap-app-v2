import { cn } from "@/utilities/tailwind";
import { homepageTheme } from "@/src/helper/theme";
import { FAQAccordion } from "./faq-accordion";
import { MessageCircleMore } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SOCIALS } from "@/utilities/socials";
import { ExternalLink } from "@/components/Utilities/ExternalLink";

const faqItems = [
    {
        id: "what-is-karma",
        question: "What is Karma and how can it help my project?",
        answer: "Karma is a modular funding and impact platform that helps you **showcase your work, attract funding, and build your onchain reputation**. You can share progress, complete milestones, and receive endorsements that boost your credibility across ecosystems.",
    },
    {
        id: "program-requirement",
        question: "Do I need to be part of a specific program or community to use Karma?",
        answer: "No, you can create your project profile anytime. Think of your project profile as a resume. If your project is part of a grant program, hackathon, or ecosystem that partners with Karma, it will appear automatically. If not, you can easily add your grant by following the steps in our [guide](https://docs.gap.karmahq.xyz/how-to-guides/for-builders/add-grant-to-project).",
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
        answer: "Karma lets you post **updates, complete milestones, and attach evidence** (documents, links, metrics, attestations). These are reviewed or automatically verified depending on your program setup. Verified milestones strengthen your project’s credibility and onchain impact record.",
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
        answer: "Your project’s profile and verified impact remain **permanently available onchain**. This means your history travels with you, helping you qualify faster for future funding, collaborations, or opportunities across other ecosystems using Karma.",
    },
    {
        id: "gas-fees",
        question: "Do I need to pay gas fees to update my project or post progress?",
        answer: `**Yes, for now.** Since all project data is stored on-chain, you’ll need to pay a small gas fee when updating your project or posting progress.
<br />
<br />
We’re actively working on **gasless transactions**, so soon you’ll be able to update your project **without paying gas or holding crypto** in your wallet.`,
    },
];

export function FAQ() {
    return (
        <section className={cn(homepageTheme.padding, "py-16 w-full")}>
            <div className="flex flex-col items-center gap-8 md:gap-16 mb-12 max-w-4xl mx-auto">
                <h2 className="text-[36px] font-semibold text-foreground text-center leading-[44px] tracking-tight">
                    Frequently asked questions
                </h2>
                <p className="text-xl font-normal text-muted-foreground text-center leading-[30px] tracking-normal">
                    Everything you need to know about the product and billing.
                </p>
            </div>

            <div className="max-w-4xl mx-auto mb-12">
                <FAQAccordion items={faqItems} />
            </div>

            <div className="max-w-4xl mx-auto">
                <div className="bg-secondary rounded-2xl p-8 flex flex-col items-center gap-8 min-h-[286px]">
                    <div className="flex items-end gap-0">
                        <div className="relative w-12 h-12 rounded-full border-[1.5px] border-background bg-emerald-300 -mr-4 z-0 overflow-hidden">
                            <Image
                                src="/images/homepage/user4.png"
                                alt="User avatar"
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="relative w-14 h-14 rounded-full border-[1.5px] border-background bg-purple-300 z-10 overflow-hidden">
                            <Image
                                src="/images/homepage/user5.png"
                                alt="User avatar"
                                width={56}
                                height={56}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="relative w-12 h-12 rounded-full border-[1.5px] border-background bg-gray-300 -ml-4 z-0 overflow-hidden">
                            <Image
                                src="/images/homepage/user6.png"
                                alt="User avatar"
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <h3 className="text-xl font-medium text-foreground text-center leading-[30px] tracking-normal">
                            Still have questions?
                        </h3>
                        <p className="text-lg font-normal text-muted-foreground text-center leading-7 tracking-normal">
                            Can't find the answer you're looking for? Please chat to our friendly team.
                        </p>
                    </div>

                    <div className="flex items-center md:flex-row flex-col gap-4">
                        <ExternalLink href={SOCIALS.TELEGRAM}>
                            <Button
                                variant="default"
                                className="px-6 py-2.5 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 border-0 shadow"
                            >
                                <MessageCircleMore className="w-4 h-4" />
                                Ask in Telegram
                            </Button>
                        </ExternalLink>
                        <ExternalLink href={SOCIALS.DISCORD}>
                            <Button
                                variant="default"
                                className="px-6 py-2.5 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 border-0 shadow"
                            >
                                <MessageCircleMore className="w-4 h-4" />
                                Ask in Discord
                            </Button>
                        </ExternalLink>
                    </div>
                </div>
            </div>
        </section>
    );
}

