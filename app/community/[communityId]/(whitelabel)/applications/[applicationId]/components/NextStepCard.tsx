"use client";

import {
  ArrowRight,
  CheckCircle2,
  type LucideIcon,
  MessageSquare,
  Pencil,
  Target,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/src/components/navigation/Link";
import type { ApplicationStatus } from "@/types/whitelabel-entities";

export type ApplicationViewerRole = "owner" | "reviewer" | "guest";

interface NextStepCardProps {
  status: ApplicationStatus;
  viewerRole: ApplicationViewerRole;
  hasMilestones: boolean;
  /** owner, approved, post-approval form configured but not yet submitted. */
  postApprovalPending: boolean;
  editHref: string;
  reviewHref: string;
  onGoToMilestones?: () => void;
  onGoToPostApproval?: () => void;
  onViewActivity?: () => void;
}

type Cta =
  | { kind: "link"; label: string; Icon: LucideIcon; href: string }
  | { kind: "action"; label: string; Icon: LucideIcon; onClick?: () => void };

interface NextStepDescriptor {
  title: string;
  copy: string;
  cta?: Cta;
}

function getDescriptor(props: NextStepCardProps): NextStepDescriptor | null {
  const {
    status,
    viewerRole,
    hasMilestones,
    postApprovalPending,
    editHref,
    reviewHref,
    onGoToMilestones,
    onGoToPostApproval,
    onViewActivity,
  } = props;

  if (viewerRole === "guest") return null;

  if (viewerRole === "reviewer") {
    return {
      title: "Review this application",
      copy: "Open the admin panel to approve, request changes, or leave feedback for the applicant.",
      cta: { kind: "link", label: "Go to admin panel", Icon: ArrowRight, href: reviewHref },
    };
  }

  switch (status) {
    case "pending":
      return {
        title: "Application submitted",
        copy: "Your application is in the queue. We'll notify you as soon as a reviewer picks it up.",
      };
    case "under_review":
      return {
        title: "Under review",
        copy: "A reviewer is evaluating your application. No action is needed from you right now.",
      };
    case "resubmitted":
      return {
        title: "Resubmitted",
        copy: "Your updated application is back in the queue and awaiting a re-review.",
      };
    case "revision_requested":
      return {
        title: "Changes requested",
        copy: "A reviewer asked for updates. Edit your application and resubmit — allowed even if the deadline has passed.",
        cta: { kind: "link", label: "Edit application", Icon: Pencil, href: editHref },
      };
    case "approved":
      if (hasMilestones) {
        return {
          title: "Approved — time to build",
          copy: "Your grant is approved. Track delivery and submit completion updates as you hit milestones.",
          cta: {
            kind: "action",
            label: "Go to milestones",
            Icon: Target,
            onClick: onGoToMilestones,
          },
        };
      }
      if (postApprovalPending) {
        return {
          title: "Approved — one more step",
          copy: "Complete the post-approval form to finish onboarding and unlock payouts.",
          cta: {
            kind: "action",
            label: "Complete post-approval form",
            Icon: CheckCircle2,
            onClick: onGoToPostApproval,
          },
        };
      }
      return {
        title: "Approved",
        copy: "Your grant is approved and ready to go. We'll keep you posted on what's next.",
      };
    case "rejected":
      return {
        title: "Not approved this round",
        copy: "This application wasn't approved. Review the reviewer's feedback in the activity timeline.",
        cta: {
          kind: "action",
          label: "View feedback",
          Icon: MessageSquare,
          onClick: onViewActivity,
        },
      };
    default:
      return null;
  }
}

export function NextStepCard(props: NextStepCardProps) {
  const descriptor = getDescriptor(props);
  if (!descriptor) return null;

  const { title, copy, cta } = descriptor;

  const ctaClassName =
    "flex w-full items-center justify-center gap-2 rounded-lg bg-[rgb(var(--color-primary))] px-4 py-2.5 text-sm font-semibold text-brand-950 shadow-sm transition-opacity hover:opacity-90";

  let ctaNode: ReactNode = null;
  if (cta?.kind === "link") {
    ctaNode = (
      <Link href={cta.href} className={ctaClassName}>
        <cta.Icon className="h-4 w-4" />
        {cta.label}
      </Link>
    );
  } else if (cta?.kind === "action") {
    ctaNode = (
      <button type="button" onClick={cta.onClick} className={ctaClassName}>
        <cta.Icon className="h-4 w-4" />
        {cta.label}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-[rgb(var(--color-primary))]/30 bg-[rgb(var(--color-primary))]/[0.06] p-5 shadow-sm">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--color-primary-dark))]">
        Next step
      </p>
      <p className="mb-1 text-sm font-semibold text-foreground">{title}</p>
      <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">{copy}</p>
      {ctaNode}
    </div>
  );
}
