"use client";

import { useEffect, useRef, useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ReadMoreModalProps {
  content: string;
  title?: string;
  previewClassName?: string;
  previewLines?: number;
  readMoreText?: string;
  readMoreClassName?: string;
}

export function ReadMoreModal({
  content,
  title = "Details",
  previewClassName = "",
  previewLines = 3,
  readMoreText = "Read more",
  readMoreClassName = "",
}: ReadMoreModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const clampedRef = useRef<HTMLDivElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  const clampClass = `line-clamp-${previewLines}`;

  useEffect(() => {
    const checkClamping = () => {
      const el = clampedRef.current;
      if (!el) return;

      const previewWrapper = el.querySelector(".preview") as HTMLElement;
      if (!previewWrapper) return;

      const original = previewWrapper.className;
      previewWrapper.className = original.replace(/line-clamp-\d+/g, "");
      const naturalHeight = previewWrapper.scrollHeight;
      previewWrapper.className = original;
      const clampedHeight = previewWrapper.clientHeight;

      setIsClamped(naturalHeight > clampedHeight);
    };

    const timers = [
      setTimeout(checkClamping, 100),
      setTimeout(checkClamping, 300),
      setTimeout(checkClamping, 500),
    ];

    const el = clampedRef.current;
    let observer: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(checkClamping);
      const pw = el.querySelector(".preview");
      if (pw) observer.observe(pw);
    }

    return () => {
      timers.forEach(clearTimeout);
      observer?.disconnect();
    };
  }, [content]);

  return (
    <>
      <div ref={clampedRef}>
        <MarkdownPreview source={content} className={`${clampClass} ${previewClassName}`} />
        {isClamped && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className={`text-sm font-medium text-primary hover:underline cursor-pointer mt-1 ${readMoreClassName}`}
          >
            {readMoreText}
          </button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="pb-2">
            <MarkdownPreview source={content} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
