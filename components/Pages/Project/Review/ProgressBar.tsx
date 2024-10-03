interface ProgressBarProps {
  currentStep: number;
  numberOfItems: number;
}

export const ProgressBar = ({ currentStep, numberOfItems = 100 }: ProgressBarProps) => {
  return (
    <div className="w-40 flex items-center rounded-[100px] overflow-hidden">
      {Array(numberOfItems)
        .fill(0)
        .map((_, index) => {
          return (
            <div
              key={index}
              className={`h-1 w-full ${
                currentStep > index ? "dark:bg-[#1832ED]" : "dark:bg-[#26252A]"
              }`}
            />
          );
        })}
    </div>
  );
};
