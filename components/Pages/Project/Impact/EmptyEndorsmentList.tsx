import { FC } from "react";

export const EmptyEndorsmentList: FC = () => {
  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <p className="text-black dark:text-white">
        Be the first to endorse this project!
      </p>
    </div>
  );
};
