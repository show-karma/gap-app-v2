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
}

export const ReadMore = ({
  words,
  children,
  readMoreText = "Read more",
  readLessText = "Read less",
  side = "right",
  markdownClass,
  markdownComponents,
}: Props) => {
  const [isReadMore, setIsReadMore] = useState(true);
  const toggleReadMore = () => {
    setIsReadMore(!isReadMore);
  };

  const text = children ? children : "";
  const minimumText = words ? words : 400;

  useEffect(() => {
    if (text.length - 1 < minimumText) {
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
            components={markdownComponents}
            source={
              text.slice(0, minimumText) +
              (text.length >= minimumText ? "..." : "")
            }
          />
        ) : (
          <MarkdownPreview
            className={markdownClass}
            components={markdownComponents}
            source={text}
          />
        )}
      </div>
      {text.length - 1 > minimumText && (
        <div onClick={toggleReadMore} className="read-or-hide mt-2">
          {isReadMore ? (
            <>
              <div
                className="text-sm font-semibold leading-tight text-blue-600 dark:text-blue-300 w-full flex"
                style={{
                  justifyContent: side === "left" ? "flex-start" : "flex-end",
                }}
              >
                <span className="cursor-pointer">{readMoreText}</span>
              </div>
            </>
          ) : (
            <div
              className="text-sm font-semibold leading-tight text-blue-600 dark:text-blue-300 w-full flex"
              style={{
                justifyContent: side === "left" ? "flex-start" : "flex-end",
              }}
            >
              <span className="cursor-pointer">{readLessText}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
