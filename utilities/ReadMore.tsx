"use client";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MarkdownPreviewProps } from "@/components/Utilities/MarkdownPreview";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";

interface Props {
  words?: number;
  children: string;
  readMoreText?: string;
  readLessText?: string;
  side?: "left" | "right";
  markdownClass?: MarkdownPreviewProps["className"];
  markdownComponents?: MarkdownPreviewProps["components"];
  othersideButton?: React.ReactNode;
}

/**
 * Safely truncate markdown text without breaking syntax elements like links,
 * bold, italic, code blocks, etc. Finds safe cut positions that preserve
 * balanced markdown syntax.
 */
function safelyTruncateMarkdown(text: string, cutoffLength: number): string {
  if (text.length <= cutoffLength) return text;

  let cutPosition = cutoffLength;

  const linkMatches: { start: number; end: number }[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null = linkRegex.exec(text);

  while (match !== null) {
    linkMatches.push({
      start: match.index,
      end: match.index + match[0].length,
    });
    match = linkRegex.exec(text);
  }

  let insideLink = false;
  let linkStart = -1;

  for (const link of linkMatches) {
    if (cutPosition > link.start && cutPosition < link.end) {
      insideLink = true;
      linkStart = link.start;
      break;
    }
  }

  if (insideLink && linkStart >= 0) {
    const lastSpaceBeforeLink = text.lastIndexOf(" ", linkStart);
    if (lastSpaceBeforeLink >= 0) {
      cutPosition = lastSpaceBeforeLink;
    } else {
      cutPosition = linkStart;
    }
  }

  const specialChars = [
    { char: "[", closes: "]", importance: 10 },
    { char: "]", closes: "[", importance: 10 },
    { char: "(", closes: ")", importance: 9 },
    { char: ")", closes: "(", importance: 9 },
    { char: "*", importance: 8 },
    { char: "_", importance: 8 },
    { char: "`", importance: 7 },
    { char: "~", importance: 6 },
    { char: ">", importance: 5 },
    { char: "#", importance: 5 },
  ];

  const textBeforeCut = text.substring(0, cutPosition);
  const stack: { char: string; position: number }[] = [];

  for (let i = 0; i < textBeforeCut.length; i++) {
    if (textBeforeCut.substring(i, i + 3) === "```") {
      const item = { char: "```", position: i };
      const matchingIndex = stack.findIndex((s) => s.char === "```");
      if (matchingIndex !== -1) {
        stack.splice(matchingIndex, 1);
      } else {
        stack.push(item);
      }
      i += 2;
      continue;
    }

    if (textBeforeCut.substring(i, i + 2) === "**") {
      const item = { char: "**", position: i };
      const matchingIndex = stack.findIndex((s) => s.char === "**");
      if (matchingIndex !== -1) {
        stack.splice(matchingIndex, 1);
      } else {
        stack.push(item);
      }
      i += 1;
      continue;
    }

    if (textBeforeCut.substring(i, i + 2) === "__") {
      const item = { char: "__", position: i };
      const matchingIndex = stack.findIndex((s) => s.char === "__");
      if (matchingIndex !== -1) {
        stack.splice(matchingIndex, 1);
      } else {
        stack.push(item);
      }
      i += 1;
      continue;
    }

    if (i > 0 && textBeforeCut[i] === "(" && textBeforeCut[i - 1] === "]") {
      let urlEndPos = -1;
      let openParens = 1;

      for (let j = i + 1; j < textBeforeCut.length; j++) {
        if (textBeforeCut[j] === "(") {
          openParens++;
        } else if (textBeforeCut[j] === ")") {
          openParens--;
          if (openParens === 0) {
            urlEndPos = j;
            break;
          }
        }
      }

      if (urlEndPos > cutPosition || urlEndPos === -1) {
        let linkTextStart = -1;
        for (let j = i - 2; j >= 0; j--) {
          if (textBeforeCut[j] === "[") {
            linkTextStart = j;
            break;
          }
        }

        if (linkTextStart >= 0) {
          const lastSpaceBeforeLink = text.lastIndexOf(" ", linkTextStart);
          if (lastSpaceBeforeLink >= 0) {
            cutPosition = Math.min(cutPosition, lastSpaceBeforeLink);
          } else {
            cutPosition = Math.min(cutPosition, linkTextStart);
          }
          break;
        }
      }

      if (urlEndPos > 0) {
        i = urlEndPos;
        continue;
      }
    }

    for (const special of specialChars) {
      if (textBeforeCut[i] === special.char) {
        if (special.char === "(" && i > 0 && textBeforeCut[i - 1] === "]") {
          const item = { char: "](", position: i - 1 };
          stack.push(item);
        } else if (special.closes) {
          const matchingIndex = stack.findIndex((s) => s.char === special.closes);
          if (matchingIndex !== -1) {
            stack.splice(matchingIndex, 1);
          } else {
            stack.push({ char: special.char, position: i });
          }
        } else {
          if (special.char === "*" || special.char === "_") {
            if (i + 1 < textBeforeCut.length && textBeforeCut[i + 1] === special.char) {
              continue;
            }
            const item = { char: special.char, position: i };
            const matchingIndex = stack.findIndex((s) => s.char === special.char);
            if (matchingIndex !== -1) {
              stack.splice(matchingIndex, 1);
            } else {
              stack.push(item);
            }
          } else {
            stack.push({ char: special.char, position: i });
          }
        }
        break;
      }
    }
  }

  if (stack.length > 0) {
    stack.sort((a, b) => a.position - b.position);
    const earliestPosition = stack[0].position;
    const lastSpaceBeforeMarkdown = textBeforeCut.lastIndexOf(" ", earliestPosition);

    if (lastSpaceBeforeMarkdown !== -1) {
      cutPosition = Math.min(cutPosition, lastSpaceBeforeMarkdown);
    } else if (earliestPosition > 0) {
      cutPosition = Math.min(cutPosition, earliestPosition);
    }
  } else if (!insideLink) {
    const lastSpaceBeforeCut = text.lastIndexOf(" ", cutPosition);
    if (lastSpaceBeforeCut > 0 && cutPosition - lastSpaceBeforeCut < 20) {
      cutPosition = lastSpaceBeforeCut;
    }
  }

  return text.slice(0, cutPosition);
}

function preloadMarkdownImages(text: string) {
  const imageRegex = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
  for (const imgMatch of text.matchAll(imageRegex)) {
    const img = new window.Image();
    img.src = imgMatch[1];
  }
}

export const ReadMore = ({
  words,
  children,
  readMoreText = "Read more",
  readLessText = "Read less",
  side = "right",
  markdownClass,
  markdownComponents,
  othersideButton,
}: Props) => {
  const [isReadMore, setIsReadMore] = useState(true);
  const toggleReadMore = () => {
    setIsReadMore(!isReadMore);
  };

  const text = children ? children : "";
  const imagesPreloadedRef = useRef(false);

  const getMinimumText = useCallback(() => {
    let wordsCounter = 400;
    for (let i = words || 400; i < text.length; i++) {
      const regex = /\s/;
      if (!regex.test(text[i])) {
        wordsCounter++;
      } else {
        wordsCounter++;
        break;
      }
    }
    return wordsCounter;
  }, [words, text]);

  const handleReadMoreHover = useCallback(() => {
    if (imagesPreloadedRef.current) return;
    imagesPreloadedRef.current = true;
    preloadMarkdownImages(text);
  }, [text]);

  const minimumText = getMinimumText();

  const truncatedContent = useMemo(
    () => safelyTruncateMarkdown(text, minimumText),
    [text, minimumText]
  );

  useEffect(() => {
    if (text && text.length - 1 < minimumText) {
      setIsReadMore(false);
    } else {
      setIsReadMore(true);
    }
  }, [text, minimumText]);

  return (
    <div className="w-full max-w-full">
      {isReadMore ? (
        <MarkdownPreview
          className={markdownClass}
          source={truncatedContent + (text.length >= minimumText ? "..." : "")}
        />
      ) : (
        <MarkdownPreview className={markdownClass} source={text} />
      )}
      {text.length - 1 >= minimumText ? (
        <button
          type="button"
          onClick={toggleReadMore}
          onPointerEnter={handleReadMoreHover}
          aria-expanded={!isReadMore}
          className="read-or-hide mt-2 bg-transparent border-none p-0 cursor-pointer w-full text-left block"
        >
          {isReadMore ? (
            <div
              className="text-sm font-semibold leading-tight text-blue-600 dark:text-blue-300 w-full flex flex-row justify-between"
              style={{
                flexDirection: side === "left" ? "row" : "row-reverse",
              }}
            >
              <span className="cursor-pointer">{readMoreText}</span>
              {othersideButton}
            </div>
          ) : (
            <div
              className="text-sm font-semibold leading-tight text-blue-600 dark:text-blue-300 w-full flex flex-row justify-between"
              style={{
                flexDirection: side === "left" ? "row" : "row-reverse",
              }}
            >
              <span className="cursor-pointer">{readLessText}</span>
              {othersideButton}
            </div>
          )}
        </button>
      ) : othersideButton ? (
        <div
          className="text-sm font-semibold leading-tight text-blue-600 dark:text-blue-300 w-full flex flex-row justify-between"
          style={{
            flexDirection: side === "left" ? "row-reverse" : "row",
          }}
        >
          {othersideButton}
        </div>
      ) : null}
    </div>
  );
};
