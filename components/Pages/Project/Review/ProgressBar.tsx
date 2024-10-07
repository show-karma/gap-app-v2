/**
 * ProgressBar component displays a progress bar indicating the completion percentage.
 *
 */
export const ProgressBar = ({ actualPercentage }: { actualPercentage: number }) => {
  const totalPercentage = 100;

  return (
    <div className="w-40 flex items-center rounded-[100px] overflow-hidden">
      {Array(totalPercentage)
        .fill(0)
        .map((_, index) => {
          return (
            <div
              key={index}
              className={`h-1 w-full ${actualPercentage > index ? "bg-[#1832ED]" : "bg-[#26252A]"}`}
            />
          );
        })}
    </div>
  );
};
