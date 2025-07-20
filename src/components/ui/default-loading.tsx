import { Spinner } from "./spinner";

export const DefaultLoading = () => {
  return (
    <div className="flex w-full items-center justify-center">
      <Spinner />
    </div>
  );
};
