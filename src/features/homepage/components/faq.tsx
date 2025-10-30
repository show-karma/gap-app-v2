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

export function FAQ() {
    return (
        <section className={cn(homepageTheme.padding, "py-16 w-full")}>
            <div className="flex flex-col items-center gap-6 mb-12 max-w-4xl mx-auto">
                <h2 className="text-[36px] font-semibold text-foreground text-center leading-[44px] tracking-[-0.02em]">
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

