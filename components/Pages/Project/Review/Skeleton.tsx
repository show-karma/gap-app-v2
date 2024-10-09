interface SkeletonProps {
  className?: string;
  roundedClass?: string;
}
export const Skeleton = ({
  className = "w-16 h-2",
  roundedClass = "rounded-md",
}: SkeletonProps) => {
  return (
    <div className={`flex items-center self-center text-gray-200 animate-pulse ${className} `}>
      <div className={`bg-gray-100 w-full h-full ${roundedClass}`}></div>
    </div>
  );
};
