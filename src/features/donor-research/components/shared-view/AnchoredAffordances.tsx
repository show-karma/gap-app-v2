"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { resolveAnchor } from "@/src/features/donor-research/components/anchor/resolve";
import {
  COMMENT_SECTION_KEYS,
  type CommentAnchor,
  type CommentSectionKey,
} from "@/src/features/donor-research/components/anchor/types";
import type { SharedReportCommentNode } from "@/types/donor-research-comments";

import { AddCommentAffordance } from "./AddCommentAffordance";
import { CommentHighlight } from "./CommentHighlight";
import { CommentPin } from "./CommentPin";

interface AnchoredAffordancesProps {
  /** The currently rendered report tree (used to harvest highlight anchors). */
  tree: SharedReportCommentNode[];
  /** counts.byKey from useCommenting. */
  countsByKey: Map<string, number>;
  /** Refresh key passed to CommentHighlight for re-resolve on payload changes. */
  highlightRefreshKey: number;
  /** Click handler for pins — opens the sheet and scrolls the matching root into view. */
  onPinActivate: (targetKey: string) => void;
  /** Open the root composer with the supplied anchor. */
  onOpenRootComposer: (anchor: CommentAnchor) => void;
}

interface AnchorTarget {
  /** `${kind}:${id}` */
  key: string;
  /** Section key or candidate id. */
  id: string;
  /** Container element to portal pins/affordances into. */
  element: Element;
  /** "section" | "candidate" */
  kind: "section" | "candidate";
  /** Human-readable label for aria. */
  label: string;
}

const SECTION_LABELS: Record<CommentSectionKey, string> = {
  masthead: "masthead",
  "lead-candidate": "lead candidate",
  "runners-up": "runners up",
  comparison: "comparison",
  "also-considered": "also considered",
  methodology: "methodology",
};

function discoverTargets(): AnchorTarget[] {
  if (typeof document === "undefined") return [];
  const root = document.querySelector("[data-brief]");
  if (!root) return [];
  const out: AnchorTarget[] = [];

  for (const sectionKey of COMMENT_SECTION_KEYS) {
    const el = root.querySelector(`[data-section="${sectionKey}"]`);
    if (!el) continue;
    out.push({
      key: `section:${sectionKey}`,
      id: sectionKey,
      element: el,
      kind: "section",
      label: SECTION_LABELS[sectionKey],
    });
  }

  const candidateEls = root.querySelectorAll("[data-candidate-id]");
  for (const el of Array.from(candidateEls)) {
    const id = el.getAttribute("data-candidate-id");
    if (!id) continue;
    out.push({
      key: `candidate:${id}`,
      id,
      element: el,
      kind: "candidate",
      label: "this candidate",
    });
  }

  return out;
}

/**
 * Discovers anchored targets in the live DOM and portals pin + "+"
 * affordances into each of them. Also renders highlight overlays for
 * every text-range anchor in the comment tree.
 *
 * Targets are re-discovered on `highlightRefreshKey` changes (a new
 * report payload may have added or removed candidate cards). The
 * containers themselves must carry `position: relative` for the
 * absolutely-positioned pins to land at the top-right; existing
 * section / candidate components already render block-level wrappers,
 * and adding `relative` to each anchored root is a one-line edit upstream
 * — handled below by adding the class via the portal parent.
 */
export function AnchoredAffordances({
  tree,
  countsByKey,
  highlightRefreshKey,
  onPinActivate,
  onOpenRootComposer,
}: AnchoredAffordancesProps) {
  const [targets, setTargets] = useState<AnchorTarget[]>([]);
  const [root, setRoot] = useState<Element | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-discover on poll.
  useEffect(() => {
    setTargets(discoverTargets());
    setRoot(document.querySelector("[data-brief]") ?? null);
  }, [highlightRefreshKey]);

  // Ensure each anchored container is positioning context for the
  // absolutely-positioned pins. Adding the class directly is the
  // lightest-touch alternative to editing each ReportBrief subcomponent.
  useEffect(() => {
    const added: Element[] = [];
    for (const t of targets) {
      const el = t.element as HTMLElement;
      const style = window.getComputedStyle(el);
      if (style.position === "static") {
        el.style.position = "relative";
        added.push(el);
      }
    }
    return () => {
      for (const el of added) {
        (el as HTMLElement).style.position = "";
      }
    };
  }, [targets]);

  const highlightAnchors: { node: SharedReportCommentNode; anchor: CommentAnchor }[] = [];
  const walk = (nodes: SharedReportCommentNode[]) => {
    for (const node of nodes) {
      if (node.anchor && node.anchor.kind === "text_range") {
        highlightAnchors.push({ node, anchor: node.anchor });
      }
      walk(node.children);
    }
  };
  walk(tree);

  return (
    <>
      {targets.map((t) => {
        const count = countsByKey.get(t.key) ?? 0;
        return createPortal(
          <>
            {count > 0 && (
              <CommentPin
                count={count}
                targetKey={t.key}
                onActivate={onPinActivate}
                ariaLabel={t.label}
              />
            )}
            <AddCommentAffordance
              ariaLabel={`Add comment on ${t.label}`}
              onClick={() =>
                onOpenRootComposer(
                  t.kind === "section"
                    ? { kind: "section", sectionKey: t.id as CommentSectionKey }
                    : { kind: "candidate", candidateId: t.id }
                )
              }
            />
          </>,
          t.element,
          `affordance-${t.key}`
        );
      })}

      {highlightAnchors.map(({ node, anchor }) =>
        root ? (
          <CommentHighlight
            key={node.id}
            anchor={anchor}
            root={root}
            refreshKey={highlightRefreshKey}
            onActivate={() => {
              const key =
                anchor.kind === "text_range" ? `${anchor.targetKind}:${anchor.targetId}` : null;
              if (key) onPinActivate(key);
            }}
          />
        ) : null
      )}
    </>
  );
}
