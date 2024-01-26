import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

interface Props {
  words?: any;
  children: string;
}

export const ReadMore = (props: Props) => {
  const [isReadMore, setIsReadMore] = useState(true);
  const toggleReadMore = () => {
    setIsReadMore(!isReadMore);
  };

  const text = props.children ? props.children : "";
  const minimumText = props.words ? props.words : 240;

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
          <ReactMarkdown>{text.slice(0, minimumText) + "..."}</ReactMarkdown>
        ) : (
          <ReactMarkdown>{text}</ReactMarkdown>
        )}
      </div>
      {text.length - 1 > minimumText && (
        <div onClick={toggleReadMore} className="read-or-hide mt-2">
          {isReadMore ? (
            <>
              <div className="flex space-x-2 font-semibold dark:text-zinc-400 dark:hover:text-zinc-200 ease-in duration-200">
                <ChevronDownIcon className="w-4 h-auto" />
                <span className="cursor-pointer">Read More</span>
              </div>
            </>
          ) : (
            <div className="flex space-x-2 font-semibold dark:text-zinc-400 dark:hover:text-zinc-200 ease-in duration-200 cursor-pointer">
              <ChevronUpIcon className="w-4 h-auto" />
              <span>Show Less</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
