"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HtmlReportFrame } from "@/components/Pages/Community/PortfolioReports/HtmlReportFrame";
import { type BlockRef, readBlocks, resolveAnchor } from "./anchor";
import { CommentCard } from "./CommentCard";
import { CommentPopover } from "./CommentPopover";
import type { Comment } from "./types";

const STYLE_ID = "kp-canvas-style";

/**
 * Injected into the shadow root, where Tailwind cannot reach. Colours come
 * from custom properties the studio shell defines — those cross the shadow
 * boundary, so the marking layer stays on the tenant's brand without a
 * hardcoded value.
 */
const CANVAS_STYLE = `
  [data-pl-id] { position: relative; border-radius: 6px; transition: outline-color 140ms ease, background-color 140ms ease; }
  [data-pl-armed] { cursor: crosshair; }
  [data-pl-armed]:hover {
    outline: 2px dashed var(--kp-accent-strong);
    outline-offset: 6px;
    background-color: color-mix(in srgb, var(--kp-accent-strong) 8%, transparent);
  }
  [data-pl-marks]:not([data-pl-marks="0"]) {
    outline: 1.5px solid color-mix(in srgb, var(--kp-accent-strong) 55%, transparent);
    outline-offset: 6px;
  }
  [data-pl-selected] {
    outline: 2px solid var(--kp-accent-strong);
    outline-offset: 6px;
    background-color: color-mix(in srgb, var(--kp-accent-strong) 10%, transparent);
  }
  .kp-badge {
    position: absolute;
    top: -10px;
    left: -10px;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--kp-accent-strong);
    color: var(--kp-sheet);
    font: 600 11px/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
    box-shadow: var(--kp-badge-shadow);
  }
`;

interface Props {
  html: string;
  armed: boolean;
  comments: Comment[];
  selectedCommentId: string | null;
  pending: { id: string; label: string } | null;
  onMarkBlock: (block: { id: string; label: string }) => void;
  onSelectComment: (commentId: string) => void;
  onBlocksChange: (blocks: BlockRef[]) => void;
  onAddComment: (body: string) => void;
  onCancelPending: () => void;
  onEditComment: (commentId: string, body: string) => void;
  onDropComment: (commentId: string) => void;
}

