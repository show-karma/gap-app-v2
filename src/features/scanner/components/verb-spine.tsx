import { ArrowRight } from "lucide-react";
import { Fragment } from "react";
import { VERB_SPINE } from "../utils/category-meta";

interface VerbSpineProps {
  // How many verbs are "reached" (highlighted). Defaults to all four.
  readonly activeUpto?: number;
  readonly className?: string;
}

// The donor-agent journey as a compact stepper: Reach -> Understand -> Trust
// -> Transact. Reused on the entry page's "what it measures" section.
export function VerbSpine({ activeUpto = VERB_SPINE.length, className = "" }: VerbSpineProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {VERB_SPINE.map((verb, i) => (
        <Fragment key={verb}>
          <span
            className={`text-sm font-semibold tracking-tight ${
              i < activeUpto ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {verb}
          </span>
          {i < VERB_SPINE.length - 1 ? (
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
