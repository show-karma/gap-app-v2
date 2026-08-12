import type { LucideIcon } from "lucide-react";
import { categoryMeta } from "../utils/category-meta";
import { Reveal } from "./reveal";

// Positions mirror the design: medallions weave up and down along a dashed
// path across a 1000×400 track. `x` is a percentage, `top` is px on the track.
const NODES = [
  { key: "agent_access", name: "Agent Access", x: 11, top: 150 },
  { key: "machine_readability", name: "Machine-Readability", x: 30, top: 52 },
  { key: "trust_verification", name: "Trust & Verification", x: 50, top: 168 },
  { key: "donation_readiness", name: "Donation-Readiness", x: 70, top: 44 },
  { key: "liveness", name: "Liveness", x: 89, top: 120 },
] as const;

// Smooth curve threading each medallion centre (viewBox 1000×400).
const PATH =
  "M110 188 C 185 188, 225 90, 300 90 S 420 206, 500 206 S 620 82, 700 82 S 815 158, 890 158";

function Medallion({ icon: Icon, step, size }: { icon: LucideIcon; step: number; size: number }) {
  return (
    <div
      className="relative mx-auto grid place-items-center rounded-full border border-border bg-card shadow-md transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 group-hover:shadow-lg"
      style={{ width: size, height: size }}
    >
      <span className="absolute -right-1.5 -top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-950 shadow">
        {step}
      </span>
      <Icon
        className="text-brand-emphasis"
        style={{ width: size * 0.33, height: size * 0.33 }}
        aria-hidden
      />
    </div>
  );
}

function NodeText({
  verb,
  name,
  question,
}: {
  readonly verb: string;
  readonly name: string;
  readonly question: string;
}) {
  return (
    <>
      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.07em] text-brand-emphasis">
        {verb}
      </div>
      <h3 className="mb-1.5 text-base font-semibold tracking-tight text-foreground">{name}</h3>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{question}</p>
    </>
  );
}

// "What it measures" — the five categories as a weaving journey of medallions
// on wide screens, collapsing to a stacked list on narrow ones.
export function ScannerJourney() {
  return (
    <div>
      {/* desktop: weaving path */}
      <div className="relative mx-auto hidden h-[400px] max-w-[1000px] lg:block">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1000 400"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden
        >
          <path
            d={PATH}
            className="stroke-brand-subtle"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="1 9"
            opacity="0.7"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {NODES.map((node, i) => {
          const { verb, icon, question } = categoryMeta(node.key);
          return (
            <div
              key={node.key}
              className="group absolute -ml-[88px] w-[176px] text-center"
              style={{ left: `${node.x}%`, top: node.top }}
            >
              <Reveal delay={i * 90}>
                <div className="mb-4">
                  <Medallion icon={icon} step={i + 1} size={78} />
                </div>
                <NodeText verb={verb} name={node.name} question={question} />
              </Reveal>
            </div>
          );
        })}
      </div>

      {/* mobile / tablet: stacked list */}
      <ol className="mx-auto flex max-w-[460px] flex-col gap-1 lg:hidden">
        {NODES.map((node, i) => {
          const { verb, icon, question } = categoryMeta(node.key);
          return (
            <Reveal
              as="li"
              key={node.key}
              delay={i * 70}
              className="group flex items-start gap-4 py-3"
            >
              <Medallion icon={icon} step={i + 1} size={60} />
              <div>
                <NodeText verb={verb} name={node.name} question={question} />
              </div>
            </Reveal>
          );
        })}
      </ol>
    </div>
  );
}
