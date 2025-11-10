"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/UI/accordion";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { MinusCircle, PlusCircle } from "lucide-react";

interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

interface FAQAccordionProps {
    items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
    return (
        <Accordion
            type="single"
            defaultValue="free-trial"
            collapsible
            className="w-full"
        >
            {items.map((item) => (
                <AccordionItem
                    key={item.id}
                    value={item.id}
                    className="border-b border-border last:border-b-0"
                >
                    <AccordionTrigger className="group hover:no-underline py-4 [&>svg]:hidden">
                        <span className="text-lg font-semibold text-foreground leading-[28px] tracking-normal pr-4 text-left flex-1">
                            {item.question}
                        </span>
                        <div className="flex-shrink-0 relative w-6 h-6 ml-2">
                            <PlusCircle className="w-6 h-6 text-muted-foreground absolute inset-0 group-data-[state=open]:hidden" />
                            <MinusCircle className="w-6 h-6 text-muted-foreground absolute inset-0 hidden group-data-[state=open]:block" />
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-0">
                        <MarkdownPreview source={item.answer} className="text-base font-normal text-muted-foreground leading-6 tracking-normal" />
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}

