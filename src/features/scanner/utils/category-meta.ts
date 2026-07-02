import { Activity, Bot, FileText, Heart, type LucideIcon, Shield } from "lucide-react";

// Per-category presentation vocabulary for the redesigned scorecard:
// the "verb" in the Reach -> Understand -> Trust -> Transact spine, the
// category icon, and the plain-language question the category answers.
// Keyed by the backend category id (`trust_verification` is the BE id; the
// design mockups call it "trust").
interface CategoryMeta {
  readonly verb: string;
  readonly icon: LucideIcon;
  readonly question: string;
}

const META: Record<string, CategoryMeta> = {
  agent_access: {
    verb: "Reach",
    icon: Bot,
    question: "Can a machine reach the content at all?",
  },
  machine_readability: {
    verb: "Understand",
    icon: FileText,
    question: "Can it extract clean, structured facts?",
  },
  trust_verification: {
    verb: "Trust",
    icon: Shield,
    question: "Can a donor advisor confirm legitimacy?",
  },
  donation_readiness: {
    verb: "Transact",
    icon: Heart,
    question: "Can an agent actually give, including via DAF?",
  },
  liveness: {
    verb: "Active",
    icon: Activity,
    question: "Is the org demonstrably active?",
  },
};

const FALLBACK: CategoryMeta = { verb: "", icon: Activity, question: "" };

export function categoryMeta(categoryId: string): CategoryMeta {
  if (META[categoryId]) return META[categoryId];
  if (categoryId === "trust") return META.trust_verification;
  return FALLBACK;
}

// The four donor-agent verbs, in order — used by the entry page's "what it
// measures" spine and the generating checklist.
export const VERB_SPINE = ["Reach", "Understand", "Trust", "Transact"] as const;
