"use client";
import React, { useEffect, useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { MarkdownPreviewProps } from "@uiw/react-markdown-preview";

interface Props {
  words?: any;
  children: string;
  readMoreText?: string;
  readLessText?: string;
  side?: "left" | "right";
  markdownClass?: MarkdownPreviewProps["className"];
  markdownComponents?: MarkdownPreviewProps["components"];
  othersideButton?: React.ReactNode;
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

  const getMinimumText = () => {
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
  };

  useEffect(() => {
    if (text.length - 1 < getMinimumText()) {
      setIsReadMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="text">
      <div>
        {isReadMore ? (
          <MarkdownPreview
            className={markdownClass}
            source={
              text.slice(0, getMinimumText()) +
              (text.length >= getMinimumText() ? "..." : "")
            }
          />
        ) : (
          <MarkdownPreview className={markdownClass} source={text} />
        )}
      </div>
      {text.length - 1 > getMinimumText() ? (
        <div onClick={toggleReadMore} className="read-or-hide mt-2">
          {isReadMore ? (
            <>
              <div
                className="text-sm font-semibold leading-tight text-blue-600 dark:text-blue-300 w-full flex flex-row justify-between"
                style={{
                  flexDirection: side === "left" ? "row" : "row-reverse",
                }}
              >
                <span className="cursor-pointer">{readMoreText}</span>
                {othersideButton}
              </div>
            </>
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
        </div>
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
