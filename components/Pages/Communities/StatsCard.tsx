interface StatsCardProps {
  title: string;
  value: string | number;
  shouldRound?: boolean;
}

const formatNumber = (value: string | number, shouldRound: boolean = false): string | number => {
  // If it's already a string, return as-is
  if (typeof value === 'string') {
    return value;
  }
  
  // If rounding is disabled, return the original number
  if (!shouldRound) {
    return value;
  }
  
  // Handle edge cases: zero or numbers less than 10
  if (value === 0 || value < 10) {
    return value;
  }
  
  // Round down to nearest hundred and add "+"
  const roundedDown = Math.floor(value / 100) * 100;
  return `${roundedDown}+`;
};

export const StatsCard = ({ title, value, shouldRound = false }: StatsCardProps) => {
  return (
    <div className="flex flex-col items-center h-[112px] justify-center p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-sm shadow-sm">
      <div className="text-4xl font-semibold text-black dark:text-white">
        {formatNumber(value, shouldRound)}
      </div>
      <div className="text-lg font-semibold text-black dark:text-white text-center">
        {title}
      </div>
    </div>
  );
}; 