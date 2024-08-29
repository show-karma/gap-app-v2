"use client";
import { useGrantStore } from "@/store/grant";
import { MESSAGES } from "@/utilities/messages";

export const GrantImpactCriteria = () => {
  const { grant } = useGrantStore();
  const questions = grant?.details?.data.questions;
  return (
    <div className="space-y-5 max-w-prose">
      {questions ? (
        <div className="flex flex-col gap-4">
          {questions.map((item) => (
            <div
              className="p-5 bg-white border border-gray-200 dark:bg-zinc-800 dark:border-zinc-600 rounded-xl text-base font-semibold  text-black dark:text-zinc-100"
              key={item.query + item.explanation}
            >
              <h3>{item.query}</h3>
              <p className="text-normal font-normal">{item.explanation}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-black dark:text-zinc-100">
          {MESSAGES.GRANT.IMPACT_CRITERIA.EMPTY}
        </p>
      )}
    </div>
  );
};