"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const WIDTH = 304;
const GUTTER = 12;

interface Props {
  rect: DOMRect;
  label: string;
  onSubmit: (body: string) => void;
  onCancel: () => void;
}

/**
 * Sits beside the block it belongs to. The rect is viewport-relative — shadow
 * DOM elements report viewport coordinates like any other — so the popover is
 * fixed-positioned and clamped rather than laid out in the document flow.
 */
export function CommentPopover({ rect, label, onSubmit, onCancel }: Props) {
  const [body, setBody] = useState("");
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fieldRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const spaceRight = window.innerWidth - rect.right;
  const left =
    spaceRight > WIDTH + GUTTER * 2
      ? rect.right + GUTTER
      : Math.max(GUTTER, rect.left - WIDTH - GUTTER);
  const top = Math.min(Math.max(GUTTER, rect.top), window.innerHeight - 232 - GUTTER);

  const submit = () => {
    const text = body.trim();
    if (text.length > 0) onSubmit(text);
  };

  return (
    <div
      className="kp-pop-in fixed z-50 rounded-xl p-3 shadow-2xl"
      style={{
        left,
        top,
        width: WIDTH,
        background: "var(--kp-raised)",
        border: "1px solid var(--kp-line-strong)",
      }}
    >
      <p
        className="mb-2 truncate font-mono text-[11px]"
        style={{ color: "var(--kp-ink-faint)" }}
        title={label}
      >
        {label}
      </p>

      <Textarea
        ref={fieldRef}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        rows={3}
        placeholder="What should change here?"
        className="w-full resize-none rounded-lg px-2.5 py-2 text-sm outline-none focus-visible:ring-2"
        style={{
          background: "var(--kp-ground)",
          border: "1px solid var(--kp-line)",
          color: "var(--kp-ink)",
        }}
      />

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px]" style={{ color: "var(--kp-ink-faint)" }}>
          ⏎ to pin
        </span>
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-xs"
            style={{ color: "var(--kp-ink-soft)" }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={body.trim().length === 0}
            className="text-xs"
            style={{ background: "var(--kp-accent)", color: "var(--kp-accent-ink)" }}
          >
            Pin comment
          </Button>
        </div>
      </div>
    </div>
  );
}
