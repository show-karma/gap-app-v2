import { cn } from "@/utilities/tailwind";
import { homepageTheme } from "@/src/helper/theme";
import { FAQAccordion } from "./faq-accordion";


const faqItems = [
    {
        id: "free-trial",
        question: "Is there a free trial available?",
        answer: "Yes, you can try us for free for 30 days. If you want, we'll provide you with a free, personalized 30-minute onboarding call to get you up and running as soon as possible.",
    },
    {
        id: "change-plan",
        question: "Can I change my plan later?",
        answer: "Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.",
    },
    {
        id: "cancellation",
        question: "What is your cancellation policy?",
        answer: "You can cancel your subscription at any time. Your access will continue until the end of your current billing period.",
    },
    {
        id: "invoice-info",
        question: "Can other info be added to an invoice?",
        answer: "Yes, you can add custom fields, notes, and additional information to your invoices through the invoice settings.",
    },
    {
        id: "billing",
        question: "How does billing work?",
        answer: "Billing is processed automatically on a monthly or annual basis, depending on your selected plan. You'll receive an email notification before each charge.",
    },
    {
        id: "change-email",
        question: "How do I change my account email?",
        answer: "You can update your email address in your account settings. You'll need to verify the new email address before the change takes effect.",
    },
];

export function FAQSection() {
    return (
        <section className={cn(homepageTheme.padding, "py-16 w-full")}>
            <div className="flex flex-col items-center gap-4 md:gap-6 max-w-4xl mx-auto px-4">
                <h2 className="text-2xl md:text-[36px] font-semibold text-foreground text-center leading-[32px] md:leading-[44px] tracking-tight">
                    Frequently asked questions
                </h2>
                <p className="text-base md:text-xl font-normal text-muted-foreground text-center leading-[24px] md:leading-[30px] tracking-normal">
                    Everything you need to know about the product and billing.
                </p>
            </div>

            <div className="max-w-4xl mx-auto mb-8 md:mb-12 px-4">
                <FAQAccordion items={faqItems} />
            </div>

        </section>
    );
}

