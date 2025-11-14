import { cn } from "@/utilities/tailwind";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { FAQAccordion } from "@/src/components/shared/faq-accordion";


const faqItems = [
    {
        id: "what-is-karma",
        question: "What is Karma and how does it help funders?",
        answer: `Karma is a **modular funding and impact infrastructure** that helps you design, launch, and manage funding programs in days. You can intake applications, assign evaluators, track milestones, and measure impact, all on one platform.`,
    },
    {
        id: "migrate-data",
        question: "Can we migrate data from other platforms?",
        answer: `If you were using another funding platform in the past, we will help you import all the historical data into Karma’s funding platform.`,
    },
    {
        id: "try-out-platform",
        question: "Can I try out the platform before committing to it?",
        answer: `Absolutely. Just [reach out to us](https://tally.so/r/3NKZEl) and we can help you get started right away.`,
    },
    {
        id: "karma-as-accountability",
        question: "Can I run my program on another platform and use Karma just for accountability and impact measurement?",
        answer: `**Yes.** Karma is fully modular, allowing you to configure your program exactly the way you want. You can use Karma for **application intake**, manage **disbursements on another platform**, and then return to Karma for **milestone tracking, accountability, and impact measurement**.
<br />
<br />
You’re free to **mix and match modules** and expand as your program evolves.`,
    },
    {
        id: "accountability-and-transparency",
        question: "How does Karma ensure accountability and transparency?",
        answer: `All project data, milestones, and impact attestations are stored **onchain and publicly verifiable**. This creates a transparent record of outcomes, reducing dependency on manual reporting and increasing community trust.`,
    },
    {
        id: "integrate-existing-mechanisms",
        question: "Can I integrate my existing funding or evaluation mechanisms?",
        answer: `Absolutely. Karma supports **direct funding, retroactive funding, milestone-based disbursements**, and can integrate with **custom allocation mechanisms** built by your ecosystem. You can bring your own evaluators or use Karma’s **Evaluator Network** for external reviews.`,
    },
    {
        id: "generate-reports-and-measure-impact",
        question: "Can I generate reports and measure impact?",
        answer: `Yes. Karma automatically aggregates project data: updates, milestones, and outcomes into **real-time dashboards and downloadable reports** aligned with the **Common Impact Data Standard (CIDS)**. This makes it easy to share results with internal teams or funders.`,
    },
    {
        id: "integrate-existing-tools",
        question: "Can Karma integrate with our existing tools or platforms?",
        answer: `Yes. Karma offers **API and data integrations** that connect with your existing systems  such as CRM tools, analytics dashboards, or community portals. You can also export all data for external analysis or compliance reporting.`,
    },
    {
        id: "whitelabel-version",
        question: "Can we launch a whitelabel version of Karma for our ecosystem?",
        answer: `Yes. Many ecosystems and grant programs use a **custom-branded instance of Karma** with their own domain, theme, and workflows. This allows you to maintain your brand identity while leveraging Karma’s infrastructure for funding, evaluation, and reporting.`,
    }
];

export function FAQSection() {
    return (
        <section className={cn(marketingLayoutTheme.padding, "py-16 w-full")}>
            <div className="flex flex-col items-center gap-4 max-w-4xl mx-auto px-4">
                <h2 className="section-title text-foreground text-center">
                    Frequently asked questions
                </h2>
                <p className="text-base md:text-xl font-normal text-muted-foreground text-center leading-[24px] md:leading-[30px] tracking-normal">
                    Everything you need to know about the product and billing.
                </p>
            </div>

            <div className="max-w-4xl mx-auto mb-8 md:mb-12 px-4 mt-10">
                <FAQAccordion items={faqItems} />
            </div>

        </section>
    );
}