export function PageCanvas({
  html,
  armed,
  comments,
  selectedCommentId,
  pending,
  onMarkBlock,
  onSelectComment,
  onBlocksChange,
  onAddComment,
  onCancelPending,
  onEditComment,
  onDropComment,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const altRef = useRef(false);
  const [pendingRect, setPendingRect] = useState<DOMRect | null>(null);
  const [hovered, setHovered] = useState<{ id: string; label: string; rect: DOMRect } | null>(null);
  const leaveTimer = useRef<number | null>(null);

  const shadow = useCallback(
    () => wrapRef.current?.querySelector("section")?.shadowRoot ?? null,
    []
  );

  const paintArmed = useCallback(() => {
    const root = shadow();
    if (!root) return;
    const on = armed || altRef.current;
    for (const block of root.querySelectorAll("[data-pl-id]")) {
      if (on) block.setAttribute("data-pl-armed", "");
      else block.removeAttribute("data-pl-armed");
    }
  }, [armed, shadow]);

  useEffect(() => {
    paintArmed();
  }, [paintArmed, html]);

  // Alt is a shortcut, not the only way in: Windows hands Alt to the menu bar,
  // so keyup can go missing and the mode would stick.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      altRef.current = event.altKey;
      paintArmed();
    };
    const release = () => {
      altRef.current = false;
      paintArmed();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", release);
    };
  }, [paintArmed]);

  useEffect(() => {
    const root = shadow();
    if (!root) return;

    ensureStyle(root);
    const blocks = readBlocks(root);
    onBlocksChange(blocks);
    decorate(root, blocks, comments, selectedCommentId);
    paintArmed();
  }, [html, comments, selectedCommentId, shadow, onBlocksChange, paintArmed]);

  // The popover rides along with its block: the canvas scrolls under it and
  // the window can resize while the composer is open.
  useEffect(() => {
    if (!pending) {
      setPendingRect(null);
      return;
    }

    const measure = () => {
      const root = shadow();
      const el = root?.querySelector<HTMLElement>(`[data-pl-id="${CSS.escape(pending.id)}"]`);
      setPendingRect(el ? el.getBoundingClientRect() : null);
    };

    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [pending, shadow]);

  useEffect(() => {
    const root = shadow();
    if (!root) return;

    const cancelLeave = () => {
      if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    };

    const onOver = (event: Event) => {
      const target = (event as MouseEvent)
        .composedPath()
        .find(
          (node): node is HTMLElement =>
            node instanceof HTMLElement &&
            node.hasAttribute("data-pl-id") &&
            (node.getAttribute("data-pl-marks") ?? "0") !== "0"
        );
      if (!target) return;

      cancelLeave();
      const block = readBlocks(root).find((candidate) => candidate.el === target);
      if (block)
        setHovered({ id: block.id, label: block.label, rect: target.getBoundingClientRect() });
    };

    const onOut = () => {
      cancelLeave();
      leaveTimer.current = window.setTimeout(() => setHovered(null), 180);
    };

    root.addEventListener("mouseover", onOver);
    root.addEventListener("mouseout", onOut);
    return () => {
      root.removeEventListener("mouseover", onOver);
      root.removeEventListener("mouseout", onOut);
      cancelLeave();
    };
  }, [html, comments, shadow]);

  useEffect(() => {
    const root = shadow();
    if (!root) return;

    const onClick = (event: Event) => {
      const mouse = event as MouseEvent;
      // composedPath crosses the shadow boundary; closest() from the target
      // would stop at the shadow root.
      const hit = mouse
        .composedPath()
        .find(
          (node): node is HTMLElement =>
            node instanceof HTMLElement && node.hasAttribute("data-pl-id")
        );
      if (!hit) return;

      const block = readBlocks(root).find((candidate) => candidate.el === hit);
      if (!block) return;

      if (armed || mouse.altKey) {
        mouse.preventDefault();
        onMarkBlock({ id: block.id, label: block.label });
        return;
      }

      const existing = comments.find(
        (comment) => comment.status === "open" && comment.anchor.id === block.id
      );
      if (existing) onSelectComment(existing.id);
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [html, comments, armed, shadow, onMarkBlock, onSelectComment]);

  return (
    <>
      <div
        ref={wrapRef}
        key={html.length}
        className="kp-sheet-in mx-auto w-full max-w-[920px] overflow-hidden rounded-xl"
        style={{
          background: "var(--kp-sheet)",
          color: "var(--kp-sheet-ink)",
          boxShadow: "var(--kp-sheet-shadow)",
        }}
      >
        <HtmlReportFrame html={html} title="Panel preview" />
      </div>

      {hovered && !pending ? (
        <CommentCard
          rect={hovered.rect}
          label={hovered.label}
          comments={comments.filter(
            (comment) => comment.status === "open" && comment.anchor.id === hovered.id
          )}
          onEdit={onEditComment}
          onDrop={onDropComment}
          onPointerEnter={() => {
            if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
            leaveTimer.current = null;
          }}
          onPointerLeave={() => setHovered(null)}
        />
      ) : null}

      {pending && pendingRect ? (
        <CommentPopover
          rect={pendingRect}
          label={pending.label}
          onSubmit={onAddComment}
          onCancel={onCancelPending}
        />
      ) : null}
    </>
  );
}

function ensureStyle(root: ShadowRoot): void {
  if (root.querySelector(`#${STYLE_ID}`)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CANVAS_STYLE;
  root.appendChild(style);
}

/** The open comments pinned to each block, in the order they were written. */
function groupByBlock(blocks: BlockRef[], comments: Comment[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const comment of comments) {
    if (comment.status !== "open") continue;
    const match = resolveAnchor(blocks, comment.anchor);
    if (match.kind === "orphan") continue;
    const bodies = grouped.get(match.block.id) ?? [];
    bodies.push(comment.body);
    grouped.set(match.block.id, bodies);
  }
  return grouped;
}

function selectedBlockId(
  blocks: BlockRef[],
  comments: Comment[],
  selectedCommentId: string | null
): string | null {
  const selected = comments.find((comment) => comment.id === selectedCommentId);
  if (!selected) return null;
  const match = resolveAnchor(blocks, selected.anchor);
  return match.kind === "orphan" ? null : match.block.id;
}

function decorate(
  root: ShadowRoot,
  blocks: BlockRef[],
  comments: Comment[],
  selectedCommentId: string | null
): void {
  const grouped = groupByBlock(blocks, comments);
  const selected = selectedBlockId(blocks, comments, selectedCommentId);

  for (const badge of Array.from(root.querySelectorAll(".kp-badge"))) {
    badge.remove();
  }

  for (const block of blocks) {
    const bodies = grouped.get(block.id) ?? [];
    block.el.setAttribute("data-pl-marks", String(bodies.length));

    if (block.id === selected) block.el.setAttribute("data-pl-selected", "");
    else block.el.removeAttribute("data-pl-selected");

    if (bodies.length === 0) continue;

    const badge = document.createElement("div");
    badge.className = "kp-badge";
    badge.textContent = String(bodies.length);
    block.el.appendChild(badge);
  }
}
