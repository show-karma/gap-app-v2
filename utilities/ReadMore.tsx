import React, { useEffect, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";

interface Props {
  words?: any;
  children: string;
  readMoreText?: string;
  readLessText?: string;
}

export const ReadMore = ({
  words,
  children,
  readMoreText = "Read more",
  readLessText = "Read less",
}: Props) => {
  const [isReadMore, setIsReadMore] = useState(true);
  const toggleReadMore = () => {
    setIsReadMore(!isReadMore);
  };

  const text = children ? children : "";
  const minimumText = words ? words : 240;

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
            source={
              text.slice(0, minimumText) +
              (text.length >= minimumText ? "..." : "")
            }
          />
        ) : (
          <MarkdownPreview source={text} />
        )}
      </div>
      {text.length - 1 > minimumText && (
        <div onClick={toggleReadMore} className="read-or-hide mt-2">
          {isReadMore ? (
            <>
              <div className="flex space-x-2 font-semibold dark:text-zinc-400 dark:hover:text-zinc-200 ease-in duration-200">
                <ChevronDownIcon className="w-4 h-auto" />
                <span className="cursor-pointer">{readMoreText}</span>
              </div>
            </>
          ) : (
            <div className="flex space-x-2 font-semibold dark:text-zinc-400 dark:hover:text-zinc-200 ease-in duration-200 cursor-pointer">
              <ChevronUpIcon className="w-4 h-auto" />
              <span>{readLessText}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
